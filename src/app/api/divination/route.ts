export const dynamic = 'force-dynamic'
// Allow long-running LLM calls (up to 10 minutes)
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits } from '@/lib/creditService'
import { completeLLM, streamLLM, resolveLLMConfig } from '@/lib/llm'
import type { LLMConfig } from '@/lib/llm'
import { selectHandler, buildHandlerSchema, type DivinationContext } from './handlers'
import { buildSystemPrompt } from './handlers/_systemPrompt'
import { finalizeDivination } from './_finalize'
import { markFailed } from '@/lib/readings/lifecycle'
import { sseResponse } from '@/lib/sse'

// Ask the provider for JSON-constrained decoding (OpenAI-style response_format,
// forwarded by OpenRouter). Prevents the malformed-JSON class at the source;
// the parse/repair ladder stays as defense-in-depth. Providers that reject the
// param trigger one automatic retry without it (see lib/llm), so this is safe
// to default ON. Escape hatch: DIVINATION_JSON_MODE=off.
const DIVINATION_RESPONSE_FORMAT: { type: 'json_object' } | undefined =
  process.env.DIVINATION_JSON_MODE === 'off' ? undefined : { type: 'json_object' }
import { StreamingJsonParser, type ParserEvent } from './handlers/_streamingJsonParser'
import { FUNNEL_COOKIE_NAME, verifyFunnelToken } from '@/lib/funnelSession'
import { createRequestLogger, type RequestLogger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

const RELATION_LABELS: Record<string, string> = {
  spouse: '配偶', father: '父亲', mother: '母亲', son: '儿子', daughter: '女儿',
  brother: '兄弟', sister: '姐妹', friend: '朋友', other: '其他',
}

export async function POST(req: NextRequest) {
  const apiStart = Date.now()
  // One requestId for this request's whole life: every JSON log line below
  // and the LlmLog DB row carry it, so a single id reconstructs the flow.
  const log = createRequestLogger('divination')
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

    // A pre-created `readingId` (normal flow via /api/divination/init, and the ad
    // funnel View 3) lets this request skip the credit + maintenance gates (init
    // already enforced them) and targets that row for the final write. It MUST
    // therefore be validated EVERY time it's present — not only when type/inputData
    // are absent. Otherwise a caller could pass an arbitrary or another user's id
    // alongside their own type/inputData to (a) bypass the credit check entirely
    // and (b) overwrite the victim's reading (IDOR). Require: owned by the caller
    // AND still pending (so a completed reading can't be replayed for a free run).
    let holdAmount = 0 // credits held at /init (0 = legacy deduct-on-success flow)
    if (preCreatedReadingId) {
      const row = await prisma.reading.findFirst({
        where: { id: preCreatedReadingId, userId },
        select: { type: true, inputData: true, status: true, creditsHeld: true },
      })
      if (!row || row.status !== 'pending') {
        return NextResponse.json({ error: 'Reading not found' }, { status: 404 })
      }
      type = type ?? row.type
      inputData = inputData ?? row.inputData
      holdAmount = row.creditsHeld
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
      // Per-endpoint overrides resolveLLMConfig reads first for endpoint
      // 'divination' (see SETTING_KEYS in lib/llm/settings.ts). These were
      // missing, so admin-configured per-function timeout/max-tokens were
      // silently ignored and only the global llm* fallbacks took effect.
      'divinationMaxTokens',
      'divinationTimeoutSeconds',
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
          log.error({ err: mergeErr, phase: 'paipan' }, 'seed-merge failed')
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
        await markFailed(pendingReadingId, { reason: 'AI service not configured' })
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
        log,
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
        holdAmount,
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
        responseFormat: DIVINATION_RESPONSE_FORMAT,
        requestId: log.requestId,
      })
      resultText = result.content
    } catch (apiErr: unknown) {
      log.error({ err: apiErr, type, model: modelName }, 'llm call failed')
      const err = apiErr as { status?: number; message?: string }
      if (pendingReadingId) {
        await markFailed(pendingReadingId, { reason: err?.message || 'LLM error' })
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

    // Parse + merge + validate + save + settle credits — the single shared
    // pipeline (also used by the streaming path). See _finalize.ts.
    const llmMs = Date.now() - llmStart
    const outcome = await finalizeDivination({
      rawText: resultText, type, language, modelName, handler, chart, ctx,
      userId, pendingReadingId, shouldSaveHistory, shouldSaveProfile,
      resolvedFamilyMemberId, targetType, inputData, systemPrompt, userMessage,
      llmStart, holdAmount, log,
    })
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.errMsg }, { status: outcome.status })
    }

    const totalMs = Date.now() - apiStart
    log.info({ type, totalMs, preMs: preLlmMs, llmMs, postMs: outcome.postLlmMs, userId }, 'reading completed')
    return NextResponse.json({ reading: outcome.reading, saved: outcome.saved })
  } catch (e) {
    const totalMs = Date.now() - apiStart
    log.error({ err: e, totalMs }, 'divination request failed')
    Sentry.captureException(e, { tags: { requestId: log.requestId, endpoint: 'divination' } })
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
  holdAmount: number
  log: RequestLogger
}): Response {
  const {
    userId, type, language, modelName, llmConfig, systemPrompt, userMessage,
    chart, handler, ctx, pendingReadingId, shouldSaveHistory, shouldSaveProfile,
    resolvedFamilyMemberId, targetType, inputData, apiStart, preLlmMs, llmStart,
    holdAmount, log,
  } = args

  return sseResponse(async ({ send, heartbeat: sendHeartbeat, close }) => {
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
          log.error({ err: mergeErr, phase: 'stream' }, 'seed-merge failed')
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
      const heartbeat = setInterval(sendHeartbeat, 15_000)

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
          responseFormat: DIVINATION_RESPONSE_FORMAT,
          requestId: log.requestId,
        })) {
          if (chunk.type === 'content') {
            accumulatedRaw += chunk.text
            parser.push(chunk.text, onParserEvent)
          }
        }
        parser.end(onParserEvent)
      } catch (apiErr: unknown) {
        clearInterval(heartbeat)
        log.error({ err: apiErr, type, model: modelName, phase: 'stream' }, 'llm call failed')
        const err = apiErr as { status?: number; message?: string }
        if (pendingReadingId) {
          await markFailed(pendingReadingId, { reason: err?.message || 'LLM error' })
        }
        const friendlyError = language !== 'en'
          ? '🔧 玄機暫時出了點小故障，您的機緣未扣除。請稍後再試。'
          : '🔧 The oracle encountered a hiccup — your Karma was not deducted.'
        send({ type: 'error', error: friendlyError, status: err?.status === 429 ? 429 : 502 })
        close()
        return
      }
      clearInterval(heartbeat)

      // ─── After-stream: the same shared pipeline as the blocking path ──
      // The streaming parser was for UX only — the FINAL go/no-go decision
      // happens inside finalizeDivination (which re-parses with the full
      // repair ladder). A streaming parser error therefore does NOT imply
      // the document is unrecoverable — just log it for observability.
      if (parseError) {
        log.warn({ parseError, phase: 'stream' }, 'streaming parser error (final parse will repair)')
      }
      const llmMs = Date.now() - llmStart
      const outcome = await finalizeDivination({
        rawText: accumulatedRaw, type, language, modelName, handler, chart, ctx,
        userId, pendingReadingId, shouldSaveHistory, shouldSaveProfile,
        resolvedFamilyMemberId, targetType, inputData, systemPrompt, userMessage,
        llmStart, holdAmount, log, phase: 'stream',
      })
      if (!outcome.ok) {
        send({ type: 'error', error: outcome.errMsg, status: outcome.status })
        close()
        return
      }

      const totalMs = Date.now() - apiStart
      log.info({ type, totalMs, preMs: preLlmMs, llmMs, postMs: outcome.postLlmMs, userId, phase: 'stream' }, 'reading completed')

      send({ type: 'done', reading: outcome.reading, saved: outcome.saved })
      close()

      } catch (unexpectedErr) {
        // Top-level safety net. Log the error, but only mark reading as
        // failed if it hasn't already been saved as completed (the DB save
        // happens before send('done'), so if only the SSE delivery fails
        // due to a closed controller, the reading is already completed).
        log.error({ err: unexpectedErr, phase: 'stream' }, 'unexpected error in stream lifecycle')
        Sentry.captureException(unexpectedErr, { tags: { requestId: log.requestId, endpoint: 'divination' } })
        if (pendingReadingId) {
          // markFailed never clobbers a completed reading (the DB save happens
          // before send('done'), so an SSE-delivery failure after save leaves
          // the completed row — and its kept hold — untouched).
          await markFailed(pendingReadingId, {
            reason: unexpectedErr instanceof Error ? unexpectedErr.message : 'Internal stream error',
          })
        }
        const errMsg = language !== 'en'
          ? '🔧 玄機解讀過程出現異常，您的機緣未扣除。請重新嘗試。'
          : '🔧 The oracle hit an internal error — your Karma was not deducted. Please retry.'
        send({ type: 'error', error: errMsg, status: 500 })
        close()
      }
  })
}
