export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, deductCredits, refundMasterCredits } from '@/lib/creditService'
import { resolveLLMConfig } from '@/lib/llm'
import type { Message } from '@/lib/llm'
import { buildMasterSystemPrompt } from '@/lib/master'
import type { ToolContext } from '@/lib/master'
import { describeMoment } from '@/lib/currentMoment'
import {
  appendMasterChatMessage,
  loadMasterChatMessages,
  estimateTokens,
  getActiveSessionId,
  generateSessionId,
  deleteAllMasterChatMessages,
  archiveStaleActiveSession,
} from '@/lib/master/chatMessageStore'
import { compressHistory } from '@/lib/master/compression'
import { loadPortrait, deletePortrait } from '@/lib/master/portraitStore'
import { renderPersonalizedPrompt } from '@/lib/master/personalizedPrompt'
import { calculateGrowth } from '@/lib/growth/growthSystem'
import { checkMasterDailyLimit } from '@/lib/master/dailyLimiter'
import { runMasterTurn, type EngineEvent, type CheckinHint } from '@/lib/master/turnEngine'
import { SolarDay, SolarTime } from 'tyme4ts'
import { FUNNEL_COOKIE_NAME, verifyFunnelToken } from '@/lib/funnelSession'
import { createRequestLogger, logger } from '@/lib/logger'
import { sseResponse } from '@/lib/sse'
import * as Sentry from '@sentry/nextjs'

/**
 * Resolve the inactivity threshold (hours) after which an active master chat
 * session is silently archived on the next read. Default 24h. Set to 0 (or
 * any non-positive value) via env to disable the auto-archive behavior.
 */
const DEFAULT_STALE_HOURS = 24
function resolveStaleHours(): number {
  const raw = process.env.MASTER_SESSION_STALE_HOURS
  if (!raw) return DEFAULT_STALE_HOURS
  const n = Number(raw)
  return Number.isFinite(n) ? n : DEFAULT_STALE_HOURS
}

/**
 * Compute today's working-master temporal context: day ganzhi, current 節氣,
 * and 流年 (annual ganzhi that rolls over at 立春, not Jan 1). Used by the
 * greeting dashboard so the opening status-block reflects the Master's actual
 * timing reference.
 */
function getTemporalContext(): { dayGanZhi: string; jieQi: string; yearGanZhi: string } {
  const now = new Date()
  const solarTime = SolarTime.fromYmdHms(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  )
  const eightChar = solarTime.getLunarHour().getEightChar()
  const solarDay = SolarDay.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate())
  return {
    dayGanZhi: eightChar.getDay().getName(),
    jieQi: solarDay.getTerm().getName(),
    yearGanZhi: eightChar.getYear().getName(),
  }
}

