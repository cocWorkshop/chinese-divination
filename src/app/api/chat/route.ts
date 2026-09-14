export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completeLLM } from '@/lib/llm'
import { checkCredits, deductCredits } from '@/lib/creditService'
import { createRequestLogger } from '@/lib/logger'
import { buildCalendarPromptSection } from '@/lib/currentMoment'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: NextRequest) {
  const log = createRequestLogger('chat')
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
    if (typeof message !== 'string') {
      return NextResponse.json({ error: 'Message must be a string' }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }
    // History entries flow verbatim into the LLM prompt — without per-entry
    // validation a client could ship multi-MB contents or inject 'system'
    // role turns into its own prompt.
    const MAX_HISTORY = 200
    const MAX_HISTORY_CONTENT = 4000
    let cleanHistory: { role: 'user' | 'assistant'; content: string }[] = []
    if (Array.isArray(history)) {
      if (history.length > MAX_HISTORY) {
        return NextResponse.json({ error: 'Too many history entries' }, { status: 400 })
      }
      for (const entry of history) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return NextResponse.json({ error: 'Invalid history entry' }, { status: 400 })
        }
        const { role, content } = entry as { role?: unknown; content?: unknown }
        if (role !== 'user' && role !== 'assistant') {
          return NextResponse.json({ error: 'Invalid history role' }, { status: 400 })
        }
        if (typeof content !== 'string') {
          return NextResponse.json({ error: 'Invalid history content' }, { status: 400 })
        }
        cleanHistory.push({ role, content: content.slice(0, MAX_HISTORY_CONTENT) })
      }
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
        // Scope to the caller — otherwise any user could pass another user's
        // readingId and have their birth/family PII pulled into the prompt (IDOR).
        const reading = await prisma.reading.findFirst({
          where: { id: chatReadingId, userId: session.user.id, deletedAt: null },
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
    const calendarSection = buildCalendarPromptSection(clientDate, -480, isEnglish)
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
      // One DISTINCT ON query instead of a findFirst per member (N+1).
      // Prisma's distinct + orderBy desc yields the latest completed
      // reading per familyMemberId.
      const latestReadings = await prisma.reading.findMany({
        where: {
          familyMemberId: { in: familyMembers.map((fm) => fm.id) },
          userId: session.user.id,
          deletedAt: null,
          status: 'completed',
        },
        distinct: ['familyMemberId'],
        orderBy: { createdAt: 'desc' },
        select: { id: true, familyMemberId: true, type: true, createdAt: true, result: true },
      })
      const latestByMember = new Map(latestReadings.map((r) => [r.familyMemberId!, r]))
      const memberReadings = familyMembers.map((fm) => ({
        ...fm,
        latestReading: latestByMember.get(fm.id) ?? null,
      }))
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

${calendarSection}

${subjectLabel} information${targetLabel}:
- Birth date: ${subjectInfo.birthDate}
- Birth time: ${subjectInfo.birthTime}
- Birth place: ${subjectInfo.birthPlace}
- Gender: ${subjectInfo.gender}

Current ${currentTypeEn} reading result:
${readingData || '(No reading data)'}

【Core Responsibility】
Your sole task is to provide in-depth interpretation and analysis based on the reading result above. Every question from the user should be answered in the context of this specific reading.
When answering any question regarding dates, weekday, lunar calendar, Ganzhi day pillars, or timing (应期), you MUST strictly adhere to the Calendar Reference Table above. Never guess or hallucinate Ganzhi.

【Out of Scope → Redirect to Master Xuanji】
Xuanji Chat ONLY analyzes the current reading shown above (plus referenced family readings via the family-reference flow). If the user asks for any of the following, you MUST tell them this needs the Master Xuanji feature instead of attempting it yourself:
- **Cross-chart composite analysis** — e.g., bazi compatibility (合盘) between two people, oracle × destiny cross-reference (卦命互参), or any analysis that requires holding two or more full charts in mind at once.
- **Browsing / listing the user's reading history** — e.g., "what readings have I done", "find my last ziwei reading", "list all my charts".
- **Starting a new divination from conversation** — Master Xuanji can pre-fill the divination form based on what was discussed; Xuanji Chat cannot.
- **Long-term, cross-session memory** — anything that requires remembering preferences or topics from past sessions.

How to redirect: name the specific capability that's missing, then point the user to the **Master Xuanji** chat at the bottom of the page. Example phrasing: "This kind of [bazi compatibility comparison / browsing past readings / starting a new reading from our chat] is something Master Xuanji handles — open the chat bar at the bottom of the page and ask there. It has the tools to query and cross-reference your readings."
Do NOT silently refuse, fabricate the missing data, or try to do it anyway. Always: (a) state what's out of scope, (b) point to Master Xuanji.

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

${calendarSection}

${subjectLabel}信息${targetLabel}：
- 出生日期：${subjectInfo.birthDate}
- 出生时辰：${subjectInfo.birthTime}
- 出生地：${subjectInfo.birthPlace}
- 性别：${subjectInfo.gender}

当前${currentTypeZh}预测结果：
${readingData || '（无预测数据）'}

【核心职责】
你的唯一任务是围绕上述预测结果进行深入解读和分析。用户的每个问题都应该结合这份具体的预测结果来回答。
凡涉及公历日期、星期几、农历、干支日柱、节气、应期等推算，必须严格以上方给出的权威当前时间与干支日历对照表为准，严禁捏造或擅自脑补干支！

【超出能力范围 → 引导至玄机大师】
玄机问答只针对当前这份预测结果做分析（外加家庭引用流程拉取的相关命盘）。如果用户的问题需要以下任何一种能力，必须明确告诉用户「这要由玄机大师来做」，不要自己硬撑：
- **多份命盘的交叉/合盘分析** —— 例如八字合盘（两个人的命盘对照）、命卦互参（同时参考多张命盘）等需要同时持有两张及以上命盘的分析。
- **浏览或列举用户的历史预测记录** —— 例如「我都做过哪些占卜」「找出我上次紫微的记录」「列出我所有命盘」。
- **从对话中直接开启新占卜** —— 玄机大师可以根据对话内容预填占卜表单，玄机问答做不到。
- **跨会话的长期记忆** —— 任何需要记住你上次聊过什么的能力。

如何引导：向用户说明玄机问答只针对当前这份预测结果，如果需要跨预测分析或更多功能，请点击页面底部的「玄机大师」图标进行对话。例如：「这需要结合多份预测记录来综合分析，请点击页面底部的玄机大师，它能调取您的多份命盘进行合盘推算。」
绝不要装作能做然后胡编乱造，也不要简单粗暴地拒绝。正确的做法是：(1) 说明当前功能的边界，(2) 明确指出应该去找玄机大师。

【解盘原则】
- 必须引用预测结果中的具体数据（如具体星曜、卦象、爻辞、干支、五行等），不要说空话
- 将专业术语转化为通俗易懂的实际影响和行动建议
- 保持积极导向，即使是不利格局也要给出化解和应对之策
- 针对用户的具体问题聚焦回答，不要泛泛而谈

【回答要求】
- 控制在200字以内，精炼但有深度
- 语气亲切自然，像面对面解盘一样
- 不要重复预测结果中已经写明的内容，而是更进一步或提供不同视角的解读
- 严格使用中文回答

【对话引导】
- 每次回答的最后，根据命主情况和预测内容，提出1-2个用户可能关心的后续问题或探讨方向
- 引导问题要具体、有针对性，与刚才讨论的话题相关
- 使用自然的语气，例如："您可能还会关心……"、"说到这里，不知道您是否考虑过……"
- 避免千篇一律的结语，每次引导都要有所变化

【动态推荐问题】
在每次回复的最末尾，追加一个隐藏注释，包含刚好3个推荐后续问题，格式如下：
<!--suggestions:["问题1","问题2","问题3"]-->
这3个问题的生成规则：
1. 如果你在回复末尾向用户提了问题，第1个推荐必须是顺承确认类的自然回复，如"好，请继续说"或"是的，我想了解"
2. 另外2个必须是吸引人的、具体深入的后续问题，让用户产生继续探索的欲望——基于刚才讨论的内容，挖掘尚未涉及的角度
3. 问题必须随着对话推进而演变，绝不重复之前提过的问题
4. 每个问题控制在15字以内
5. 必须符合口语习惯，像用户自己会问的问题
${familyRefZh}`

    // Read max turns (model/timeout/tokens resolved inside completeLLM).
    const maxTurnsSetting = await prisma.adminSetting.findUnique({ where: { key: 'chatMaxTurns' } })
    const maxTurns = parseInt(maxTurnsSetting?.value || '100', 10) || 100

    // Build conversation messages (validated history from the input checks above)
    const conversationHistory = cleanHistory.slice(-maxTurns * 2)
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

    const { content: reply } = await completeLLM({
      endpoint: 'chat',
      userId: session.user.id,
      systemPrompt,
      messages,
      requestId: log.requestId,
    })

    if (!reply) {
      return NextResponse.json({ error: '🔧 玄機暫時出了點小故障，您的機緣未扣除。請稍後再試，若持續異常請聯繫管理員重啟玄機。\n🔧 The oracle encountered a hiccup — your Karma was not deducted. Please try again later, or contact admin if the issue persists.' }, { status: 502 })
    }

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
    log.error({ err }, 'chat request failed')
    Sentry.captureException(err, { tags: { requestId: log.requestId, endpoint: 'chat' } })
    // Note: LLM call failures are already logged by completeLLM() into LlmLog.
    return NextResponse.json({ error: '🔧 玄機暫時無法運轉，請稍後再試。若持續異常，請聯繫管理員重啟玄機。\n🔧 The oracle is temporarily unavailable. Please try again later, or contact admin to restart.' }, { status: 500 })
  }
}


