export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logLlmCall } from '@/lib/llmLogger'
import { checkCredits, deductCredits } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history, readingContext, readingType, readingId: chatReadingId, clientTime, lang } = await req.json()
    const isEnglish = lang === 'en'
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }
    if (typeof message === 'string' && message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }
    if (Array.isArray(history) && history.length > 200) {
      return NextResponse.json({ error: 'Too many history entries' }, { status: 400 })
    }

        // Check chat credits
    const chatLimit = await checkCredits(session.user.id, 'chat')
    if (!chatLimit.allowed) {
      return NextResponse.json({
        error: `✨ 機緣不足（需要 ${chatLimit.cost}，剩餘 ${chatLimit.remaining}）。前往機緣商店補充，即可繼續提問。\n✨ Not enough Karma (need ${chatLimit.cost}, have ${chatLimit.remaining}). Visit the Karma Shop to continue.`,
        remaining: 0,
      }, { status: 429 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: '🔧 玄機尚未啟動，請聯繫管理員配置並重啟。\n🔧 The oracle is not set up yet. Please contact admin to configure and restart.' }, { status: 503 })
    }

    // Load user info as fallback
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, birthDate: true, birthTime: true, birthPlace: true, gender: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Try to get the actual subject info from the reading's inputData
    let subjectInfo = {
      name: user.name || '未知',
      birthDate: user.birthDate || '未填写',
      birthTime: user.birthTime || '未填写',
      birthPlace: user.birthPlace || '未填写',
      gender: user.gender || '未填写',
    }
    let targetLabel = ''

    if (chatReadingId) {
      try {
        const reading = await prisma.reading.findUnique({
          where: { id: chatReadingId },
          select: { inputData: true, targetType: true, familyMemberId: true, familyMember: { select: { name: true, relation: true } } },
        })
        if (reading?.inputData) {
          const input = reading.inputData as Record<string, unknown>
          // Use the inputData which contains the actual subject's info
          if (input.birthDate) subjectInfo.birthDate = String(input.birthDate)
          if (input.birthTime || input.exactTime) subjectInfo.birthTime = String(input.exactTime || input.birthTime)
          if (input.birthPlace) subjectInfo.birthPlace = String(input.birthPlace)
          if (input.gender) subjectInfo.gender = String(input.gender)
          // For family member readings, use their name
          if (reading.targetType === 'family' && reading.familyMember) {
            subjectInfo.name = reading.familyMember.name || reading.familyMember.relation
            targetLabel = `（${reading.familyMember.relation}${reading.familyMember.name ? ' · ' + reading.familyMember.name : ''}）`
          }
        }
      } catch {
        // Fall back to user info
      }
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

    const typeLabelZh: Record<string, string> = {
      bazi: '八字命理', ziwei: '紫微斗数', liuyao: '六爻', iching: '易经',
      qimen: '奇门遁甲', fengshui: '风水', meihua: '梅花易数', other: '命理',
    }
    const typeLabelEn: Record<string, string> = {
      bazi: 'BaZi (Four Pillars)', ziwei: 'Zi Wei Dou Shu', liuyao: 'Liu Yao', iching: 'I Ching',
      qimen: 'Qi Men Dun Jia', fengshui: 'Feng Shui', meihua: 'Mei Hua Yi Shu', other: 'Divination',
    }
    const currentTypeZh = typeLabelZh[readingType] || '命理'
    const currentTypeEn = typeLabelEn[readingType] || 'Divination'

    const clientDate = clientTime ? new Date(clientTime) : new Date()
    const todayStr = isEnglish
      ? clientDate.toLocaleDateString('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
      : clientDate.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
    // Determine if the reading subject is different from the logged-in user
    const isSubjectUser = !targetLabel && subjectInfo.name === (user.name || '未知')
    const subjectLabel = isSubjectUser ? (isEnglish ? 'The user' : '用户本人') : (isEnglish ? 'Subject' : '命主')

    // Load family members and their recent readings for reference
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, relation: true, name: true },
    })
    let familyReadingsBlock = ''
    if (familyMembers.length > 0) {
      const memberReadings = await Promise.all(
        familyMembers.map(async (fm) => {
          const latest = await prisma.reading.findFirst({
            where: { familyMemberId: fm.id, userId: session.user.id, deletedAt: null, status: 'completed' },
            orderBy: { createdAt: 'desc' },
            select: { id: true, type: true, createdAt: true, result: true },
          })
          return { ...fm, latestReading: latest }
        })
      )
      const lines = memberReadings.map((m) => {
        const label = `${m.relation}${m.name ? '（' + m.name + '）' : ''}`
        if (m.latestReading) {
          const typeLabel = typeLabelZh[m.latestReading.type] || m.latestReading.type
          const date = new Date(m.latestReading.createdAt).toLocaleDateString('zh-CN')
          const summary = (m.latestReading.result || '').substring(0, 200).replace(/\n/g, ' ')
          return `- ${label}: 最近预测=${typeLabel}（${date}），readingId=${m.latestReading.id}，摘要：${summary}…`
        }
        return `- ${label}: 暂无预测记录`
      })
      familyReadingsBlock = lines.join('\n')
    }

    // Build family reference section for system prompt
    const familyRefEn = familyReadingsBlock
      ? `\n【Family Members & Reading History】\nThe user has the following family members on file:\n${familyReadingsBlock}\n\n【Family Reading Reference Rules】\n- When the user mentions someone by name or relation (e.g., "my mom", "my son Xiaoming"), look up from the family data above\n- If found WITH a reading: briefly mention the reading type, date, and key points from the summary. Then ask the user: "Would you like me to load the full reading for a cross-analysis?" and include the tag <!--ref:READING_ID_HERE--> at the end of your message (replace READING_ID_HERE with the actual readingId from the data above). This tag is hidden from the user.\n- CRITICAL: When the user confirms (says yes/ok/sure etc), the system will AUTOMATICALLY inject the full reading into the conversation. Do NOT say "loading..." or "fetching..." — just directly start analyzing with the cross-reference data that will be provided to you as a system message. If you see a system message starting with 【Referenced Reading Loaded】, use that data immediately for cross-analysis.\n- If found but NO reading: tell the user "I don't have a reading on file for [person]. Please go to the [Divination page](/divination) to create a reading for them first, then come back to chat."\n- If the person is NOT found at all: tell the user "I don't see [person] in your family members. Please add them on your [Profile page](/profile) first, then create a reading for them on the [Divination page](/divination)."\n- IMPORTANT: If the user provides raw birth info (date, time, place) and asks you to do a reading or interpretation directly in chat, REFUSE. Say: "Xuanji Chat is for analyzing existing readings only. Please go to the [Divination page](/divination) to create a reading first, then come back to discuss the results."\n`
      : ''
    const familyRefZh = familyReadingsBlock
      ? `\n【家庭成员及预测记录】\n用户已登记的家庭成员：\n${familyReadingsBlock}\n\n【引用家庭预测记录规则】\n- 当用户提到某人的名字或关系（如"我妈妈"、"我儿子小明"），从上方家庭成员数据中查找匹配\n- 如果找到且有预测记录：简要提及预测类型、日期和摘要要点，然后询问用户："需要我调取完整的预测记录来做交叉分析吗？"并在回复最末尾添加标记 <!--ref:此处填写readingId-->（将readingId替换为上方数据中的实际readingId）。这个标记用户看不到。\n- 重要：当用户确认后，系统会自动将完整预测记录注入对话。你不要说"正在调取"、"正在加载"之类的话——直接开始结合引用数据进行交叉分析即可。如果你看到以【已載入引用記錄】开头的系统消息，直接使用其中的数据进行分析。\n- 如果找到但没有预测记录：告诉用户"目前没有找到[此人]的预测记录，建议先前往[排盘页面](/divination)为其排盘，完成后回来继续聊天。"\n- 如果完全找不到此人：告诉用户"未在您的家庭成员中找到[此人]，建议先在[个人资料页面](/profile)添加该家庭成员，然后前往[排盘页面](/divination)排盘。"\n- 重要：如果用户在聊天中直接提供生辰八字（出生日期、时辰、地点等）要求你排盘或解读，必须拒绝。回复："玄机问答仅用于解读已有的预测结果，请先前往[排盘页面](/divination)排盘，完成后回来继续聊天。"\n`
      : ''

    const systemPrompt = isEnglish
      ? `You are a professional ${currentTypeEn} reading analyst. You are helping the user deeply analyze their ${currentTypeEn} reading result.
Today's date: ${todayStr}.

${subjectLabel} information${targetLabel}:
- Birth date: ${subjectInfo.birthDate}
- Birth time: ${subjectInfo.birthTime}
- Birth place: ${subjectInfo.birthPlace}
- Gender: ${subjectInfo.gender}

Current ${currentTypeEn} reading result:
${readingData || '(No reading data)'}

【Core Responsibility】
Your sole task is to provide in-depth interpretation and analysis based on the reading result above. Every question from the user should be answered in the context of this specific reading.

【Analysis Principles】
- Must reference specific data from the reading (e.g., specific stars, hexagrams, line texts, pillars, five elements, etc.) — no generic talk
- Translate technical terms into practical impacts and actionable advice the user can understand
- Guide with a positive perspective — even unfavorable patterns should include remedies
- Focus each answer on the user's specific question with targeted analysis

【Response Requirements】
- Keep within 200 words, concise yet insightful
- Natural and conversational, as if doing a face-to-face reading
- Do not repeat what the reading result already stated — go deeper or offer a different angle
- ALWAYS respond in English

【Conversation Guidance】
- At the end of each answer, suggest 1-2 follow-up questions the user might care about, based on the subject's info and reading
- Questions should be specific, targeted, and relevant to the current topic
- Use natural phrasing like: "You might also want to know...", "Speaking of which, have you considered..."
- Vary your lead-in phrases to keep it natural

【Dynamic Suggested Questions】
At the very end of EVERY reply, append a hidden comment with exactly 3 suggested follow-up questions in this format:
<!--suggestions:["question1","question2","question3"]-->
Rules for generating these 3 questions:
1. If your reply ends with a question to the user, the FIRST suggestion must be a natural affirmative/continuation like "Please go ahead" or "Yes, tell me more" or "Sure, I'd like to know"
2. The other 2 questions should be enticing, specific follow-ups that make the user curious to continue chatting — based on what was just discussed and what angles haven't been explored yet
3. Questions should evolve with the conversation — never repeat previously asked questions
4. Keep each question under 30 characters
5. Make questions feel like something the user would naturally want to ask next
${familyRefEn}`
      : `你是一位专业的${currentTypeZh}解盘师。你正在帮助用户深入分析他们刚刚获得的${currentTypeZh}预测结果。
今天日期：${todayStr}。

${subjectLabel}信息${targetLabel}：
- 出生日期：${subjectInfo.birthDate}
- 出生时辰：${subjectInfo.birthTime}
- 出生地：${subjectInfo.birthPlace}
- 性别：${subjectInfo.gender}

当前${currentTypeZh}预测结果：
${readingData || '（无预测数据）'}

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

【引导对话】
- 每次回答末尾，结合命主信息和解盘结果，提出 1-2 个用户可能关心的后续问题
- 问题要具体、有针对性，与当前话题和命主实际情况相关
- 用自然的语气引出，例如："你可能还想了解……"、"说到这里，你有没有想过……"
- 不要每次都用相同的引导句式，保持自然多样

【动态建议问题】
在每次回复的最末尾，必须附加一个隐藏注释，包含3个建议的后续问题，格式如下：
<!--suggestions:["问题1","问题2","问题3"]-->
生成规则：
1. 如果你的回复以向用户提问结尾，第一个建议必须是自然的肯定/继续回应，如"请讲"、"好的，请说"、"想了解"、"请详细说说"
2. 另外2个问题应当是有吸引力的、具体的后续问题，让用户有好奇心想继续聊下去——基于刚才讨论的内容和尚未探索的角度
3. 问题应随对话推进而变化，不要重复之前已经问过的问题
4. 每个问题控制在20字以内
5. 问题要像用户自然会想问的那样
${familyRefZh}`

    // Read configurable timeout and chat model
    const [timeoutSetting, chatModelSetting, model1Setting, maxTurnsSetting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
      prisma.adminSetting.findUnique({ where: { key: 'chatModelName' } }),
      prisma.adminSetting.findUnique({ where: { key: 'model1Name' } }),
      prisma.adminSetting.findUnique({ where: { key: 'chatMaxTurns' } }),
    ])
    const llmTimeoutMs = (parseInt(timeoutSetting?.value || '240', 10) || 240) * 1000
    const chatModel = chatModelSetting?.value || model1Setting?.value || 'anthropic/claude-3-5-haiku'
    const maxTurns = parseInt(maxTurnsSetting?.value || '100', 10) || 100

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
    const conversationHistory = ((history || []) as { role: 'user' | 'assistant'; content: string }[]).slice(-maxTurns * 2)
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    // Check if user confirmed a family reading reference
    // Scan recent history for <!--ref:READING_ID--> tags in assistant messages
    // If the user's current message is a confirmation, load the full reading
    const confirmPatterns = /^(好|是|对|确认|没错|就是|可以|yes|ok|sure|confirm|right|yeah|yep|对的|嗯|行|要|想|需要|请|好的|沒錯|可以的|當然|当然)/i
    if (confirmPatterns.test(message.trim())) {
      // Find the most recent assistant message with a <!--ref:xxx--> tag
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i]
        if (msg.role !== 'assistant') continue
        const refMatch = msg.content.match(/<!--ref:\s*([a-z0-9]+)\s*-->/i)
        if (!refMatch) continue
        try {
          const refReading = await prisma.reading.findFirst({
            where: { id: refMatch[1], userId: session.user.id, deletedAt: null },
            select: { type: true, result: true, createdAt: true, familyMember: { select: { name: true, relation: true } } },
          })
          if (refReading?.result) {
            const refLabel = refReading.familyMember
              ? `${refReading.familyMember.relation}${refReading.familyMember.name ? '（' + refReading.familyMember.name + '）' : ''}`
              : isEnglish ? 'Family member' : '家庭成員'
            const refType = (isEnglish ? typeLabelEn : typeLabelZh)[refReading.type] || refReading.type
            
            // Extract readable content from result (which may be JSON)
            let readableResult = refReading.result
            try {
              const parsed = JSON.parse(refReading.result)
              const parts: string[] = []
              
              // Day master info
              if (parsed.dayMaster) {
                const dm = parsed.dayMaster
                parts.push(`日主：${dm.stem || ''}${dm.element || ''} (${dm.yinYang || ''}) ${dm.strengthLabel || dm.strength || ''}`)
              }
              
              // Five elements
              if (parsed.fiveElements) {
                const fe = parsed.fiveElements
                const feStr = Object.entries(fe).map(([k, v]) => `${k}:${v}`).join(' ')
                parts.push(`五行分佈：${feStr}`)
              }
              
              // Lucky info
              if (parsed.luckyElements) {
                const le = Array.isArray(parsed.luckyElements) ? parsed.luckyElements.join('、') : String(parsed.luckyElements)
                parts.push(`喜用神：${le}`)
              }
              
              // Key advice (most important readable part)
              if (parsed.keyAdvice) {
                const advice = Array.isArray(parsed.keyAdvice) ? parsed.keyAdvice.join('\n') : String(parsed.keyAdvice)
                parts.push(`\n核心建議：\n${advice}`)
              }
              
              // Sections (detailed analysis)
              if (parsed.sections && typeof parsed.sections === 'object') {
                for (const [key, val] of Object.entries(parsed.sections)) {
                  if (typeof val === 'object' && val !== null) {
                    const sec = val as Record<string, unknown>
                    const title = sec.title || sec.label || key
                    const content = sec.content || sec.text || sec.analysis || ''
                    if (content) parts.push(`\n【${title}】\n${String(content).substring(0, 500)}`)
                  } else if (typeof val === 'string') {
                    parts.push(`\n【${key}】\n${val.substring(0, 500)}`)
                  }
                }
              }
              
              // Pillars summary
              if (parsed.pillars) {
                const p = parsed.pillars
                const pillarStr = ['year', 'month', 'day', 'hour']
                  .filter(k => p[k])
                  .map(k => `${p[k].stem || ''}${p[k].branch || ''}`)
                  .join(' ')
                if (pillarStr) parts.unshift(`四柱：${pillarStr}`)
              }
              
              // Da Yun (major luck periods)
              if (parsed.daYun && Array.isArray(parsed.daYun)) {
                const currentAge = new Date().getFullYear() - 1988 // approximate
                const currentDaYun = parsed.daYun.find((d: Record<string, unknown>) => {
                  const start = Number(d.startAge || d.start || 0)
                  const end = Number(d.endAge || d.end || 0)
                  return currentAge >= start && currentAge <= end
                })
                if (currentDaYun) {
                  parts.push(`當前大運：${(currentDaYun as Record<string, unknown>).stem || ''}${(currentDaYun as Record<string, unknown>).branch || ''}（${(currentDaYun as Record<string, unknown>).startAge || ''}~${(currentDaYun as Record<string, unknown>).endAge || ''}歲）`)
                }
              }
              
              readableResult = parts.length > 0 ? parts.join('\n') : refReading.result.substring(0, 4000)
            } catch {
              // Not JSON or parse failed, use as-is but truncate
              readableResult = refReading.result.substring(0, 4000)
            }
            
            messages.splice(-1, 0, {
              role: 'system' as const,
              content: isEnglish
                ? `【Referenced Reading Loaded】${refType} reading summary for ${refLabel}. Use this data for cross-analysis with the current reading:\n${readableResult}`
                : `【已載入引用記錄】${refLabel}的${refType}預測結果摘要如下，請結合當前預測結果進行交叉分析：\n${readableResult}`,
            })
          }
        } catch {
          // Ignore errors loading referenced reading
        }
        break // only load the most recent ref
      }
    }

    const chatStart = Date.now()
    const completion = await client.chat.completions.create({
      model: chatModel,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    const reply = completion.choices[0]?.message?.content
    if (!reply) {
      await logLlmCall({
        userId: session.user.id, endpoint: 'chat', model: chatModel,
        promptTokens: completion.usage?.prompt_tokens, completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens, latencyMs: Date.now() - chatStart,
        status: 'error', inputPreview: message, outputPreview: 'Empty reply from LLM',
      })
      return NextResponse.json({ error: '🔧 玄機暫時出了點小故障，您的機緣未扣除。請稍後再試，若持續異常請聯繫管理員重啟玄機。\n🔧 The oracle encountered a hiccup — your Karma was not deducted. Please try again later, or contact admin if the issue persists.' }, { status: 502 })
    }

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
    await deductCredits(session.user.id, 'chat')

    // Fetch updated credits to return to frontend
    const updatedCredits = await checkCredits(session.user.id, 'chat')

    // Parse dynamic suggestions and strip hidden tags from reply
    let cleanedReply = reply
    let suggestions: string[] = []
    const suggestionsMatch = reply.match(/<!--suggestions:\s*(\[.*?\])\s*-->/)
    if (suggestionsMatch) {
      try {
        const parsed = JSON.parse(suggestionsMatch[1])
        if (Array.isArray(parsed)) suggestions = parsed.map(String)
      } catch { /* ignore parse errors */ }
      cleanedReply = cleanedReply.replace(/<!--suggestions:\s*\[.*?\]\s*-->/g, '').trimEnd()
    }
    // Strip <!--ref:xxx--> tags (hidden from user, used for backend reference loading)
    cleanedReply = cleanedReply.replace(/<!--ref:\s*[a-z0-9]+\s*-->/gi, '').trimEnd()

    return NextResponse.json({
      reply: cleanedReply,
      suggestions,
      credits: updatedCredits.remaining,
      chatCredits: { remaining: updatedCredits.remaining },
    })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Chat route error:', err?.message, err?.stack)
    // Log error to LlmLog if we have user context
    try {
      const session = await auth()
      if (session?.user?.id) {
        await logLlmCall({
          userId: session.user.id, endpoint: 'chat', model: 'unknown',
          latencyMs: 0, status: 'error',
          inputPreview: 'Chat request failed', outputPreview: err?.message || 'Unknown error',
        })
      }
    } catch { /* ignore logging errors */ }
    return NextResponse.json({ error: '🔧 玄機暫時無法運轉，請稍後再試。若持續異常，請聯繫管理員重啟玄機。\n🔧 The oracle is temporarily unavailable. Please try again later, or contact admin to restart.' }, { status: 500 })
  }
}


