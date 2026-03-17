import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 })
    }

    // Load user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, birthDate: true, birthTime: true, birthPlace: true, gender: true, chatSummary: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Load last 5 readings
    const readings = await prisma.reading.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { type: true, result: true, createdAt: true },
    })

    const readingsSummary = readings.map(r => {
      let sections: Record<string, string> = {}
      try {
        const parsed = JSON.parse(r.result)
        sections = parsed.sections || {}
      } catch {
        sections = { overview: r.result.substring(0, 300) }
      }
      return `【${r.type} - ${r.createdAt.toLocaleDateString('zh-CN')}】\n${JSON.stringify(sections).substring(0, 500)}`
    }).join('\n\n')

    const systemPrompt = `你是玄机命理助手，专门回答用户关于命理、占卜的问题。

用户信息：
- 姓名：${user.name || '未知'}
- 出生日期：${user.birthDate || '未填写'}
- 出生时辰：${user.birthTime || '未填写'}
- 出生地：${user.birthPlace || '未填写'}
- 性别：${user.gender || '未填写'}

历史命盘记录：
${readingsSummary || '（暂无历史记录）'}

以往对话要点：
${user.chatSummary || '（暂无）'}

请根据以上信息，用专业的命理知识回答用户问题。保持对话自然流畅，可以引用用户的具体命盘数据。回答简洁而有深度，避免过于冗长。`

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      timeout: 120000,
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

    const completion = await client.chat.completions.create({
      model: 'anthropic/claude-3-5-haiku',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    const reply = completion.choices[0]?.message?.content || '抱歉，无法获取回复。'

    // Generate condensed summary in background (fire-and-forget)
    const conversationForSummary = [
      ...messages,
      { role: 'assistant' as const, content: reply },
    ].map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n')

    // Update chat summary asynchronously
    updateChatSummary(client, user.chatSummary, conversationForSummary, session.user.id).catch(console.error)

    return NextResponse.json({ reply })
  } catch (e) {
    console.error('Chat route error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function updateChatSummary(
  client: OpenAI,
  existingSummary: string | null,
  conversation: string,
  userId: string
) {
  try {
    const summaryCompletion = await client.chat.completions.create({
      model: 'anthropic/claude-3-5-haiku',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `将以下对话提炼为3-5个关键要点（每点不超过15字，用•分隔）：\n${conversation}`,
        },
      ],
    })
    const newPoints = summaryCompletion.choices[0]?.message?.content || ''
    const combined = [existingSummary || '', newPoints].filter(Boolean).join('\n')
    // Keep last 500 chars
    const trimmed = combined.length > 500 ? combined.slice(combined.length - 500) : combined
    await prisma.user.update({ where: { id: userId }, data: { chatSummary: trimmed } })
  } catch {
    // Non-critical, ignore errors
  }
}
