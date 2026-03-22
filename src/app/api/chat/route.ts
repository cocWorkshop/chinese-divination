export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logLlmCall } from '@/lib/llmLogger'
import { checkChatCredits, deductChatCredit, grantDailyBonus } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history, readingContext, readingType } = await req.json()
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }
    if (typeof message === 'string' && message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }
    if (Array.isArray(history) && history.length > 10) {
      return NextResponse.json({ error: 'Too many history entries (max 10)' }, { status: 400 })
    }

    // Grant daily bonus on first activity
    await grantDailyBonus(session.user.id)

    // Check chat credits
    const chatLimit = await checkChatCredits(session.user.id)
    if (!chatLimit.allowed) {
      return NextResponse.json({
        error: '問答額度已用完，請購買更多額度。\nChat credits exhausted. Please purchase more.',
        remaining: 0,
      }, { status: 429 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })
    }

    // Load minimal user info (no family members, no readings - context comes from frontend)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, birthDate: true, birthTime: true, birthPlace: true, gender: true, chatSummary: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse reading context from frontend (the current divination result)
    let readingData = ''
    if (readingContext) {
      try {
        const parsed = JSON.parse(readingContext)
        readingData = JSON.stringify(parsed, null, 0).substring(0, 3000)
      } catch {
        readingData = typeof readingContext === 'string' ? readingContext.substring(0, 3000) : ''
      }
    }

    const typeLabel: Record<string, string> = {
      bazi: '八字命理', ziwei: '紫微斗数', liuyao: '六爻', iching: '易经',
      qimen: '奇门遁甲', fengshui: '风水', meihua: '梅花易数', other: '命理',
    }
    const currentType = typeLabel[readingType] || '命理'

    const systemPrompt = `你是一位专业的${currentType}解盘师。你正在帮助用户深入分析他们刚刚获得的${currentType}预测结果。

事主信息：
- 姓名：${user.name || '未知'}
- 出生日期：${user.birthDate || '未填写'}
- 出生时辰：${user.birthTime || '未填写'}
- 出生地：${user.birthPlace || '未填写'}
- 性别：${user.gender || '未填写'}

当前${currentType}预测结果：
${readingData || '（无预测数据）'}

以往对话要点：
${user.chatSummary || '（暂无）'}

【核心职责】
你的唯一任务是围绕上述预测结果进行深入解读和分析。用户的每个问题都应该结合这份具体的预测结果来回答。

【分析原则】
- 必须引用预测结果中的具体数据（如具体的星曜、卦象、爻辞、柱位、五行等），不做泛泛而谈
- 将专业术语转化为用户能理解的实际影响和建议
- 以积极正向的视角引导，不利格局也要指出化解之道
- 每次回答聚焦用户的具体问题，给出有针对性的分析

【回答要求】
- 控制在 200 字以内，简洁有深度
- 语言自然流畅，像面对面解盘
- 不要重复已经在预测结果中说过的内容，要在此基础上深入或换角度分析
`

    // Read configurable timeout and chat model
    const [timeoutSetting, chatModelSetting, model1Setting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
      prisma.adminSetting.findUnique({ where: { key: 'chatModelName' } }),
      prisma.adminSetting.findUnique({ where: { key: 'model1Name' } }),
    ])
    const llmTimeoutMs = (parseInt(timeoutSetting?.value || '240', 10) || 240) * 1000
    const chatModel = chatModelSetting?.value || model1Setting?.value || 'anthropic/claude-3-5-haiku'

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      timeout: llmTimeoutMs,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:8094',
        'X-Title': 'Xuanji Chat',
      },
    })

    // Build conversation messages
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...((history || []) as { role: 'user' | 'assistant'; content: string }[]).slice(-10),
      { role: 'user', content: message },
    ]

    const chatStart = Date.now()
    const completion = await client.chat.completions.create({
      model: chatModel,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    const reply = completion.choices[0]?.message?.content || '抱歉，無法獲取回覆。'

    await logLlmCall({
      userId: session.user.id,
      endpoint: 'chat',
      model: chatModel,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
      latencyMs: Date.now() - chatStart,
      status: 'success',
      inputPreview: message,
      outputPreview: reply,
    })

    // Deduct chat credit
    await deductChatCredit(session.user.id)

    // Fetch updated credits to return to frontend
    const updatedCredits = await checkChatCredits(session.user.id)

    // Generate condensed summary in background (fire-and-forget)
    const conversationForSummary = [
      ...messages,
      { role: 'assistant' as const, content: reply },
    ].map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n')

    // Update chat summary asynchronously
    updateChatSummary(client, user.chatSummary, conversationForSummary, session.user.id, chatModel).catch(console.error)

    return NextResponse.json({
      reply,
      chatCredits: {
        remaining: updatedCredits.remaining,
      },
    })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Chat route error:', err?.message, err?.stack)
    return NextResponse.json({ error: 'An internal error occurred. Please try again later.' }, { status: 500 })
  }
}

async function updateChatSummary(
  client: OpenAI,
  existingSummary: string | null,
  conversation: string,
  userId: string,
  chatModel: string
) {
  try {
    const sumStart = Date.now()
    const summaryCompletion = await client.chat.completions.create({
      model: chatModel,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `将以下对话提炼为3-5个关键要点（每点不超过15字，用•分隔）：\n${conversation}`,
        },
      ],
    })
    const newPoints = summaryCompletion.choices[0]?.message?.content || ''

    await logLlmCall({
      userId,
      endpoint: 'chat-summary',
      model: chatModel,
      promptTokens: summaryCompletion.usage?.prompt_tokens,
      completionTokens: summaryCompletion.usage?.completion_tokens,
      totalTokens: summaryCompletion.usage?.total_tokens,
      latencyMs: Date.now() - sumStart,
      status: 'success',
      inputPreview: conversation.slice(0, 200),
      outputPreview: newPoints,
    })
    const combined = [existingSummary || '', newPoints].filter(Boolean).join('\n')
    // Keep last 500 chars
    const trimmed = combined.length > 500 ? combined.slice(combined.length - 500) : combined
    await prisma.user.update({ where: { id: userId }, data: { chatSummary: trimmed } })
  } catch {
    // Non-critical, ignore errors
  }
}