// ---------------------------------------------------------------------------
// POST — main master chat turn.
// Flow: auth → credit check → prepare turn (history, system prompt, etc.)
// → delegate the streaming loop to runMasterTurn() → forward each engine
// event to the SSE response.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const log = createRequestLogger('master')
  try {
    // Auth: prefer NextAuth session, fall back to funnel cookie for
    // tentative users walking through View 4 (master demo) of the /start
    // ad funnel before they've set a password.
    const session = await auth()
    let userId: string | null = session?.user?.id ?? null
    if (!userId) {
      const funnel = verifyFunnelToken(req.cookies.get(FUNNEL_COOKIE_NAME)?.value)
      if (funnel) userId = funnel.userId
    }
    if (!userId) {
      return jsonError('Unauthorized', 401)
    }

    // Body shape:
    //   - { message: string }                  legacy single-message form
    //   - { messages: string[] }               debounced burst send (each
    //                                          element becomes its own user
    //                                          row, rendered as a separate
    //                                          chat bubble — feels like
    //                                          WeChat where users send 2-3
    //                                          short messages in a row before
    //                                          the master responds)
    //   - { checkin: true | CheckinHint }      proactive open: master speaks
    //                                          first, no user message
    //                                          appended this turn. `true` is
    //                                          the legacy "gap" variant; a
    //                                          string hint lets the
    //                                          activation-resume dispatcher
    //                                          ask for one of the named
    //                                          branches (cta_pending_aged /
    //                                          unanswered_user / ambiguous_resume /
    //                                          long_gap_resume).
    //   - { reflection: true }                 idle reflection: user has been
    //                                          silent in the expanded chat
    //                                          for ~90s; master scans the
    //                                          recent transcript and either
    //                                          adds a "对了…" supplementary
    //                                          bubble or quietly closes the
    //                                          beat. Fires at most once per
    //                                          silent stretch (frontend gates).
    const body = (await req.json()) as {
      message?: unknown
      messages?: unknown
      checkin?: unknown
      reflection?: unknown
      clientTime?: unknown
      tzOffsetMin?: unknown
    }
    const VALID_HINTS: readonly CheckinHint[] = [
      'gap', 'cta_pending_aged', 'unanswered_user', 'ambiguous_resume', 'long_gap_resume',
    ]
    let isCheckin = false
    let checkinHint: CheckinHint = 'gap'
    if (body.checkin === true) {
      isCheckin = true
    } else if (typeof body.checkin === 'string' && VALID_HINTS.includes(body.checkin as CheckinHint)) {
      isCheckin = true
      checkinHint = body.checkin as CheckinHint
    }
    const isReflection = body.reflection === true
    let userMessages: string[] = []
    if (Array.isArray(body.messages)) {
      userMessages = (body.messages as unknown[])
        .filter((m): m is string => typeof m === 'string')
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
    } else if (typeof body.message === 'string' && body.message.trim().length > 0) {
      userMessages = [body.message.trim()]
    }
    if (!isCheckin && !isReflection && userMessages.length === 0) {
      return jsonError('Missing message', 400)
    }
    for (const m of userMessages) {
      if (m.length > 2000) return jsonError('Message too long (max 2000)', 400)
    }

    // Credit check (not yet deducted)
    const creditCheck = await checkCredits(userId, 'master')
    if (!creditCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `✨ 機緣不足（需要 ${creditCheck.cost}，剩餘 ${creditCheck.remaining}）。前往機緣商店補充，即可繼續提問。`,
          remaining: creditCheck.remaining,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return jsonError('🔧 玄機尚未啟動，請聯繫管理員。', 503)
    }

    // Resolve user language preference + current date/time.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    })
    const lang: 'zh-TW' | 'en' = user?.language === 'en' ? 'en' : 'zh-TW'
    const clientTz = typeof body.tzOffsetMin === 'number' && Number.isFinite(body.tzOffsetMin)
      ? body.tzOffsetMin
      : null

    // Daily turn limit check (Issue #148: 控制用户每日聊天总长度)
    // Applies to user-initiated messages (exempting server-initiated checkin/reflection)
    if (!isCheckin && !isReflection) {
      const dailyLimit = await checkMasterDailyLimit(userId, lang, clientTz)
      if (!dailyLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: dailyLimit.message,
            dailyLimitReached: true,
            maxLimit: dailyLimit.maxLimit,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    // Inputs for the "now" the Master sees. The instant comes from the client
    // when present (else server clock); the timezone offset is resolved below
    // against the stored value so server-initiated turns stay correct.
    const clientInstant = typeof body.clientTime === 'string' && !Number.isNaN(Date.parse(body.clientTime))
      ? new Date(body.clientTime)
      : new Date()

    // Ensure a MasterSession row exists for this user — it tracks the
    // per-user master usage counter (totalCreditsUsed). Chat history and
    // portrait live in dedicated tables (MasterChatMessage / UserPortrait).
    // Upsert, not find-then-create: two concurrent first turns would
    // otherwise race a P2002 on the userId unique constraint into a 500.
    const masterSession = await prisma.masterSession.upsert({
      where: { userId },
      create: { userId, tzOffsetMin: clientTz ?? undefined },
      update: {},
    })

    // Resolve the timezone: this request's client offset wins; otherwise fall
    // back to the user's last-seen offset (so server-initiated check-ins are
    // still in the user's local time); finally UTC. Persist a fresh client
    // offset for future server-initiated turns.
    const tzOffsetMin = clientTz ?? masterSession.tzOffsetMin ?? 0
    if (clientTz !== null && clientTz !== masterSession.tzOffsetMin) {
      prisma.masterSession.update({ where: { userId }, data: { tzOffsetMin: clientTz } }).catch(() => {})
    }
    // Build a divination-friendly "now": local solar date + weekday + 農曆 +
    // 干支 (年/月/日) — the latter load-bearing for 流年/應期/擇日.
    const currentDateTime = describeMoment(clientInstant, tzOffsetMin).line

    // Silently archive the active session if it has been idle past the stale
    // threshold (default 24h). After this, getActiveSessionId returns null and
    // the new turn starts a fresh sessionId — same effect as if the user had
    // hit "Start new chat", but no UI surface.
    await archiveStaleActiveSession(userId, resolveStaleHours())

    // Derive sessionId from the latest active row, or generate a fresh one if
    // there are no active rows (brand new user OR just soft-reset via
    // "New chat"). The first interaction in a new session begins a fresh
    // sessionId — archived rows stay put for the audit trail / GDPR export
    // but are never re-read.
    let sessionId = await getActiveSessionId(userId)
    if (!sessionId) sessionId = generateSessionId()

    // Turn limit — prevent runaway sessions. Configurable via AdminSetting
    // 'masterMaxTurns', defaults to 50. Checkins and reflections are exempt
    // (they're system-initiated, not user-initiated).
    let currentTurnCount = 0
    if (!isCheckin && !isReflection) {
      const maxTurnsSetting = await prisma.adminSetting.findUnique({ where: { key: 'masterMaxTurns' } })
      const maxTurns = parseInt(maxTurnsSetting?.value || '50', 10) || 50
      currentTurnCount = await prisma.masterChatMessage.count({
        where: { userId, sessionId: sessionId!, role: 'user' },
      })
      if (currentTurnCount >= maxTurns) {
        const msg = lang === 'en'
          ? 'The Master needs to rest and gather his thoughts. Let\'s continue our conversation next time — start a "New Chat" whenever you\'re ready. Everything I\'ve learned about you is safely kept.'
          : '老夫今日耗神頗多，需閉目養息片刻。\n\n下次再會時，點「新對話」即可續接 —— 你說過的，我都記著。'
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    // Append each user message as its own row. A debounced burst from the
    // client arrives as `messages: [a, b, c]`; each becomes a separate user
    // bubble in history (and the LLM sees them as 3 consecutive user
    // messages, which both OpenAI and Anthropic handle natively). Skipped
    // for proactive checkins — the master speaks first, no user input.
    for (const m of userMessages) {
      await appendMasterChatMessage({
        userId,
        sessionId,
        role: 'user',
        content: m,
        tokenCount: estimateTokens(m),
      })
    }

    // Load portrait + render personalized prompt block. If portraitEnabled
    // is false or the portrait is missing/empty, personalizedPrompt stays
    // null and the system prompt composer omits the block entirely
    // (cold-start path).
    // Load portrait + render personalized prompt block with growth realm context.
    // If portraitEnabled is false or missing, growth context can still provide
    // the user's metaphysical realm to Master Xuanji.
    const [portraitRow, growthUser] = await Promise.all([
      loadPortrait(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { usageDivination: true, usageMaster: true, usageChat: true },
      }),
    ])
    const growth = growthUser ? calculateGrowth(growthUser) : null
    let personalizedPrompt: string | null = null
    if (portraitRow || growth) {
      personalizedPrompt = renderPersonalizedPrompt(
        portraitRow
          ? {
              topics: portraitRow.topics,
              preferences: portraitRow.preferences,
              lifeContext: portraitRow.lifeContext,
              toneNotes: portraitRow.toneNotes,
            }
          : null,
        lang,
        growth ? { tier: growth.tier, title: growth.currentRealm.title[lang === 'en' ? 'en' : 'zh-TW'] } : null,
      )
    }

    // Compose system prompt with progressive disclosure:
    // - Core persona + catalog + skills = stable cache prefix
    // - Personalized block = per-user
    // - Turn-type appendices = only injected when relevant (reflection/checkin/templates)
    // This maximizes prompt cache hit rate (normal messages carry zero appendix).
    const turnType = isReflection ? 'reflection' as const : isCheckin ? 'checkin' as const : 'message' as const
    let systemPrompt = buildMasterSystemPrompt({
      lang,
      currentDateTime,
      personalizedPrompt,
      turnType,
      isFirstMessage: !isCheckin && !isReflection && userMessages.length > 0,
    })

    // Proactive checkin appendix — additional per-hint context (gap duration,
    // last reading info) that the generic activation.md appendix can't know.
    if (isCheckin) {
      const checkinAppendix = await buildCheckinAppendix(userId, sessionId, lang, checkinHint)
      systemPrompt += `\n\n---\n\n${checkinAppendix}`
    }

    // Resolve the main answer model; background summarization inside
    // compressHistory resolves its own ('masterBackground') model separately.
    const { model } = await resolveLLMConfig({ endpoint: 'master' })
    const storedRows = await loadMasterChatMessages(userId, sessionId)
    const compressed = await compressHistory(storedRows, {
      userId,
      systemPrompt,
    })
    const initialMessages: Message[] = compressed.messages
    if (compressed.summarized) {
      log.info({ estimatedTokens: compressed.estimatedTokens }, 'history compressed')
    }

    // Deduct credit before streaming (matches prior behaviour). On failure
    // (engine error event) the turn is refunded via refundMasterCredits —
    // the divination hold/refund discipline applied to master (audit P4).
    const deducted = await deductCredits(userId, 'master')
    if (!deducted) return jsonError('Failed to deduct credits', 429)

    const toolCtx: ToolContext = { userId, lang, prisma }

    // Pipe the engine's event stream to SSE. The engine handles errors by
    // yielding `{ type: 'error' }` — the route never sees a thrown exception
    // from the streaming loop.
    return sseResponse(async ({ send, heartbeat, close }) => {
      // 15s keepalive — during a long first LLM call (30-90s to first token
      // with reasoning + tools) nothing else flows, and default proxy read
      // timeouts (nginx: 60s) would kill the connection mid-turn. Mirrors
      // the divination route's heartbeat.
      const keepalive = setInterval(() => heartbeat(), 15_000)
      // Failed turn → the user got nothing for the deducted credit: refund
      // once (LLM error / timeout / client abort all surface as the
      // engine's error event).
      let failureRefunded = false
      try {
        for await (const event of runMasterTurn({
          userId,
          sessionId: sessionId!,
          isCheckin,
          checkinHint,
          isReflection,
          systemPrompt,
          initialMessages,
          model,
          toolCtx,
          masterSessionPk: masterSession!.id,
          lang,
          requestId: log.requestId,
          // Client disconnected (cancel button / unmount / network drop) →
          // abort the in-flight LLM call instead of burning the full
          // tool-loop token spend into the void.
          signal: req.signal,
          turnCount: currentTurnCount + 1,
        })) {
          send(event satisfies EngineEvent)
          if (event.type === 'error' && !failureRefunded) {
            failureRefunded = true
            await refundMasterCredits(userId, log.requestId)
          }
        }
      } finally {
        clearInterval(keepalive)
        close()
      }
    })
  } catch (err) {
    log.error({ err }, 'master turn failed')
    Sentry.captureException(err, { tags: { requestId: log.requestId, endpoint: 'master' } })
    return jsonError('Internal server error', 500)
  }
}

// ---------------------------------------------------------------------------
// GET — load session history + greeting state + user flags.
// Returns:
//   - messages: chat transcript from the active (non-archived) session
//   - hasReadings / lastReading / readingTypeCounts: greeting state
//   - temporalContext: today's day ganzhi / 節氣 / 流年 for the greeting
//   - disclosureSeen: whether the user has seen the memory disclosure modal
//   - portraitEnabled: gates the personalized prompt block
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return jsonError('Unauthorized', 401)
    const userId = session.user.id

    // Load reading-state hints + user flags in parallel.
    const [userFlags, lastReading, typeCounts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { masterMemoryDisclosureSeenAt: true, portraitEnabled: true },
      }),
      prisma.reading.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { type: true, createdAt: true },
      }),
      // `targetType: 'self'` is required — the 命盤 bullet in the greeting
      // represents the user's OWN charts. Family-member readings (mom's
      // bazi, spouse's ziwei) have targetType='family' and must not count
      // here; otherwise the greeting shows 命盤 types the user thought they
      // deleted but actually still have under a family member.
      prisma.reading.groupBy({
        by: ['type'],
        where: { userId, targetType: 'self', deletedAt: null },
        _count: { _all: true },
      }),
    ])

    // Silently auto-archive a stale active session (idle > MASTER_SESSION_STALE_HOURS,
    // default 24h). Done before the active-session lookup so the widget receives
    // an empty transcript and renders its templated greeting — no modal, no prompt.
    await archiveStaleActiveSession(userId, resolveStaleHours())

    // Load active session messages from MasterChatMessage. If no active
    // session, return empty (widget will render greeting). For each
    // assistant row, materialize any CTA / reading-card messages from the
    // persisted `toolCallsJson` so they survive a page refresh — without
    // this they vanish (cards aren't separate rows; they live inside the
    // assistant turn's tool-call payload).
    const activeSessionId = await getActiveSessionId(userId)
    type LoadedMsg = {
      role: string
      content: string
      timestamp: string
      kind?: 'text' | 'cta_card' | 'reading_card'
      ctaPayload?: unknown
      readingCardPayload?: unknown
    }
    let messages: LoadedMsg[] = []
    if (activeSessionId) {
      const rows = await loadMasterChatMessages(userId, activeSessionId)
      messages = rows
        .filter((r) => r.role === 'user' || r.role === 'assistant')
        .flatMap((r) => {
          const base: LoadedMsg = {
            role: r.role,
            content: r.content ?? '',
            timestamp: r.createdAt.toISOString(),
            kind: 'text',
          }
          if (r.role !== 'assistant' || !r.toolCallsJson) return [base]
          const cards = extractCardsFromToolCalls(r.toolCallsJson, r.createdAt)
          return cards.length > 0 ? [base, ...cards] : [base]
        })
    }

    const readingTypeCounts: Record<string, number> = {}
    for (const row of typeCounts) {
      readingTypeCounts[row.type] = row._count._all
    }

    return jsonResponse({
      messages,
      hasReadings: lastReading != null,
      lastReading: lastReading
        ? { type: lastReading.type, createdAt: lastReading.createdAt.toISOString() }
        : null,
      readingTypeCounts,
      temporalContext: getTemporalContext(),
      disclosureSeen: userFlags?.masterMemoryDisclosureSeenAt != null,
      portraitEnabled: userFlags?.portraitEnabled ?? true,
    })
  } catch (err) {
    logger.error({ err, endpoint: 'master', method: 'GET' }, 'master history load failed')
    return jsonError('Internal server error', 500)
  }
}

