export const dynamic = 'force-dynamic'
// Allow long-running LLM calls (up to 10 minutes)
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, deductCredits } from '@/lib/rateLimit'
import { completeLLM, streamLLM, resolveLLMConfig } from '@/lib/llm'
import type { LLMConfig } from '@/lib/llm'
import { selectHandler, buildHandlerSchema, validateHandlerOutput, type DivinationContext } from './handlers'
import { buildSystemPrompt } from './handlers/_systemPrompt'
import { parseJsonFromLLMOutput, PARSE_FAILED_KEY } from './handlers/_jsonParse'
import { StreamingJsonParser, type ParserEvent } from './handlers/_streamingJsonParser'
import { FUNNEL_COOKIE_NAME, verifyFunnelToken } from '@/lib/funnelSession'

const RELATION_LABELS: Record<string, string> = {
  spouse: '配偶', father: '父亲', mother: '母亲', son: '儿子', daughter: '女儿',
  brother: '兄弟', sister: '姐妹', friend: '朋友', other: '其他',
}

export async function POST(req: NextRequest) {
  const apiStart = Date.now()
  try {
    // Auth: prefer NextAuth session (regular logged-in users), fall back
    // to the /start funnel session cookie (tentative users walking through
    // the ad funnel before they've set a password). Tentative users
    // legitimately need to call /api/divination from View 3 to stream
    // their trial reading.
    const session = await auth()
    let userId: string | null = session?.user?.id ?? null
    if (!userId) {
      const funnel = verifyFunnelToken(req.cookies.get(FUNNEL_COOKIE_NAME)?.value)
      if (funnel) userId = funnel.userId
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    let type = body.type
    let inputData = body.inputData
    const {
      language, question, saveProfile, saveHistory,
      targetType: rawTargetType, familyMemberId, newFamilyMember,
      readingId: preCreatedReadingId, clientTime, paipanOnly,
    } = body
    const targetType = rawTargetType === 'family' ? 'family' : 'self'

    // Funnel View 3 calls this with only `readingId` — the Reading row was
    // pre-created by /api/start/init with the inputs. Hydrate type +
    // inputData from the row when they're missing from the body. Ownership
    // is checked: the row must belong to the authenticated (or funnel-
    // tentative) user before we use its data.
    if (preCreatedReadingId && (!type || !inputData)) {
      const row = await prisma.reading.findFirst({
        where: { id: preCreatedReadingId, userId },
        select: { type: true, inputData: true },
      })
      if (!row) {
        return NextResponse.json({ error: 'Reading not found' }, { status: 404 })
      }
      type = type ?? row.type
      inputData = inputData ?? row.inputData
    }

    if (!type || !inputData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof question === 'string' && question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 characters)' }, { status: 400 })
    }

    const shouldSaveHistory = saveHistory !== false
    const shouldSaveProfile = saveProfile !== false

    // readingId from /init means credit/maintenance already validated → only fetch LLM config keys.
    // Must keep in sync with LLM_SETTING_KEYS: any LLM key the llm/ module reads
    // has to appear here so the override path works when the route pre-fetches.
    const llmKeys = [
      'model1Name',
      'llmTimeoutSeconds',
      'llmMaxTokens',
      'divinationReasoningEffort',
      'llmReasoningEffort',
    ]
    const adminSettings = await prisma.adminSetting.findMany({
      where: { key: { in: preCreatedReadingId
        ? llmKeys
        : ['maintenanceMode', 'divinationEnabled', ...llmKeys] } },
    })
    const settingsMap = Object.fromEntries(adminSettings.map(s => [s.key, s.value]))

    if (!preCreatedReadingId) {
      if (settingsMap.maintenanceMode === 'true') {
        return NextResponse.json(
          { error: language !== 'en' ? '系統維護中，請稍後再試。' : 'System under maintenance. Please try again later.' },
          { status: 503 }
        )
      }
      if (settingsMap.divinationEnabled === 'false') {
        return NextResponse.json(
          { error: language !== 'en' ? '占卜功能暫時關閉，請稍後再試。' : 'Divination service is temporarily disabled.' },
          { status: 503 }
        )
      }
      if (!paipanOnly) {
        const rl = await checkCredits(userId, type)
        if (!rl.allowed) {
          return NextResponse.json(
            { error: language === 'en' ? `Not enough Karma (need ${rl.cost}, have ${rl.remaining}). Visit the Karma Shop to get more.` : `✨ 機緣不足（需要 ${rl.cost}，剩餘 ${rl.remaining}）。前往機緣商店補充機緣。` },
            { status: 429 }
          )
        }
      }
    }

    // Resolve family member (creates a new one if newFamilyMember.relation provided).
    let resolvedFamilyMemberId: string | null = null
    let targetPersonInfo = ''
    if (targetType === 'family') {
      if (newFamilyMember?.relation) {
        // Enforce relationDetail when relation === 'other'.
        if (newFamilyMember.relation === 'other') {
          const rd = typeof newFamilyMember.relationDetail === 'string' ? newFamilyMember.relationDetail.trim() : ''
          if (!rd) {
            return NextResponse.json(
              { error: language !== 'en' ? '請填寫具體關係（「其他」類型必填）' : "Please specify the relationship ('other' requires a detail)" },
              { status: 400 },
            )
          }
        }
        const created = await prisma.familyMember.create({
          data: {
            userId: userId,
            relation: newFamilyMember.relation,
            relationDetail: typeof newFamilyMember.relationDetail === 'string' && newFamilyMember.relationDetail.trim() ? newFamilyMember.relationDetail.trim() : null,
            name: newFamilyMember.name || null,
            birthDate: inputData.birthDate || null,
            birthTime: inputData.birthTime || null,
            birthPlace: inputData.birthPlace || null,
            gender: inputData.gender || null,
            calendarType: inputData.lunarToggle || null,
            timeMode: inputData.timeMode || null,
            exactTime: inputData.exactTime || null,
            birthEnvironment: inputData.birthEnvironment || null,
            birthLat: inputData.birthLat ?? null,
            birthLng: inputData.birthLng ?? null,
          },
        })
        resolvedFamilyMemberId = created.id
        targetPersonInfo = `此次预测对象为用户的${RELATION_LABELS[created.relation] || created.relation}${created.name ? `（${created.name}）` : ''}`
      } else if (familyMemberId) {
        const member = await prisma.familyMember.findFirst({ where: { id: familyMemberId, userId: userId } })
        if (!member) {
          return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
        }
        resolvedFamilyMemberId = member.id
        targetPersonInfo = `此次预测对象为用户的${RELATION_LABELS[member.relation] || member.relation}${member.name ? `（${member.name}）` : ''}`
      }
    }

    // Compute user age/gender for language-aware suggested questions.
    let userAge: number | undefined
    const birthDateStr = inputData.birthDate as string | undefined
    if (birthDateStr) {
      const birth = new Date(birthDateStr)
      if (!isNaN(birth.getTime())) {
        userAge = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      }
    }
    const userGender = (inputData.gender as string) || undefined
    const clientDate = clientTime ? new Date(clientTime) : new Date()

    const ctx: DivinationContext = {
      type, language, inputData, question, targetPersonInfo, clientDate, userAge, userGender,
    }

    // Dispatch to the correct handler (or fallback).
    const handler = selectHandler(ctx)
    const { chart, userMessage } = handler.calculate(ctx)

    // Collect calculationData for reading storage — keyed by handler.chartKey.
    const earlyCalculationDataStr = chart && handler.chartKey
      ? JSON.stringify({ [handler.chartKey]: chart })
      : null

    // Create or update pending reading.
    let pendingReadingId: string | null = preCreatedReadingId || null
    if (shouldSaveHistory && !pendingReadingId) {
      const pendingReading = await prisma.reading.create({
        data: {
          userId: userId,
          type,
          modelTier: 'model1',
          status: 'pending',
          question: question || null,
          inputData,
          result: '',
          calculationData: earlyCalculationDataStr,
          language: language || 'zh-TW',
          targetType,
          familyMemberId: resolvedFamilyMemberId,
        },
      })
      pendingReadingId = pendingReading.id
    }
    if (pendingReadingId && earlyCalculationDataStr && preCreatedReadingId) {
      prisma.reading.update({
        where: { id: pendingReadingId },
        data: { calculationData: earlyCalculationDataStr },
      }).catch(() => {})
    }

    // ═══ PAIPAN ONLY MODE ═══ — skip LLM, return raw chart, no credit deduction.
    if (paipanOnly) {
      const paipanResult: Record<string, unknown> = { paipanOnly: true, type }
      // Produce the SAME chart shape a full reading would, so the chart-only
      // view renders through the same (new) renderer instead of a legacy one.
      // handler.merge() builds the root-level fields the renderers consume
      // (and bazi/ziwei tag version:2 → V2 renderer). Handlers without a
      // version-tagging merge fall back to the raw chartKey shape their
      // renderers already expect for paipan (e.g. qimen, meihua).
      let merged = false
      if (chart && handler.merge) {
        const seed: Record<string, unknown> = {}
        try {
          handler.merge(seed, chart, ctx)
          if (seed.version === 2) {
            Object.assign(paipanResult, seed)
            merged = true
          }
        } catch (mergeErr) {
          console.error('[divination/paipan] seed-merge failed:', mergeErr)
        }
      }
      if (!merged && chart && handler.chartKey) {
        paipanResult[handler.chartKey] = chart
      }
      if (shouldSaveHistory && pendingReadingId) {
        await prisma.reading.update({
          where: { id: pendingReadingId },
          data: {
            status: 'completed',
            result: JSON.stringify(paipanResult),
            calculationData: earlyCalculationDataStr || JSON.stringify(paipanResult),
          },
        }).catch(() => {})
      }
      return NextResponse.json({
        reading: { id: pendingReadingId, result: JSON.stringify(paipanResult) },
        paipanOnly: true,
      })
    }

    // Resolve LLM config; used for OpenRouter-key guard and later logging.
    const llmConfig = await resolveLLMConfig({ endpoint: 'divination', settingsMap })
    const modelName = llmConfig.model

    if (!llmConfig.isLocalProxy && !process.env.OPENROUTER_API_KEY) {
      if (pendingReadingId) {
        await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: 'AI service not configured' } }).catch(() => {})
      }
      return NextResponse.json(
        { error: language !== 'en' ? '🔧 玄機尚未啟動，請聯繫管理員配置並重啟。' : '🔧 The oracle is not set up yet. Please contact admin to configure and restart.' },
        { status: 503 }
      )
    }

    // Build system prompt (schema + reference knowledge + language rules).
    const schema = buildHandlerSchema(handler, ctx)
    const systemPrompt = buildSystemPrompt(ctx, schema)

    const preLlmMs = Date.now() - apiStart
    const llmStart = Date.now()

    // ─── Streaming path ────────────────────────────────────────────────────
    // Opt-in via `Accept: text/event-stream`. When enabled, the route emits
    // path-tagged SSE events as the LLM produces JSON, so the client can
    // render section-by-section instead of waiting for the whole document.
    // Falls back to blocking when the configured provider is the local
    // claude-proxy (which does NOT support streaming) — a single warning
    // header lets the client know it didn't get streaming.
    const wantsStream = (req.headers.get('accept') ?? '').includes('text/event-stream')
    if (wantsStream && !llmConfig.isLocalProxy) {
      return runStreamingDivination({
        userId: userId,
        type,
        language,
        modelName,
        llmConfig,
        systemPrompt,
        userMessage,
        chart,
        handler,
        ctx,
        pendingReadingId,
        shouldSaveHistory,
        shouldSaveProfile,
        resolvedFamilyMemberId,
        targetType,
        inputData,
        apiStart,
        preLlmMs,
        llmStart,
      })
    }

    let resultText: string
    try {
      const result = await completeLLM({
        endpoint: 'divination',
        userId: userId,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        // Reuse the config already resolved above (from this request's fresh
        // settingsMap) so model / tokens / timeout / reasoning are all
        // consistent — no divergent re-resolution inside completeLLM.
        model: llmConfig.model,
        maxTokens: llmConfig.maxTokens,
        timeoutMs: llmConfig.timeoutMs,
        reasoningEffort: llmConfig.reasoningEffort,
      })
      resultText = result.content
    } catch (apiErr: unknown) {
      console.error('LLM call failed:', apiErr)
      const err = apiErr as { status?: number; message?: string }
      if (pendingReadingId) {
        await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: err?.message || 'LLM error' } }).catch(() => {})
      }
      if (llmConfig.isLocalProxy) {
        return NextResponse.json(
          { error: language !== 'en' ? `本地代理錯誤：${err?.message || '未知錯誤'}` : `Local proxy error: ${err?.message || 'Unknown'}` },
          { status: 502 }
        )
      }
      const friendlyError = language !== 'en'
        ? '🔧 玄機暫時出了點小故障，您的機緣未扣除。請稍後再試，若持續異常請聯繫管理員重啟玄機。'
        : '🔧 The oracle encountered a hiccup — your Karma was not deducted. Please try again later, or contact admin if the issue persists.'
      if (err?.status === 401 || err?.status === 402) {
        return NextResponse.json({ error: friendlyError }, { status: err.status })
      }
      if (err?.status === 429) {
        return NextResponse.json(
          { error: language !== 'en' ? '🔮 天機繁忙，請稍後再試。' : '🔮 The oracle is busy. Please try again shortly.' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: friendlyError }, { status: 502 })
    }

    // Parse + merge + validate.
    const structuredResult = parseJsonFromLLMOutput(resultText, type)

    // Hard reject #1: JSON parse + repair both failed entirely. The
    // fallback used to inject rawText into `sections.overview` to "make
    // something renderable", but that fooled the permissive validation
    // path into saving the bad payload — surfacing as raw JSON on the
    // result page. We now refuse the turn outright, no save, no credit
    // deduction. Skip merge + Zod for this case (there's no real shape).
    if (structuredResult[PARSE_FAILED_KEY] === true) {
      console.error(`[divination] LLM output unparseable type=${type} model=${modelName} latency=${Date.now() - llmStart}ms (raw len=${resultText.length})`)
      if (pendingReadingId) {
        await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: 'LLM JSON parse failed', llmRawOutput: resultText } }).catch(() => {})
      }
      const errMsg = language !== 'en'
        ? '🔧 玄機解讀格式異常，您的機緣未扣除。請重新嘗試，若持續異常請聯繫管理員。'
        : '🔧 The oracle produced an unexpected format — your Karma was not deducted. Please try again, or contact admin if the issue persists.'
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }

    if (chart && handler.merge) {
      handler.merge(structuredResult, chart, ctx)
    }
    const validation = validateHandlerOutput(handler, structuredResult)
    if (!validation.success) {
      console.error(`[divination] Zod validation issues type=${type} model=${modelName} latency=${Date.now() - llmStart}ms`, validation.issues)
      // Hard-reject #2: structurally empty output (no sections AND no
      // interpretation). This catches LLM responses that parsed as valid
      // JSON but produced nothing renderable (e.g. `{}` or only metadata).
      const hasSections = structuredResult.sections && typeof structuredResult.sections === 'object' && Object.keys(structuredResult.sections as object).length >= 1
      const hasInterpretation = !!structuredResult.interpretation
      if (!hasSections && !hasInterpretation) {
        if (pendingReadingId) {
          await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: 'Invalid LLM output format', llmRawOutput: resultText } }).catch(() => {})
        }
        const errMsg = language !== 'en'
          ? '🔧 玄機解讀格式異常，您的機緣未扣除。請重新嘗試，若持續異常請聯繫管理員。'
          : '🔧 The oracle produced an unexpected format — your Karma was not deducted. Please try again, or contact admin if the issue persists.'
        return NextResponse.json({ error: errMsg }, { status: 502 })
      }
    }

    const resultToStore = JSON.stringify(structuredResult)
    const llmPromptStr = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userMessage}`

    // CRITICAL: Save + deduct credits immediately so they complete even if client disconnects.
    const postOps: Promise<unknown>[] = [deductCredits(userId, type)]
    let savedReading: Record<string, unknown> | null = null
    if (shouldSaveHistory && pendingReadingId) {
      postOps.push(
        prisma.reading.update({
          where: { id: pendingReadingId },
          data: {
            status: 'completed',
            result: resultToStore,
            llmPrompt: llmPromptStr,
            llmRawOutput: resultText,
          },
        }).then(r => { savedReading = r })
      )
    }
    if (shouldSaveProfile && (type === 'bazi' || type === 'ziwei')) {
      const profileUpdate: Record<string, string | number | null> = {}
      if (inputData.birthDate) profileUpdate.birthDate = inputData.birthDate
      if (inputData.birthTime) profileUpdate.birthTime = inputData.birthTime
      if (inputData.birthPlace) profileUpdate.birthPlace = inputData.birthPlace
      if (inputData.gender) profileUpdate.gender = inputData.gender
      if (inputData.timeMode) profileUpdate.timeMode = inputData.timeMode
      if (inputData.exactTime) profileUpdate.exactTime = inputData.exactTime
      if (inputData.lunarToggle) profileUpdate.calendarType = inputData.lunarToggle
      if (inputData.birthEnvironment) profileUpdate.birthEnvironment = inputData.birthEnvironment
      if (inputData.birthLat != null) profileUpdate.birthLat = inputData.birthLat
      if (inputData.birthLng != null) profileUpdate.birthLng = inputData.birthLng
      if (Object.keys(profileUpdate).length > 0) {
        if (targetType === 'family' && resolvedFamilyMemberId) {
          postOps.push(prisma.familyMember.update({ where: { id: resolvedFamilyMemberId }, data: profileUpdate }))
        } else {
          postOps.push(prisma.user.update({ where: { id: userId }, data: profileUpdate }))
        }
      }
    }

    const postStart = Date.now()
    await Promise.all(postOps)
    const postLlmMs = Date.now() - postStart
    const totalMs = Date.now() - apiStart
    console.log(`[divination] type=${type} total=${totalMs}ms pre=${preLlmMs}ms llm=${postStart - llmStart}ms post=${postLlmMs}ms user=${userId}`)

    if (savedReading) {
      return NextResponse.json({ reading: Object.assign({}, savedReading, { result: resultToStore }), saved: true })
    }
    return NextResponse.json({
      reading: { id: null, result: resultToStore, type, createdAt: new Date() },
      saved: false,
    })
  } catch (e) {
    const totalMs = Date.now() - apiStart
    console.error(`[divination] ERROR total=${totalMs}ms`, e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── Streaming divination handler ──────────────────────────────────────────
//
// Mirrors the blocking POST path's "after system prompt" stage but emits
// path-tagged SSE events so the client can render section-by-section.
// Final parse / merge / Zod / DB save happens after the stream ends — the
// streaming itself is cosmetic (the LLM still has to finish before we can
// trust the output structurally), but it transforms a 60-120s blank wait
// into a continuous typing experience.
//
// SSE event vocabulary:
//   { type: 'chart_ready', chart, chartKey }    — deterministic chart up
//                                                  front, before LLM runs
//   { type: 'value_chunk', path, text }         — chars inside a string
//                                                  value at this JSON path
//   { type: 'value_done', path, value }         — value (string/number/
//                                                  bool/null) complete
//   { type: 'done', reading: { id, result } }   — final structured result
//                                                  saved, here's the full
//                                                  object (frontend uses
//                                                  this to pick up any
//                                                  merge-injected fields)
//   { type: 'error', error, status? }           — fatal error mid-stream
function runStreamingDivination(args: {
  userId: string
  type: string
  language: string
  modelName: string
  llmConfig: LLMConfig
  systemPrompt: string
  userMessage: string
  chart: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: any
  ctx: DivinationContext
  pendingReadingId: string | null
  shouldSaveHistory: boolean
  shouldSaveProfile: boolean
  resolvedFamilyMemberId: string | null
  targetType: string
  inputData: Record<string, unknown>
  apiStart: number
  preLlmMs: number
  llmStart: number
}): Response {
  const {
    userId, type, language, modelName, llmConfig, systemPrompt, userMessage,
    chart, handler, ctx, pendingReadingId, shouldSaveHistory, shouldSaveProfile,
    resolvedFamilyMemberId, targetType, inputData, apiStart, preLlmMs, llmStart,
  } = args

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          /* controller may already be closed */
        }
      }

      // Defensive: any unhandled exception inside the streaming flow used
      // to silently close the controller, leaving the client without a
      // `done` or `error` event (and thus rendering as "request timed
      // out"). Catch everything and surface it as an SSE error event so
      // the user sees a real message and the reading row is marked
      // failed.
      try {

      // Send the deterministic chart up front, but pre-merged into the
      // shape the renderer actually consumes. Just shipping `chart` raw
      // would put bazi data under `seed.bazi.*`, while V2 renderers read
      // `data.pillars`, `data.dayMaster`, `data.fiveElements`, etc. at
      // root level — those root-level fields are populated by the
      // handler.merge() call in the post-stream phase. Running merge on
      // a fresh seed object gives the frontend the SAME structure
      // immediately, so paipan / pillars / fiveElements / daYun / xiaoYun
      // / qiYun / branchRelationships / shenSha / etc. all show at t=0.
      if (chart && handler.merge) {
        const seed: Record<string, unknown> = { type, version: 2 }
        try { handler.merge(seed, chart, ctx) } catch (mergeErr) {
          console.error('[divination/stream] seed-merge failed:', mergeErr)
        }
        send({ type: 'chart_ready', seed })
      } else if (chart && handler.chartKey) {
        // Fallback for handlers without merge() (e.g. some event types):
        // attach under chartKey so the renderer can still find it.
        send({ type: 'chart_ready', seed: { type, [handler.chartKey]: chart } })
      }

      // Pipe LLM token stream through the path-aware JSON parser.
      const parser = new StreamingJsonParser()
      let accumulatedRaw = ''
      let parseError: string | null = null

      const onParserEvent = (ev: ParserEvent) => {
        if (ev.type === 'value_chunk' || ev.type === 'value_done') {
          send(ev)
        } else if (ev.type === 'error') {
          parseError = ev.error
        }
      }

      // Keep-alive: send an SSE comment every 15s to prevent proxies /
      // browsers from closing the connection during long reasoning phases
      // where no content tokens are produced.
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')) } catch { /* closed */ }
      }, 15_000)

      try {
        for await (const chunk of streamLLM({
          endpoint: 'divination',
          userId,
          systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          // Reuse the already-resolved config (see completeLLM call above).
          model: llmConfig.model,
          maxTokens: llmConfig.maxTokens,
          timeoutMs: llmConfig.timeoutMs,
          reasoningEffort: llmConfig.reasoningEffort,
        })) {
          if (chunk.type === 'content') {
            accumulatedRaw += chunk.text
            parser.push(chunk.text, onParserEvent)
          }
        }
        parser.end(onParserEvent)
      } catch (apiErr: unknown) {
        clearInterval(heartbeat)
        console.error('[divination/stream] LLM call failed:', apiErr)
        const err = apiErr as { status?: number; message?: string }
        if (pendingReadingId) {
          await prisma.reading.update({
            where: { id: pendingReadingId },
            data: { status: 'failed', result: err?.message || 'LLM error' },
          }).catch(() => {})
        }
        const friendlyError = language !== 'en'
          ? '🔧 玄機暫時出了點小故障，您的機緣未扣除。請稍後再試。'
          : '🔧 The oracle encountered a hiccup — your Karma was not deducted.'
        send({ type: 'error', error: friendlyError, status: err?.status === 429 ? 429 : 502 })
        try { controller.close() } catch { /* already closed */ }
        return
      }
      clearInterval(heartbeat)

      // ─── After-stream: parse + merge + validate + save ──────────────
      // The streaming parser was for UX only — for the FINAL go/no-go
      // decision we re-parse via parseJsonFromLLMOutput (which has repair
      // logic for truncated JSON, code-fence stripping, etc.). The
      // streaming parser is stricter than this repair step, so a
      // streaming parser error does NOT imply the document is
      // unrecoverable — we just log it for observability.
      if (parseError) {
        console.warn(`[divination/stream] streaming parser error (will rely on parseJsonFromLLMOutput repair): ${parseError}`)
      }
      const structuredResult = parseJsonFromLLMOutput(accumulatedRaw, type)

      if (structuredResult[PARSE_FAILED_KEY] === true) {
        console.error(`[divination/stream] LLM output unparseable type=${type} model=${modelName} latency=${Date.now() - llmStart}ms (raw len=${accumulatedRaw.length})`)
        if (pendingReadingId) {
          await prisma.reading.update({
            where: { id: pendingReadingId },
            data: { status: 'failed', result: 'LLM JSON parse failed', llmRawOutput: accumulatedRaw },
          }).catch(() => {})
        }
        const errMsg = language !== 'en'
          ? '🔧 玄機解讀格式異常，您的機緣未扣除。請重新嘗試。'
          : '🔧 The oracle produced an unexpected format — your Karma was not deducted.'
        send({ type: 'error', error: errMsg, status: 502 })
        controller.close()
        return
      }

      if (chart && handler.merge) {
        handler.merge(structuredResult, chart, ctx)
      }
      const validation = validateHandlerOutput(handler, structuredResult)
      if (!validation.success) {
        console.error(`[divination/stream] Zod validation issues type=${type} model=${modelName} latency=${Date.now() - llmStart}ms`, validation.issues)
        const sectionsObj = structuredResult.sections as Record<string, unknown> | undefined
        const hasSections = sectionsObj && typeof sectionsObj === 'object' && Object.keys(sectionsObj).length >= 1
        const hasInterpretation = !!structuredResult.interpretation
        if (!hasSections && !hasInterpretation) {
          if (pendingReadingId) {
            await prisma.reading.update({
              where: { id: pendingReadingId },
              data: { status: 'failed', result: 'Invalid LLM output format', llmRawOutput: accumulatedRaw },
            }).catch(() => {})
          }
          const errMsg = language !== 'en'
            ? '🔧 玄機解讀格式異常，您的機緣未扣除。請重新嘗試。'
            : '🔧 The oracle produced an unexpected format — your Karma was not deducted.'
          send({ type: 'error', error: errMsg, status: 502 })
          controller.close()
          return
        }
      }

      const resultToStore = JSON.stringify(structuredResult)
      const llmPromptStr = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userMessage}`

      const postOps: Promise<unknown>[] = [deductCredits(userId, type)]
      let savedReading: Record<string, unknown> | null = null
      if (shouldSaveHistory && pendingReadingId) {
        postOps.push(
          prisma.reading.update({
            where: { id: pendingReadingId },
            data: {
              status: 'completed',
              result: resultToStore,
              llmPrompt: llmPromptStr,
              llmRawOutput: accumulatedRaw,
            },
          }).then((r) => { savedReading = r as Record<string, unknown> })
        )
      }
      if (shouldSaveProfile && (type === 'bazi' || type === 'ziwei')) {
        const profileUpdate: Record<string, string | number | null> = {}
        const data = inputData as Record<string, unknown>
        if (typeof data.birthDate === 'string') profileUpdate.birthDate = data.birthDate
        if (typeof data.birthTime === 'string') profileUpdate.birthTime = data.birthTime
        if (typeof data.birthPlace === 'string') profileUpdate.birthPlace = data.birthPlace
        if (typeof data.gender === 'string') profileUpdate.gender = data.gender
        if (typeof data.timeMode === 'string') profileUpdate.timeMode = data.timeMode
        if (typeof data.exactTime === 'string') profileUpdate.exactTime = data.exactTime
        if (typeof data.lunarToggle === 'string') profileUpdate.calendarType = data.lunarToggle
        if (typeof data.birthEnvironment === 'string') profileUpdate.birthEnvironment = data.birthEnvironment
        if (data.birthLat != null) profileUpdate.birthLat = data.birthLat as number
        if (data.birthLng != null) profileUpdate.birthLng = data.birthLng as number
        if (Object.keys(profileUpdate).length > 0) {
          if (targetType === 'family' && resolvedFamilyMemberId) {
            postOps.push(prisma.familyMember.update({ where: { id: resolvedFamilyMemberId }, data: profileUpdate }))
          } else {
            postOps.push(prisma.user.update({ where: { id: userId }, data: profileUpdate }))
          }
        }
      }

      const postStart = Date.now()
      await Promise.all(postOps)
      const postLlmMs = Date.now() - postStart
      const totalMs = Date.now() - apiStart
      console.log(`[divination/stream] type=${type} total=${totalMs}ms pre=${preLlmMs}ms llm=${postStart - llmStart}ms post=${postLlmMs}ms user=${userId}`)

      const reading = savedReading
        ? Object.assign({}, savedReading, { result: resultToStore })
        : { id: null, result: resultToStore, type, createdAt: new Date() }
      send({ type: 'done', reading, saved: !!savedReading })
      try { controller.close() } catch { /* already closed */ }

      } catch (unexpectedErr) {
        // Top-level safety net. Log the error, but only mark reading as
        // failed if it hasn't already been saved as completed (the DB save
        // happens before send('done'), so if only the SSE delivery fails
        // due to a closed controller, the reading is already completed).
        console.error('[divination/stream] unexpected error in stream lifecycle:', unexpectedErr)
        if (pendingReadingId) {
          // Check current status before overwriting — don't clobber a completed reading
          const current = await prisma.reading.findUnique({ where: { id: pendingReadingId }, select: { status: true } }).catch(() => null)
          if (current?.status !== 'completed') {
            await prisma.reading.update({
              where: { id: pendingReadingId },
              data: { status: 'failed', result: (unexpectedErr instanceof Error ? unexpectedErr.message : 'Internal stream error') },
            }).catch(() => {})
          }
        }
        const errMsg = language !== 'en'
          ? '🔧 玄機解讀過程出現異常，您的機緣未扣除。請重新嘗試。'
          : '🔧 The oracle hit an internal error — your Karma was not deducted. Please retry.'
        send({ type: 'error', error: errMsg, status: 500 })
        try { controller.close() } catch { /* already closed */ }
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
}
