export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, deductCredits } from '@/lib/rateLimit'
import { resolveLLMConfig } from '@/lib/llm'
import type { Message } from '@/lib/llm'
import { buildMasterSystemPrompt } from '@/lib/master'
import type { ToolContext } from '@/lib/master'
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
import { runMasterTurn, type EngineEvent } from '@/lib/master/turnEngine'
import { SolarDay, SolarTime } from 'tyme4ts'
import { FUNNEL_COOKIE_NAME, verifyFunnelToken } from '@/lib/funnelSession'

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
    //   - { checkin: true }                    proactive open: master speaks
    //                                          first, no user message
    //                                          appended this turn
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
    }
    const isCheckin = body.checkin === true
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
    const currentDateTime = new Date().toISOString()

    // Ensure a MasterSession row exists for this user — it tracks the
    // per-user master usage counter (totalCreditsUsed). Chat history and
    // portrait live in dedicated tables (MasterChatMessage / UserPortrait).
    let masterSession = await prisma.masterSession.findUnique({ where: { userId } })
    if (!masterSession) {
      masterSession = await prisma.masterSession.create({ data: { userId } })
    }

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
    const portraitRow = await loadPortrait(userId)
    let personalizedPrompt: string | null = null
    if (portraitRow) {
      personalizedPrompt =
        portraitRow.generatedPrompt ??
        renderPersonalizedPrompt(
          {
            topics: portraitRow.topics,
            preferences: portraitRow.preferences,
            lifeContext: portraitRow.lifeContext,
            toneNotes: portraitRow.toneNotes,
          },
          lang,
        )
    }

    // Compose system prompt from persona + registry catalogs + personalized
    // block + dynamic ctx.
    let systemPrompt = buildMasterSystemPrompt({
      lang,
      currentDateTime,
      personalizedPrompt,
    })

    // Proactive checkin appendix — when the master is the one initiating the
    // turn (no user message), nudge it to open with one short, contextual
    // bubble instead of waiting for the user. We gather concrete anchors
    // (gap, today's 節氣/流年, last reading) so the master can pick a
    // natural opener instead of generic small talk. Falls through silently
    // if not a checkin (the model never sees the appendix).
    if (isCheckin) {
      const checkinAppendix = await buildCheckinAppendix(userId, sessionId, lang)
      systemPrompt += `\n\n---\n\n${checkinAppendix}`
    }

    // Reflection appendix — fires when the user has been silent inside an
    // expanded chat for ~90s. The frontend rate-gates this (at most one
    // reflection per silent stretch — see master-interaction-features.md).
    // The appendix tells the master: scan the last few turns, find ONE
    // worthwhile follow-up, OR if nothing genuine to add, just emit a
    // short closing line. The persona's "Reflection" section in
    // master.md handles the quality bar.
    if (isReflection) {
      systemPrompt += `\n\n---\n\n${buildReflectionAppendix(lang)}`
    }

    // Resolve model + initial messages (history compressed if needed).
    const { model } = await resolveLLMConfig({ endpoint: 'master' })
    const storedRows = await loadMasterChatMessages(userId, sessionId)
    const compressed = await compressHistory(storedRows, {
      userId,
      systemPrompt,
      model,
    })
    const initialMessages: Message[] = compressed.messages
    if (compressed.summarized) {
      console.log(`[master] history compressed (~${compressed.estimatedTokens} tokens)`)
    }

    // Deduct credit before streaming (matches prior behaviour).
    const deducted = await deductCredits(userId, 'master')
    if (!deducted) return jsonError('Failed to deduct credits', 429)

    const toolCtx: ToolContext = { userId, lang, prisma }

    // Pipe the engine's event stream to SSE. The engine handles errors by
    // yielding `{ type: 'error' }` — the route never sees a thrown exception
    // from the streaming loop.
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: EngineEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        try {
          for await (const event of runMasterTurn({
            userId,
            sessionId: sessionId!,
            isCheckin,
            isReflection,
            systemPrompt,
            initialMessages,
            model,
            toolCtx,
            masterSessionPk: masterSession!.id,
            lang,
          })) {
            send(event)
          }
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
    console.error('[master] GET error:', err)
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
    console.error('[master] DELETE error:', err)
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
 * `[reflection_trigger]` framing at the right place.
 *
 * Why no DB calls (unlike checkin): reflection happens within an
 * already-active session. The master can read the chat history that's
 * already being passed in `currentMessages` — no extra anchors needed.
 */
function buildReflectionAppendix(lang: 'zh-TW' | 'en'): string {
  if (lang === 'en') {
    return [
      '## Reflection moment',
      "The user has gone quiet in the expanded chat. They haven't left — they're still looking at the screen — but something stopped them from typing.",
      '',
      'Scan the last 3-5 turns. Find ONE specific thing worth a short follow-up:',
      '- A thread you opened but didn\'t close',
      '- A chart element you cited but didn\'t fully connect',
      '- An indirect question they asked that you answered around, not at',
      '',
      "If you find one → open with `对了` or its English equivalent (\"One more thing —\"), 1-2 short bubbles, end with a soft invitation OR a quiet stop. NEVER ask a generic open-ended question.",
      '',
      "If you find NOTHING genuinely worth saying → emit a single short closing line (\"I'll wait — let me know if anything comes up.\") and stop. Do NOT manufacture a topic to fill silence.",
      '',
      '**Hard rules**: Max 2 bubbles. No greeting. No summary of what you\'ve said. Treat this as your only shot — if the user doesn\'t reply, no further reflection comes.',
    ].join('\n')
  }
  return [
    '## 反思時刻',
    '用戶在展開的對話裡停了下來。他沒走 — 螢幕還在 — 但有什麼讓他暫時不想打字。',
    '',
    '掃一眼最近的 3-5 輪對話，找一個**具體**值得補的東西：',
    '- 你開了個話頭沒收尾',
    '- 你引用了某個命盤元素但沒完全把意思講透',
    '- 用戶其實在問 X，但你答的是 X 旁邊的東西',
    '',
    '找到了 → 開頭用「對了」或「我再想了一下」，**1-2 個短氣泡**，結尾留個軟邀請或安靜停住。**不要**問「還有什麼想問的嗎」這種泛問。',
    '',
    '**找不到值得補的東西** → 就一句短結尾（「先這樣，你想到什麼再說。」）打住。不要硬擠話題填靜默。',
    '',
    '**硬規則**：最多 2 個氣泡。不要打招呼，不要總結你已經說過的，不要羅列工具名。當作這是你唯一一次機會 — 用戶若不回覆，後續不會再反思。',
  ].join('\n')
}

async function buildCheckinAppendix(
  userId: string,
  sessionId: string,
  lang: 'zh-TW' | 'en',
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