// ---------------------------------------------------------------------------
// DELETE — clear all master state for the current user:
//   - all MasterChatMessage rows (chat history, both active and archived)
//   - UserPortrait + all UserPortraitHistory rows
//   - MasterSession usage-counter row
//   - Resets masterMemoryDisclosureSeenAt so the disclosure shows again
// Called by the profile page's "Delete all memory" action. The user's
// divination readings and profile are NOT touched.
// ---------------------------------------------------------------------------
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return jsonError('Unauthorized', 401)
    const userId = session.user.id

    await Promise.all([
      deleteAllMasterChatMessages(userId),
      deletePortrait(userId),
      prisma.masterSession.deleteMany({ where: { userId } }),
    ])

    // Reset the disclosure flag so the user sees the modal next time
    // (they may want to opt-out after a clean slate).
    await prisma.user.update({
      where: { id: userId },
      data: { masterMemoryDisclosureSeenAt: null },
    })

    return jsonResponse({ success: true })
  } catch (err) {
    logger.error({ err, endpoint: 'master', method: 'DELETE' }, 'master memory delete failed')
    return jsonError('Internal server error', 500)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Walk a persisted `toolCallsJson` payload and return any card messages it
 * implies — `prefill_divination_form` → `cta_card`, `show_reading_card` →
 * `reading_card`. Failed tool calls are skipped. Used by GET to rehydrate
 * cards that wouldn't otherwise survive a page refresh.
 */
function extractCardsFromToolCalls(
  toolCallsJson: string,
  rowCreatedAt: Date,
): Array<{
  role: string
  content: string
  timestamp: string
  kind: 'cta_card' | 'reading_card'
  ctaPayload?: unknown
  readingCardPayload?: unknown
}> {
  try {
    const calls = JSON.parse(toolCallsJson) as Array<{
      name: string
      result?: { ok?: boolean; data?: unknown }
    }>
    if (!Array.isArray(calls)) return []
    const out: Array<{
      role: string
      content: string
      timestamp: string
      kind: 'cta_card' | 'reading_card'
      ctaPayload?: unknown
      readingCardPayload?: unknown
    }> = []
    for (const c of calls) {
      if (!c?.result?.ok || !c.result.data || typeof c.result.data !== 'object') continue
      if (c.name === 'prefill_divination_form') {
        out.push({
          role: 'assistant',
          content: '',
          timestamp: rowCreatedAt.toISOString(),
          kind: 'cta_card',
          ctaPayload: c.result.data,
        })
      } else if (c.name === 'show_reading_card') {
        out.push({
          role: 'assistant',
          content: '',
          timestamp: rowCreatedAt.toISOString(),
          kind: 'reading_card',
          readingCardPayload: c.result.data,
        })
      }
    }
    return out
  } catch {
    return []
  }
}

/**
 * Format a millisecond duration as a coarse zh-TW phrase ("3 小時"、"2 天").
 */
function formatHumanGap(ms: number): string {
  const hours = ms / (60 * 60 * 1000)
  if (hours < 1) return '不到一小時'
  if (hours < 24) return `${Math.round(hours)} 小時`
  const days = Math.round(hours / 24)
  return `${days} 天`
}

const READING_TYPE_ZH: Record<string, string> = {
  bazi: '八字',
  ziwei: '紫微',
  iching: '易經',
  qimen: '奇門',
  liuyao: '六爻',
  meihua: '梅花易數',
  fengshui: '風水',
}
const READING_TYPE_EN: Record<string, string> = {
  bazi: 'BaZi',
  ziwei: 'Zi Wei',
  iching: 'I Ching',
  qimen: 'Qi Men',
  liuyao: 'Liu Yao',
  meihua: 'Mei Hua',
  fengshui: 'Feng Shui',
}

/**
 * Build the proactive-checkin appendix that gets glued to the system prompt
 * when `checkin: true`. Pulls together every signal the master might want
 * to use as an opener anchor:
 *   - gap since the last assistant turn (this session)
 *   - today's day ganzhi / 節氣 / 流年
 *   - the user's most recent saved reading (type + age)
 *
 * The master gets the data — what to USE is left to the model. The
 * directive at the top tells it to pick ONE anchor and open with 1-2
 * short bubbles, not lecture.
 */
/**
 * Build the reflection appendix glued to the system prompt when
 * `reflection: true`. Pure synchronous — the persona section in
 * master.md does the heavy lifting (quality bar, output shape, "skip
 * if nothing to add" rule). The appendix's job is just to inject the
 * buildReflectionAppendix removed — reflection rules now loaded from
 * divination-refs/master-appendices/reflection.md via buildSystemPrompt's
 * progressive disclosure (turnType='reflection').
 */

/**
 * Per-hint appendix for `cta_pending_aged` / `unanswered_user` /
 * `ambiguous_resume` / `long_gap_resume`. These mirror the persona's
 * "## Activation" section — the appendix is the per-turn nudge that points
 * at the right branch and supplies any concrete data the master needs (gap,
 * recent reading) without re-stating the rules already in master.md.
 */
function buildActivationAppendix(
  hint: CheckinHint,
  lang: 'zh-TW' | 'en',
  ctx: { gapStr: string | null; lastReadingLine: string | null },
): string {
  const { gapStr, lastReadingLine } = ctx
  if (lang === 'en') {
    if (hint === 'cta_pending_aged') {
      return [
        '## Activation — CTA pending',
        `The user previously received a divination CTA card${gapStr ? ` (~${gapStr} ago)` : ''} but never finished the reading. They just reopened the chat.`,
        '',
        'Do ONE thing: ask in a single short bubble whether they still want that reading. If they hesitate, offer to talk about their question with the data you already have. **Never re-emit the same CTA.**',
      ].join('\n')
    }
    if (hint === 'unanswered_user') {
      return [
        '## Activation — unanswered user message',
        'The last message in the transcript is the user\'s, and you never replied. Treat it as just-arrived.',
        '',
        'Answer it directly. No apology preamble, no "sorry I missed that". A short "About your X — " is fine if it helps anchor the answer.',
      ].join('\n')
    }
    if (hint === 'long_gap_resume') {
      return [
        '## Activation — long gap',
        `It has been ${gapStr ?? 'a long time'} since you last spoke. The old thread is cold; do NOT pick it up.`,
        '',
        lastReadingLine
          ? `Anchor on something present: their most recent reading **${lastReadingLine}**, today's 節氣, or 流年.`
          : "Anchor on something present: today's 節氣 / 流年, or ask one focused question.",
        '',
        'One short greeting + one focused question. No "welcome back!" customer-service tone.',
      ].join('\n')
    }
    // ambiguous_resume
    return [
      '## Activation — ambiguous resume',
      'The user reopened the chat but there is no obvious thread to pick up.',
      '',
      'Scan the last 3-5 turns. If you find ONE specific thing worth saying → 1-2 short bubbles. If nothing → one short closing line ("Welcome back — I\'ll be here.") and stop. Same rule as reflection: empty filler is worse than a silent stop.',
    ].join('\n')
  }
  // zh-TW
  if (hint === 'cta_pending_aged') {
    return [
      '## 主動詢問 — CTA 待完成',
      `用戶之前收過一張占卜引導卡片${gapStr ? `（約 ${gapStr}前）` : ''}，但沒完成排盤就走了。剛剛他重新打開對話。`,
      '',
      '只做一件事：用一句短氣泡問他**是否還想做那盤**。如果他猶豫 → 提議「先講您的問題，我看現有資料能不能直接給方向」。**禁止再次發出同一張 CTA**。',
    ].join('\n')
  }
  if (hint === 'unanswered_user') {
    return [
      '## 主動接住 — 你欠用戶一個回覆',
      '對話的最後一條是用戶發的，你從未回覆。當作剛剛才收到，正常回應。',
      '',
      '直接答。不要「不好意思讓您等」這種致歉開場 — 用戶要的是內容，不是客服話術。如果需要對位，開頭可以加一句「您剛才問的 X — 」，僅此。',
    ].join('\n')
  }
  if (hint === 'long_gap_resume') {
    return [
      '## 主動開場 — 久違',
      `距上次對話已 ${gapStr ?? '很久'}。舊話題太遠，**別接**。`,
      '',
      lastReadingLine
        ? `找個今天的錨點：他最近一張命盤 **${lastReadingLine}**、節氣、或流年。`
        : '找個今天的錨點：節氣、流年，或問一個聚焦的問題。',
      '',
      '一句短打招呼 + 一個聚焦問題即可。**禁止**「歡迎回來！」這種客服腔。',
    ].join('\n')
  }
  // ambiguous_resume
  return [
    '## 主動續話 — 找一個值得補的點',
    '用戶重新打開對話，但沒有明顯的話頭可接。',
    '',
    '掃最近 3-5 輪。**找到一個具體值得補的東西** → 1-2 個短氣泡。**找不到** → 一句短結尾（「嗯，您回來了。有事再說。」）打住。規則同 reflection：empty 比 filler 好。',
  ].join('\n')
}

async function buildCheckinAppendix(
  userId: string,
  sessionId: string,
  lang: 'zh-TW' | 'en',
  hint: CheckinHint = 'gap',
): Promise<string> {
  // 1) Gap since last assistant turn in this session.
  let gapStr: string | null = null
  try {
    const rows = await loadMasterChatMessages(userId, sessionId)
    const lastAssistant = [...rows]
      .reverse()
      .find((r) => r.role === 'assistant')
    if (lastAssistant) {
      gapStr = formatHumanGap(Date.now() - lastAssistant.createdAt.getTime())
    }
  } catch {
    /* best-effort */
  }

  // 2) Today's temporal context (day ganzhi, 節氣, 流年).
  const temporal = (() => {
    try {
      return getTemporalContext()
    } catch {
      return null
    }
  })()

  // 3) Most recent saved reading (any type, target self OR family).
  let lastReadingLine: string | null = null
  try {
    const last = await prisma.reading.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { type: true, createdAt: true, targetType: true },
    })
    if (last) {
      const ageStr = formatHumanGap(Date.now() - last.createdAt.getTime())
      const typeName =
        lang === 'en'
          ? READING_TYPE_EN[last.type] ?? last.type
          : READING_TYPE_ZH[last.type] ?? last.type
      const target = last.targetType === 'family' ? '（家人）' : ''
      lastReadingLine = `${typeName}${target}・${ageStr}前`
    }
  } catch {
    /* best-effort */
  }

  // Hint variants from the activation-resume dispatcher delegate to a
  // dedicated appendix (one per branch). The legacy `gap` path stays as the
  // generic three-anchor "proactive open" below for backwards compatibility.
  if (hint !== 'gap') {
    return buildActivationAppendix(hint, lang, { gapStr, lastReadingLine })
  }

  if (lang === 'en') {
    const lines: string[] = ['## Proactive open']
    lines.push(
      `User just opened the chat window without typing${gapStr ? ` (last reply ~${gapStr} ago)` : ''}.`,
    )
    lines.push('Open with ONE anchor + 1-2 short bubbles. Pick whichever fits naturally:')
    if (gapStr && gapStr !== '不到一小時') {
      lines.push('- Resume an unfinished thread from earlier — ask how it turned out.')
    }
    if (lastReadingLine) {
      lines.push(`- Their most recent reading: **${lastReadingLine}** — touch on it if relevant.`)
    }
    if (temporal) {
      lines.push(
        `- Today: day ${temporal.dayGanZhi}, 節氣 ${temporal.jieQi}, 流年 ${temporal.yearGanZhi} — use only if it actually relates to them.`,
      )
    }
    lines.push('- Otherwise: short greeting + one focused question.')
    lines.push(
      '\n**Hard rules**: 1-2 bubbles MAX. Never list tool names. Never restate chart contents in prose. Pick ONE anchor; do not enumerate the bullet list above to the user.',
    )
    return lines.join('\n')
  }

  const lines: string[] = ['## 主動開場']
  lines.push(
    `用戶剛打開對話視窗，還沒打字${gapStr ? `（距上次對話約 ${gapStr}）` : ''}。`,
  )
  lines.push('挑一個錨點，發 1-2 個短氣泡開場。從下面選一條最自然的：')
  if (gapStr && gapStr !== '不到一小時') {
    lines.push('- 接住之前沒收尾的話題 — 問問結果。')
  }
  if (lastReadingLine) {
    lines.push(`- 用戶最近一次占卜：**${lastReadingLine}** — 有合適切入點就用。`)
  }
  if (temporal) {
    lines.push(
      `- 今天：日柱 ${temporal.dayGanZhi}、節氣 ${temporal.jieQi}、流年 ${temporal.yearGanZhi} — 只有真的跟他相關才用，別生硬硬貼。`,
    )
  }
  lines.push('- 都沒合適的 → 短打招呼 + 一個聚焦的問題。')
  lines.push(
    '\n**硬規則**：最多 1-2 個氣泡。不要羅列工具名。不要把命盤內容寫進對話。**只挑一個錨點**，不要把上面的選項列給用戶看。',
  )
  return lines.join('\n')
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      // Greeting data (reading counts, temporalContext) must never be cached
      // — stale counts leave the widget showing 命盤 types the user already
      // deleted.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
