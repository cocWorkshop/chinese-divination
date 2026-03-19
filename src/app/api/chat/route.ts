export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logLlmCall } from '@/lib/llmLogger'
import { checkChatLimit, incrementChatUsage } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history } = await req.json()
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    // Check chat rate limit
    const chatLimit = await checkChatLimit(session.user.id)
    if (!chatLimit.allowed) {
      return NextResponse.json({
        error: `今日問答次數已用完（${chatLimit.dailyLimit}輪/天），請明日再試。\nDaily chat limit reached (${chatLimit.dailyLimit}/day). Try again tomorrow.`,
        remaining: 0,
      }, { status: 429 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })
    }

    // Load user profile and family members
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, birthDate: true, birthTime: true, birthPlace: true, gender: true, chatSummary: true, familyMembers: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Load last 5 readings with family member info
    const readings = await prisma.reading.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { type: true, result: true, createdAt: true, targetType: true, familyMember: { select: { relation: true, name: true } }, feedbacks: { where: { userId: session.user.id }, select: { rating: true, feedback: true }, take: 1 } },
    })

    const relationLabel: Record<string, string> = { spouse: '配偶', father: '父亲', mother: '母亲', son: '儿子', daughter: '女儿', brother: '兄弟', sister: '姐妹', friend: '朋友', other: '其他' }

    const readingsSummary = readings.map(r => {
      let sections: Record<string, string> = {}
      try {
        const parsed = JSON.parse(r.result)
        sections = parsed.sections || {}
      } catch {
        sections = { overview: r.result.substring(0, 300) }
      }
      const targetInfo = r.targetType === 'family' && r.familyMember
        ? `（为${relationLabel[r.familyMember.relation] || r.familyMember.relation}${r.familyMember.name ? `「${r.familyMember.name}」` : ''}所做）`
        : ''
      const fb = r.feedbacks?.[0]
      const fbInfo = fb ? `\n用户反馈：${fb.rating ? `${fb.rating}/5星` : ''}${fb.feedback ? ` — "${fb.feedback}"` : ''}` : ''
      return `【${r.type} - ${r.createdAt.toLocaleDateString('zh-CN')}${targetInfo}】\n${JSON.stringify(sections).substring(0, 500)}${fbInfo}`
    }).join('\n\n')

    const familyInfo = user.familyMembers && user.familyMembers.length > 0
      ? user.familyMembers.map(m => `- ${relationLabel[m.relation] || m.relation}${m.name ? `（${m.name}）` : ''}：生日${m.birthDate || '未知'}，时辰${m.birthTime || '未知'}，出生地${m.birthPlace || '未知'}，性别${m.gender || '未知'}`).join('\n')
      : '（暂无）'

    const systemPrompt = `你是玄机命理助手，专门回答用户关于命理、占卜的问题。

用户信息：
- 姓名：${user.name || '未知'}
- 出生日期：${user.birthDate || '未填写'}
- 出生时辰：${user.birthTime || '未填写'}
- 出生地：${user.birthPlace || '未填写'}
- 性别：${user.gender || '未填写'}

家庭成员：
${familyInfo}

历史命盘记录：
${readingsSummary || '（暂无历史记录）'}

以往对话要点：
${user.chatSummary || '（暂无）'}

请根据以上信息，用专业的命理知识回答用户问题。保持对话自然流畅，可以引用用户的具体命盘数据。回答简洁而有深度，避免过于冗长。
当用户提到家人（如"老婆"、"儿子"、"爸爸"等），自然关联到对应家庭成员的命盘记录进行分析。
如果用户对之前的预测有反馈（评分或文字），要参考其反馈来调整分析侧重点：低评分说明用户觉得不准，可以换角度深入分析；高评分可以在此基础上延伸。`

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

    // Increment chat usage
    await incrementChatUsage(session.user.id)

    // Generate condensed summary in background (fire-and-forget)
    const conversationForSummary = [
      ...messages,
      { role: 'assistant' as const, content: reply },
    ].map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n')

    // Update chat summary asynchronously
    updateChatSummary(client, user.chatSummary, conversationForSummary, session.user.id, chatModel).catch(console.error)

    return NextResponse.json({ reply })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Chat route error:', err?.message, err?.stack)
    return NextResponse.json({ error: `Server error: ${err?.message || 'Unknown'}` }, { status: 500 })
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
