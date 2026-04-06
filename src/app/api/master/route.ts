export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest } from 'next/server'
import type OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, deductCredits } from '@/lib/rateLimit'
import { streamLLM, completeLLM, resolveLLMConfig } from '@/lib/llm'
import type { Message, Tool } from '@/lib/llm'
import { calculateBazi } from '@/lib/baziCalculator'
import { calculateZiwei } from '@/lib/ziweiCalculator'
import { calculateQimen } from '@/lib/qimenCalculator'
import { calculateMeihua } from '@/lib/meihuaCalculator'
import { calculateFlyingStars } from '@/lib/fengshuiCalculator'
import type { MasterMessage, UserPortrait } from '@/types/master'

// ---------------------------------------------------------------------------
// OpenAI function-calling tool definitions
// ---------------------------------------------------------------------------
const masterTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculate_bazi',
      description: '八字排盘 - 根据出生时间计算四柱八字、十神、大运等',
      parameters: {
        type: 'object',
        properties: {
          birthDate: { type: 'string', description: '出生日期 YYYY-MM-DD' },
          birthTime: { type: 'string', description: '出生时辰 HH:mm 或模糊时辰如 子时' },
          gender: { type: 'string', enum: ['male', 'female'] },
          calendarType: { type: 'string', enum: ['solar', 'lunar'], description: '历法类型，默认solar' },
        },
        required: ['birthDate', 'birthTime', 'gender'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_ziwei',
      description: '紫微斗数排盘 - 根据出生时间排紫微命盘',
      parameters: {
        type: 'object',
        properties: {
          birthDate: { type: 'string', description: '出生日期 YYYY-MM-DD' },
          birthTime: { type: 'string', description: '出生时辰 HH:mm' },
          gender: { type: 'string', enum: ['male', 'female'] },
          calendarType: { type: 'string', enum: ['solar', 'lunar'] },
        },
        required: ['birthDate', 'birthTime', 'gender'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_qimen',
      description: '奇门遁甲起局 - 根据指定时间起奇门局',
      parameters: {
        type: 'object',
        properties: {
          dateTime: { type: 'string', description: '起局时间 ISO格式或 YYYY-MM-DD HH:mm' },
        },
        required: ['dateTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_meihua',
      description: '梅花易数起卦 - 根据时间或数字起卦',
      parameters: {
        type: 'object',
        properties: {
          dateTime: { type: 'string', description: '起卦时间' },
          upperNumber: { type: 'number', description: '上卦数（可选，不提供则按时间起卦）' },
          lowerNumber: { type: 'number', description: '下卦数（可选）' },
        },
        required: ['dateTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_fengshui',
      description: '玄空飞星排盘 - 根据朝向和年份计算飞星盘',
      parameters: {
        type: 'object',
        properties: {
          facing: { type: 'string', description: '房屋朝向：坎/North, 艮/NE, 震/East, 巽/SE, 离/South, 坤/SW, 兑/West, 乾/NW' },
          year: { type: 'number', description: '建造年份或当前年份' },
        },
        required: ['facing'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: '获取用户的个人信息（生辰、性别、出生地等）和家人信息',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_readings',
      description: '搜索用户的历史预测记录',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: '预测类型: bazi/ziwei/qimen/meihua/liuyao/iching/fengshui' },
          limit: { type: 'number', description: '返回数量，默认5' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_portrait',
      description: '更新用户画像中的某个字段（从对话中获取的新信息）',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', description: '要更新的字段路径如 birthInfo.birthPlace, family.spouse.name' },
          value: { type: 'string', description: '新值' },
        },
        required: ['field', 'value'],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(portrait: UserPortrait | null): string {
  const portraitJson = portrait ? JSON.stringify(portrait, null, 2) : '{}'
  return `你是「玄機」——一位精通中國傳統預測學的資深大師。你通曉八字命理、紫微斗數、奇門遁甲、梅花易數、六爻占卜、易經和風水，融會貫通，修習數十年。

## 身份與風格
- 你說話沉穩有度，像一位有閱歷的長者
- 不急不躁，善於傾聽，會在適當時候追問細節
- 用詞考究但不晦澀，偶爾引用經典但不掉書袋
- 有幽默感，但不輕浮
- 對求測者的隱私極為尊重，從不主動提及敏感信息

## 行為準則
- 需要用戶信息時，委婉詢問，如「若方便告知生辰，我可以為你排一下命盤」
- 絕不一上來就問一堆信息，要在對話中自然獲取
- 當你需要排盤計算時，使用提供的工具，不要自己編造數據
- 排盤結果要結合用戶的具體問題進行解讀，不要泛泛而談
- 如果用戶問題模糊，先幫助用戶釐清真正想了解的事情
- 每次回覆控制在合理長度，不要一次說太多

## 過渡語（調用工具時自然使用）
- 排八字時：「讓我為你排一下八字看看...」「待我算算...」
- 排紫微時：「我來看看你的命盤...」
- 起奇門時：「且讓我起一局奇門...」
- 查歷史時：「我記得之前有看過...」「讓我查閱一下之前的記錄...」
- 分析中：「這個格局倒是有些意思...」「嗯，此處有些蹊蹺...」

## 用戶畫像
${portraitJson}

## 重要
- 你只使用工具提供的排盤結果，絕不自己編造命理數據
- 排盤不消耗用戶的積分，放心使用
- 對話要有節奏感，不要一次把所有信息都倒出來`
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  sessionId: string,
): Promise<unknown> {
  switch (name) {
    case 'calculate_bazi': {
      const result = calculateBazi(
        args.birthDate as string,
        args.birthTime as string,
        '', // birthPlace — not always available via tool call
        args.gender as 'male' | 'female',
      )
      return result
    }
    case 'calculate_ziwei': {
      const result = calculateZiwei(
        args.birthDate as string,
        args.birthTime as string,
        args.gender as 'male' | 'female',
      )
      return result
    }
    case 'calculate_qimen': {
      const dt = new Date(args.dateTime as string)
      const result = calculateQimen(dt)
      return result
    }
    case 'calculate_meihua': {
      const result = calculateMeihua(
        args.dateTime as string,
        args.birthTime as string || '子',
      )
      return result
    }
    case 'calculate_fengshui': {
      const result = calculateFlyingStars({
        facing: args.facing as string,
        year: args.year as number | undefined,
      })
      return result
    }
    case 'get_user_profile': {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true, birthDate: true, birthTime: true, birthPlace: true,
          gender: true, calendarType: true,
          familyMembers: { select: { name: true, relation: true, birthDate: true, birthTime: true, gender: true } },
        },
      })
      return user
    }
    case 'search_readings': {
      const readings = await prisma.reading.findMany({
        where: {
          userId,
          ...(args.type ? { type: args.type as string } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: (args.limit as number) || 5,
        select: { id: true, type: true, question: true, result: true, createdAt: true },
      })
      return readings
    }
    case 'update_portrait': {
      const session = await prisma.masterSession.findUnique({ where: { userId } })
      if (!session) return { error: 'No session found' }
      const portrait: UserPortrait = session.portrait ? JSON.parse(session.portrait) : { lastUpdated: new Date().toISOString(), totalSessions: 0 }
      // Set nested field by dot path
      const path = (args.field as string).split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = portrait
      for (let i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]] || typeof obj[path[i]] !== 'object') obj[path[i]] = {}
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = args.value
      portrait.lastUpdated = new Date().toISOString()
      await prisma.masterSession.update({
        where: { id: sessionId },
        data: { portrait: JSON.stringify(portrait) },
      })
      return { success: true, field: args.field, value: args.value }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Conversation summarisation (when history exceeds 50 messages)
// ---------------------------------------------------------------------------
async function summariseOldMessages(
  userId: string,
  messages: MasterMessage[],
  model: string,
): Promise<{ summary: string; trimmed: MasterMessage[] }> {
  const keep = 20
  const old = messages.slice(0, messages.length - keep)
  const recent = messages.slice(messages.length - keep)

  const { content: summary } = await completeLLM({
    endpoint: 'master',
    userId,
    systemPrompt: '请将以下对话总结为简洁的中文摘要，保留关键信息（用户生辰、问题、结论、重要决策）。不超过500字。',
    messages: [{ role: 'user', content: old.map(m => `[${m.role}] ${m.content}`).join('\n') }],
    model,
    maxTokens: 600,
  })

  // Prepend summary as a system message
  const summaryMsg: MasterMessage = {
    role: 'system',
    content: `[对话摘要] ${summary}`,
    timestamp: new Date().toISOString(),
  }
  return { summary, trimmed: [summaryMsg, ...recent] }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const userId = session.user.id
    const { message } = await req.json()
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 2000)' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // Check credits
    const creditCheck = await checkCredits(userId, 'master')
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({
        error: `✨ 機緣不足（需要 ${creditCheck.cost}，剩餘 ${creditCheck.remaining}）。前往機緣商店補充，即可繼續提問。`,
        remaining: creditCheck.remaining,
      }), { status: 429, headers: { 'Content-Type': 'application/json' } })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: '🔧 玄機尚未啟動，請聯繫管理員。' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }

    // Load or create MasterSession
    let masterSession = await prisma.masterSession.findUnique({ where: { userId } })
    if (!masterSession) {
      masterSession = await prisma.masterSession.create({
        data: {
          userId,
          messages: '[]',
          portrait: JSON.stringify({ lastUpdated: new Date().toISOString(), totalSessions: 0 } as UserPortrait),
        },
      })
    }

    let history: MasterMessage[] = JSON.parse(masterSession.messages || '[]')
    const portrait: UserPortrait | null = masterSession.portrait ? JSON.parse(masterSession.portrait) : null

    // Add user message
    const userMsg: MasterMessage = { role: 'user', content: message, timestamp: new Date().toISOString() }
    history.push(userMsg)

    // Resolve master model via the unified settings chain.
    const { model } = await resolveLLMConfig({ endpoint: 'master' })

    const systemPrompt = buildSystemPrompt(portrait)
    const initialMessages: Message[] = history.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    // Deduct credits
    const deducted = await deductCredits(userId, 'master')
    if (!deducted) {
      return new Response(JSON.stringify({ error: 'Failed to deduct credits' }), { status: 429, headers: { 'Content-Type': 'application/json' } })
    }

    // SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const currentMessages: Message[] = [...initialMessages]
          let assistantContent = ''
          const allToolCalls: MasterMessage['toolCalls'] = []
          let loopCount = 0
          const maxLoops = 5 // prevent infinite tool-call loops

          while (loopCount < maxLoops) {
            loopCount++
            const pendingToolCalls: { id: string; name: string; arguments: string }[] = []
            let contentChunk = ''
            let finishReason = ''

            for await (const chunk of streamLLM({
              endpoint: 'master',
              userId,
              systemPrompt,
              messages: currentMessages,
              tools: masterTools as unknown as Tool[],
              model,
            })) {
              if (chunk.type === 'content') {
                contentChunk += chunk.text
                assistantContent += chunk.text
                send({ type: 'content', text: chunk.text })
              } else if (chunk.type === 'tool_call_delta') {
                const idx = chunk.index
                if (!pendingToolCalls[idx]) {
                  pendingToolCalls[idx] = { id: chunk.id || '', name: chunk.name || '', arguments: '' }
                }
                if (chunk.id) pendingToolCalls[idx].id = chunk.id
                if (chunk.name) pendingToolCalls[idx].name = chunk.name
                if (chunk.argumentsDelta) pendingToolCalls[idx].arguments += chunk.argumentsDelta
              } else if (chunk.type === 'done') {
                finishReason = chunk.finishReason
              }
            }

            // If no tool calls, we're done
            if (finishReason !== 'tool_calls' || pendingToolCalls.length === 0) {
              break
            }

            // Execute tool calls — append assistant msg with tool_calls, then each tool result.
            currentMessages.push({
              role: 'assistant',
              content: contentChunk || null,
              tool_calls: pendingToolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            })

            for (const tc of pendingToolCalls) {
              send({ type: 'tool_start', tool: tc.name })

              let args: Record<string, unknown> = {}
              try { args = JSON.parse(tc.arguments) } catch { /* empty */ }

              const result = await executeTool(tc.name, args, userId, masterSession!.id)
              allToolCalls.push({ name: tc.name, args, result })

              send({ type: 'tool_end', tool: tc.name })

              currentMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              })
            }
          }

          // Save assistant message to history
          const assistantHistoryMsg: MasterMessage = {
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
            ...(allToolCalls.length > 0 ? { toolCalls: allToolCalls } : {}),
          }
          history.push(assistantHistoryMsg)

          // Summarise if history too long
          if (history.length > 50) {
            const { summary, trimmed } = await summariseOldMessages(userId, history, model)
            history = trimmed
            // Update portrait with summary
            if (portrait) {
              portrait.summaryNotes = (portrait.summaryNotes || '') + '\n' + summary
              portrait.lastUpdated = new Date().toISOString()
            }
          }

          // Persist session
          await prisma.masterSession.update({
            where: { id: masterSession!.id },
            data: {
              messages: JSON.stringify(history),
              totalCreditsUsed: { increment: 1 },
              ...(portrait ? { portrait: JSON.stringify(portrait) } : {}),
            },
          })

          send({ type: 'done' })
        } catch (err) {
          // streamLLM / completeLLM already logged the underlying LLM failure.
          console.error('[master] stream error:', err)
          send({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[master] error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

// ---------------------------------------------------------------------------
// GET — load session history
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const masterSession = await prisma.masterSession.findUnique({ where: { userId: session.user.id } })
    if (!masterSession) {
      return new Response(JSON.stringify({ messages: [], portrait: null }), { headers: { 'Content-Type': 'application/json' } })
    }

    const messages: MasterMessage[] = JSON.parse(masterSession.messages || '[]')
    return new Response(JSON.stringify({
      messages: messages.filter(m => m.role !== 'system'),
      portrait: masterSession.portrait ? JSON.parse(masterSession.portrait) : null,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[master] GET error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

// ---------------------------------------------------------------------------
// DELETE — clear session
// ---------------------------------------------------------------------------
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    await prisma.masterSession.deleteMany({ where: { userId: session.user.id } })
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[master] DELETE error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
