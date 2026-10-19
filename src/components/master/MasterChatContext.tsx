'use client'

/**
 * MasterChatProvider — global state + SSE streaming for the Xuanji Master
 * chat widget. Mounted once at the root layout so state survives navigation.
 *
 * Responsibilities:
 *   - Load + persist session transcript via /api/master GET/POST.
 *   - Parse SSE events (content, tool_start, tool_end, cta_card, done, error).
 *   - Handle the divination-completion handoff: listens for the
 *     `xuanji:readingComplete` window event dispatched by the divination
 *     page, then auto-injects a synthetic user turn so the master can pull
 *     the new reading into context.
 *   - Expose the widget shape (collapsed / expanded) as global state so any
 *     component (e.g. a CTA in a divination result) could trigger an expand.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import { publish, subscribe } from '@/lib/events'
import { splitBubbles, BUBBLE_MARKER } from '@/lib/master/bubbleStream'
import { pickOpener } from '@/lib/master/greetings'
import {
  findLatestPendingCTA,
  isClosed as isConversationClosed,
  type DetectableMsg,
} from '@/lib/master/activationDetect'
import type { CheckinHint } from '@/lib/master/turnEngine'
import { T } from '@/lib/i18n'

// Activation-resume thresholds (module-level: stable across renders).
const CTA_AGED_THRESHOLD_MS = 30 * 60 * 1000 // CTA pending past this → ask user
const LONG_GAP_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000 // >14 days → long_gap_resume

// ---------------------------------------------------------------------------
// Message shapes used inside the widget transcript
// ---------------------------------------------------------------------------

export interface CtaCardPayload {
  url: string
  ctaLabel: string
  ctaTitle: string
  ctaDescription: string
  divinationType: string
  /** Structured context for richer card rendering. */
  ctaContext?: {
    target?: string       // e.g. "為自己" / "為配偶 張三"
    birthDate?: string    // e.g. "1988-09-17"
    birthTime?: string    // e.g. "亥時" / "22:30"
    gender?: string       // e.g. "男" / "女"
    birthPlace?: string   // e.g. "北京"
    question?: string     // only for event-type divinations
  }
}

/**
 * Payload emitted when the master calls `show_reading_card`. Renders as a
 * clickable reference card distinct from the CTA card (this points to an
 * existing reading; CTA points to a new-reading form).
 */
export interface ReadingCardPayload {
  readingId: string
  divinationType: string
  title: string
  subtitle: string
  url: string
  note?: string
}

export interface MasterMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  /** Optional special-rendering kind. Default is text. */
  kind?: 'text' | 'cta_card' | 'reading_card' | 'greeting' | 'system_note' | 'feedback_prompt' | 'limit_notice'
  ctaPayload?: CtaCardPayload
  readingCardPayload?: ReadingCardPayload
  feedbackPromptReason?: 'slow_response' | 'milestone' | 'timeout'
  turnDurationMs?: number
}

export interface ToolStatus {
  name: string
  label: string
}

// ---------------------------------------------------------------------------
// Reading-completion handoff note
// ---------------------------------------------------------------------------
// When a CTA-triggered reading finishes, we send the master an internal
// synthetic turn ("[占卜完成] <type> ... (id: ...)。請重新檢查…") so it can pull
// the new reading into context. That raw text is plumbing — it embeds the
// reading id and re-check instructions meant for the LLM, not the user. In the
// transcript we surface only a clean, type-specific completion note rendered as
// a centered system note (never a user bubble).
const READING_COMPLETE_NOTE: Record<string, { zh: string; en: string }> = {
  bazi: { zh: '八字命盤已完成', en: 'BaZi reading complete' },
  ziwei: { zh: '紫微命盤已完成', en: 'Zi Wei reading complete' },
  iching: { zh: '易經占卜已完成', en: 'I Ching reading complete' },
  qimen: { zh: '奇門遁甲已完成', en: 'Qi Men reading complete' },
  liuyao: { zh: '六爻占卜已完成', en: 'Liu Yao reading complete' },
  meihua: { zh: '梅花易數已完成', en: 'Mei Hua reading complete' },
  fengshui: { zh: '風水分析已完成', en: 'Feng Shui reading complete' },
  other: { zh: '占卜已完成', en: 'Reading complete' },
}

function readingCompleteNoteText(type: string, lang: string): string {
  const note = READING_COMPLETE_NOTE[type] ?? READING_COMPLETE_NOTE.other
  return T(lang, note.zh, note.en)
}

// Both the in-session and activation-resume handoffs prefix their synthetic
// with `[占卜完成]` / `[reading complete]` followed by the divination type token.
// Detect that shape so the stored user row can be re-rendered as a system note.
const READING_COMPLETE_RE = /^\[(?:占卜完成|reading complete)\]\s+([a-z]+)\b/

function parseReadingCompleteType(content: string): string | null {
  const m = READING_COMPLETE_RE.exec(content)
  return m ? m[1] : null
}

export type Shape = 'collapsed' | 'expanded'

/**
 * Greeting state hydrated from GET /api/master. Used by the widget to render
 * a templated greeting (not LLM-generated) when the message list is empty.
 */
export interface GreetingHints {
  hasReadings: boolean
  lastReading: { type: string; createdAt: string } | null
  readingTypeCounts: Record<string, number>
  /**
   * Today's working-master reference — day ganzhi, current 節氣, and 流年
   * (annual ganzhi). Computed server-side from tyme4ts on every GET so the
   * greeting reflects fresh temporal context.
   */
  temporalContext: {
    dayGanZhi: string
    jieQi: string
    yearGanZhi: string
  } | null
}

interface MasterChatContextValue {
  enabled: boolean
  shape: Shape
  setShape: (s: Shape) => void
  toggleShape: () => void
  messages: MasterMsg[]
  loading: boolean
  toolStatus: ToolStatus | null
  pendingReading: { type: string; url: string; subjectName?: string } | null
  /**
   * Epoch ms when the interrupt rate-limit window clears, or null when not
   * rate-limited. Set when a mid-stream interrupt is DROPPED because the
   * user exceeded the cap — the UI shows a persistent cooldown notice
   * (the dropped messages were already rendered as bubbles but never sent).
   */
  interruptCooldownUntil: number | null
  greetingHints: GreetingHints
  /** Whether the user has seen the master memory first-use disclosure modal. */
  disclosureSeen: boolean
  /** Whether portrait extraction + personalized prompt are enabled for this user. */
  portraitEnabled: boolean
  sendMessage: (content: string) => Promise<void>
  /**
   * Report composer activity so the proactive paths (idle reflection +
   * activation-resume checkin) don't speak over a user who's mid-message.
   * Call on every keystroke with the current draft length (0 when cleared).
   */
  notifyTyping: (draftLength: number) => void
  /**
   * Abort whatever CTA is currently pending. Clears `pendingReading`
   * locally AND injects a synthetic "[user cancelled]" message so the
   * master persona's cancel branch handles it gracefully (acknowledge
   * + do NOT re-emit + switch topic). No-op when `pendingReading` is
   * null.
   */
  cancelPendingReading: () => void
  /** Soft reset — archives chat history, keeps portrait. */
  startNewSession: () => Promise<void>
  /** Hard reset — wipes chat history AND portrait. "Forget everything." */
  clearSession: () => Promise<void>
  /** Mark the disclosure modal as seen (called by the widget after the user dismisses it). */
  markDisclosureSeen: () => Promise<void>
  /** Turn the memory / portrait function on or off for the current user. */
  setPortraitEnabled: (enabled: boolean) => Promise<void>
  historyLoaded: boolean
  /**
   * Single State-2 opener line picked once on mount. Surfaces in the
   * collapsed bar (as the input placeholder hint) AND in the expanded
   * greeting (as the opener). Picking once here keeps the two views in
   * sync — without this, each renderGreeting / each component would
   * randomize its own and the user would see the master "introducing
   * himself" with two different sentences in one session.
   */
  widgetOpener: string
}

export interface MasterChatActionsValue {
  enabled: boolean
  shape: Shape
  setShape: (s: Shape) => void
  toggleShape: () => void
  sendMessage: (content: string) => Promise<void>
  notifyTyping: (draftLength: number) => void
  cancelPendingReading: () => void
  startNewSession: () => Promise<void>
  clearSession: () => Promise<void>
  markDisclosureSeen: () => Promise<void>
  setPortraitEnabled: (enabled: boolean) => Promise<void>
  /**
   * Register the reading the user is currently looking at (result page).
   * Sent with every turn so the Master answers with that reading in context.
   * Pass null on unmount.
   */
  setViewingReading: (readingId: string | null) => void
}

const MasterChatContext = createContext<MasterChatContextValue | null>(null)
const MasterChatActionsContext = createContext<MasterChatActionsValue | null>(null)

const toolLabels: Record<string, { zh: string; en: string }> = {
  get_user_profile: { zh: '查閱檔案中...', en: 'Reading profile...' },
  list_family_members: { zh: '查閱家人名冊中...', en: 'Listing family...' },
  list_readings: { zh: '翻閱舊卷中...', en: 'Browsing readings...' },
  get_reading: { zh: '展卷細讀中...', en: 'Opening reading...' },
  get_reading_detail: { zh: '推究細節中...', en: 'Fetching section...' },
  prefill_divination_form: { zh: '備下卦席中...', en: 'Preparing form...' },
  show_reading_card: { zh: '取出舊卷...', en: 'Pulling reading...' },
}

function labelFor(tool: string, lang: 'zh-TW' | 'en'): string {
  const m = toolLabels[tool]
  if (m) return T(lang, m.zh, m.en)
  return T(lang, '處理中...', 'Processing...')
}

interface ProviderProps {
  children: ReactNode
}

export function MasterChatProvider({ children }: ProviderProps) {
  const { data: session, status } = useSession()
  const { lang: rawLang } = useLang()
  const lang: 'zh-TW' | 'en' = rawLang === 'en' ? 'en' : 'zh-TW'
  const authenticated = status === 'authenticated' && !!session?.user?.id
  const enabled = authenticated // widget only renders for signed-in users

  const [shape, setShape] = useState<Shape>('collapsed')
  const [messages, setMessages] = useState<MasterMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<ToolStatus | null>(null)
  const [pendingReading, setPendingReading] = useState<{ type: string; url: string; subjectName?: string } | null>(null)
  const [interruptCooldownUntil, setInterruptCooldownUntil] = useState<number | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [greetingHints, setGreetingHints] = useState<GreetingHints>({
    hasReadings: false,
    lastReading: null,
    readingTypeCounts: {},
    temporalContext: null,
  })
  const [disclosureSeen, setDisclosureSeen] = useState(true) // optimistic — set to false if GET says null
  const [portraitEnabled, setPortraitEnabledState] = useState(true)
  // Pick a State-2 opener ONCE on provider mount and keep it stable for
  // the rest of the session. CollapsedBar and ExpandedView both read this,
  // so the opener the user sees in the collapsed input hint is the SAME
  // line that headers the expanded greeting — no double self-introduction.
  const [widgetOpener] = useState<string>(() => pickOpener(lang))
  const abortRef = useRef<AbortController | null>(null)
  // Reading the user is currently viewing; attached to each turn so the
  // Master always has the on-screen reading in context.
  const viewingReadingRef = useRef<string | null>(null)
  const setViewingReading = useCallback((readingId: string | null) => {
    viewingReadingRef.current = readingId
  }, [])
  const sendingRef = useRef(false)
  // Resolves when the in-flight turn fully cleans up (sendingRef → false,
  // SSE reader closed, error toasts shown). Interrupt-then-restart awaits
  // this so the new runTurn doesn't race the old one's `if (sendingRef)
  // return` early-bail. Initial value is a resolved Promise so the very
  // first turn awaits nothing.
  const turnDoneRef = useRef<Promise<void>>(Promise.resolve())
  // Sliding window of recent interrupt timestamps. Enforced rate cap stops
  // a stuck or malicious client from burning credits + LLM calls by
  // spamming the send button mid-stream. Tuned for genuine "wait, let me
  // add to that" follow-ups (a few per minute) but not for spam.
  const interruptHistoryRef = useRef<number[]>([])
  const MAX_INTERRUPTS_PER_WINDOW = 6
  const INTERRUPT_WINDOW_MS = 60_000

  // Debounce buffer for rapid-fire WeChat-style sends. The user can mash
  // Enter on 2-3 short messages back-to-back; we collect them locally,
  // show each as its own bubble immediately, and only POST after the user
  // has been silent for `BURST_DEBOUNCE_MS`. Backend gets one POST with
  // `messages: string[]` and appends each as its own user row.
  const pendingSendsRef = useRef<string[]>([])
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const BURST_DEBOUNCE_MS = 1500

  // Proactive checkin throttle — when the widget opens after a gap, the
  // master may speak first. We only fire this once per N minutes per
  // session to prevent the master from "greeting" the user repeatedly if
  // they collapse + re-expand the widget within minutes.
  const proactiveLastFiredRef = useRef<number>(0)
  const PROACTIVE_COOLDOWN_MS = 5 * 60 * 1000  // 5 min between checkin attempts

  // Idle reflection — fires when the user has been silent in the EXPANDED
  // chat for ~90s after the master's last reply. At most ONCE per silent
  // stretch: if the user doesn't respond to the reflection, we treat it as
  // "user has left" and stop. Counter resets when the user types again.
  // See docs/master-interaction-features.md for the full state machine.
  const reflectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 0 = ready to reflect once when idle timer fires
  // 1 = already reflected once this silent stretch — DEAD until user replies
  const reflectionAttemptsRef = useRef(0)
  const REFLECTION_IDLE_MS_BASE = 75_000  // 75s base
  const REFLECTION_IDLE_MS_JITTER = 45_000 // +0-45s random to feel natural

  // ── Typing guard ─────────────────────────────────────────────────────────
  // Both proactive paths (idle reflection + activation-resume checkin) must
  // NOT speak while the user is composing — interrupting an in-progress
  // message would steal focus / scroll and discard their intent. The expanded
  // composer reports keystrokes via `notifyTyping`; the proactive paths check
  // `isUserActivelyTyping()` at fire time. "Actively typing" = a non-empty
  // draft sitting in the box (clear intent to send) OR a keystroke within the
  // last few seconds (mid-thought, briefly paused).
  const lastTypingAtRef = useRef<number>(0)
  const hasDraftRef = useRef<boolean>(false)
  const TYPING_GRACE_MS = 4000

  const notifyTyping = useCallback((draftLength: number) => {
    hasDraftRef.current = draftLength > 0
    // Only a real keystroke (non-empty draft) extends the grace window;
    // clearing the box on send must not keep the guard hot.
    if (draftLength > 0) lastTypingAtRef.current = Date.now()
  }, [])

  const isUserActivelyTyping = useCallback((): boolean => {
    // Non-empty draft = unmistakable intent to send; never interrupt.
    if (hasDraftRef.current) return true
    // Empty box but a very recent keystroke (just cleared / pausing) — grace.
    return Date.now() - lastTypingAtRef.current < TYPING_GRACE_MS
  }, [])

  // Self-reference so the reflection timer can re-arm itself when it fires
  // mid-typing (defer instead of dropping the reflection for this stretch).
  const scheduleReflectionRef = useRef<() => void>(() => {})

  const toggleShape = useCallback(() => {
    setShape((s) => (s === 'collapsed' ? 'expanded' : 'collapsed'))
  }, [])

  // ── Load session history on mount / auth change ──────────────────────────
  const loadHistory = useCallback(async () => {
    if (!enabled) {
      setMessages([])
      setHistoryLoaded(true)
      return
    }
    try {
      // `cache: 'no-store'` — after deleting a reading elsewhere in the app,
      // we need fresh counts/temporalContext on every refresh. Without this,
      // the browser may return a cached body and leave the greeting showing
      // deleted 命盤 types.
      const res = await fetch('/api/master', { cache: 'no-store' })
      if (!res.ok) {
        setHistoryLoaded(true)
        return
      }
      const data = (await res.json()) as {
        messages?: MasterMsg[]
        hasReadings?: boolean
        lastReading?: { type: string; createdAt: string } | null
        readingTypeCounts?: Record<string, number>
        temporalContext?: { dayGanZhi: string; jieQi: string; yearGanZhi: string } | null
        disclosureSeen?: boolean
        portraitEnabled?: boolean
      }
      if (data.messages?.length) {
        // Expand stored assistant content with `[NEXT]` markers into
        // separate bubble rows. This is the load-time mirror of the
        // streaming-time behavior: if the master sent 3 bubbles in one turn,
        // we render 3 bubbles after refresh too — not one bubble with the
        // marker showing.
        const expanded: MasterMsg[] = []
        for (const m of data.messages.filter((x) =>
          x.role !== 'system' &&
          !(x.role === 'user' && typeof x.content === 'string' && (x.content.startsWith('[user cancelled]') || x.content.startsWith('[用戶取消]')))
        )) {
          // Reading-completion handoffs are stored as user rows (the LLM needs
          // them in history) but must NOT render as user bubbles. Re-render as
          // a clean, type-specific centered system note instead.
          const completeType =
            m.role === 'user' && typeof m.content === 'string'
              ? parseReadingCompleteType(m.content)
              : null
          if (completeType) {
            expanded.push({
              ...m,
              role: 'system',
              kind: 'system_note',
              content: readingCompleteNoteText(completeType, lang),
            })
            continue
          }
          if (
            m.role === 'assistant' &&
            typeof m.content === 'string' &&
            m.content.includes(BUBBLE_MARKER)
          ) {
            const parts = splitBubbles(m.content)
            for (const part of parts) {
              expanded.push({ ...m, content: part, kind: m.kind ?? 'text' })
            }
          } else {
            expanded.push({ ...m, kind: m.kind ?? 'text' })
          }
        }
        // Never replace the transcript while a turn is streaming — the expand /
        // readingsChanged refreshes fire on the CTA→reading handoff exactly when
        // runTurn is mid-stream, and clobbering `messages` here drops the
        // in-flight assistant bubble (and the reply gets appended to a stale row).
        // Hints/disclosure/portrait below are safe to refresh regardless.
        if (!sendingRef.current) setMessages(expanded)
      } else {
        // Fresh load with empty messages (e.g. after a soft reset) — clear
        // any stale local state (but not mid-stream, per above).
        if (!sendingRef.current) setMessages([])
      }
      setGreetingHints({
        hasReadings: data.hasReadings ?? false,
        lastReading: data.lastReading ?? null,
        readingTypeCounts: data.readingTypeCounts ?? {},
        temporalContext: data.temporalContext ?? null,
      })
      setDisclosureSeen(data.disclosureSeen ?? true)
      setPortraitEnabledState(data.portraitEnabled ?? true)
      setHistoryLoaded(true)
    } catch {
      setHistoryLoaded(true)
    }
    // `lang` is read inside (readingCompleteNoteText) — including it also means
    // a language switch re-renders stored completion notes in the new language.
  }, [enabled, lang])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Refresh greeting hints (reading counts, last reading, temporalContext)
  // each time the widget opens. Without this, deleting readings elsewhere in
  // the app would leave the greeting's status block showing stale data until
  // a full page reload.
  useEffect(() => {
    if (shape === 'expanded' && enabled) {
      loadHistory()
    }
  }, [shape, enabled, loadHistory])

  // Activation-resume dispatcher — see docs/planning/activation-resume-design-2026-04-27.md.
  // Fires when the widget is expanded and the conversation has prior content.
  // Two stages:
  //   Stage 1 (deterministic): scan for the latest pending CTA card. If a
  //     reading of that type was completed externally → swap the card and
  //     inject a [reading complete] synthetic. If aged > 30 min and still
  //     pending → ask "do you still want that reading?" via the
  //     `cta_pending_aged` hint. <30 min with no completion → user is
  //     probably still on the form; do nothing.
  //   Stage 2 (master self-classifies): no pending CTA. Branch on the last
  //     message: user → `unanswered_user`; closed-gracefully → silent;
  //     long gap → `long_gap_resume`; otherwise → `ambiguous_resume`.
  // Cooldown / preconditions are shared with the legacy 2h-gap path.
  useEffect(() => {
    if (shape !== 'expanded' || !enabled || !historyLoaded) return
    if (sendingRef.current) return
    const now = Date.now()
    if (now - proactiveLastFiredRef.current < PROACTIVE_COOLDOWN_MS) return
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!last) return
    const lastTs = new Date(last.timestamp).getTime()
    if (!Number.isFinite(lastTs)) return
    const ageMs = now - lastTs
    // <5 min: same session, user just collapsed/expanded — never fire.
    if (ageMs < 5 * 60 * 1000) return

    void runActivationDispatch()
    // intentionally only depends on shape+historyLoaded — we do NOT want
    // this to re-fire on every messages update mid-stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, enabled, historyLoaded])

  // Also refresh immediately when another component tells us readings changed
  // (e.g. the dashboard's delete flow). Mirrors the portraitEnabledChanged
  // pattern — a window event is the simplest cross-component notification.
  useEffect(() => {
    if (!enabled) return
    return subscribe('xuanji:readingsChanged', () => { loadHistory() })
  }, [enabled, loadHistory])

  // ── Core: actually POST + parse the SSE stream ───────────────────────────
  // Shared by user-initiated turns (`messages`), proactive checkins
  // (`checkin: true`), and idle reflections (`reflection: true`). All
  // three POST to the same /api/master endpoint and stream back via SSE
  // — the route just adapts which prompt appendix it glues on.
  const runTurn = useCallback(
    async (payload: { messages: string[] } | { checkin: true | CheckinHint } | { reflection: true }) => {
      if (!enabled || sendingRef.current) return

      sendingRef.current = true
      // Any non-reflection turn = the user is actively engaged again
      // (typing, completing/cancelling a reading, or just opened the
      // chat). Reset the once-per-silent-stretch reflection budget so
      // the NEXT idle period can reflect again. The reflection turn
      // itself does NOT reset — its counter stays at 1, and the
      // post-turn useEffect bails on `reflectionAttemptsRef >= 1`.
      if (!('reflection' in payload)) {
        reflectionAttemptsRef.current = 0
      }
      // Publish a Promise that resolves only after this turn's finally
      // block runs. flushPendingSends awaits this when the user
      // interrupts so the next runTurn doesn't race the cleanup.
      let resolveTurn: () => void = () => {}
      turnDoneRef.current = new Promise<void>((resolve) => { resolveTurn = resolve })
      setLoading(true)

      // Pre-allocate the assistant message slot we will stream into. (User
      // bubbles for `messages` payloads were already pushed by sendMessage
      // when the user pressed send — we don't re-push them here.)
      const assistantMsg: MasterMsg = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        kind: 'text',
      }
      setMessages((prev) => [...prev, assistantMsg])

      // Cards (CTA + reading reference) are buffered for the duration of the
      // turn and only rendered once the LLM has fully finished streaming
      // (the `done` event). Reason: the model commonly emits the tool call
      // first and then writes the "click the card below" prompt afterwards
      // — if we render the card the moment the SSE event arrives, the card
      // is visible while the introductory text is still being typed.
      // Deferring guarantees: all narrative text settles, brief beat, then
      // cards pop in at the end. Order within the buffer is preserved.
      const pendingCards: MasterMsg[] = []
      const flushPendingCards = () => {
        if (pendingCards.length === 0) return
        const cards = [...pendingCards]
        pendingCards.length = 0
        // Use RAF to let the last text render settle before cards pop in,
        // but don't use a long setTimeout that races with the finally block.
        requestAnimationFrame(() => {
          setMessages((prev) => [...prev, ...cards])
        })
      }

      // Set when the stream errors out: recover by reloading server history once
      // this turn settles (see finally) rather than re-POSTing — see catch.
      let needsReloadRecovery = false

      try {
        abortRef.current = new AbortController()
        const res = await fetch('/api/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            viewingReadingId: viewingReadingRef.current ?? undefined,
            clientTime: new Date().toISOString(),
            tzOffsetMin: new Date().getTimezoneOffset(),
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const err = (await res.json().catch(() => ({ error: 'Request failed' }))) as {
            error?: string
            turnLimitReached?: boolean
            dailyLimitReached?: boolean
          }
          const isLimit = !!(err.turnLimitReached || err.dailyLimitReached)
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...assistantMsg,
              role: isLimit ? 'system' : 'assistant',
              kind: isLimit ? 'limit_notice' : 'text',
              content: err.error ?? (T(lang, '抱歉，出了點問題。', 'Sorry, something went wrong.')),
            }
            return updated
          })
          return
        }

        const reader = res.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const event = JSON.parse(data) as {
                type: string
                text?: string
                tool?: string
                error?: string
                payload?: CtaCardPayload | ReadingCardPayload
                durationMs?: number
                ttftMs?: number | null
                reason?: string
                isTimeout?: boolean
              }

              if (event.type === 'content') {
                setMessages((prev) => {
                  const updated = [...prev]
                  // Find the writeable text bubble: skip any trailing CTA /
                  // reading cards so subsequent prose lands ABOVE them, not
                  // below. This matters when the model emits the tool call
                  // first and then streams "click the card below" — we want
                  // that prose above the card it's referring to.
                  let cardStart = updated.length
                  while (cardStart > 0) {
                    const m = updated[cardStart - 1]
                    if (
                      m.role === 'assistant' &&
                      (m.kind === 'cta_card' || m.kind === 'reading_card')
                    ) {
                      cardStart--
                    } else {
                      break
                    }
                  }
                  const writeable = cardStart > 0 ? updated[cardStart - 1] : null
                  if (
                    writeable &&
                    writeable.role === 'assistant' &&
                    writeable.kind === 'text'
                  ) {
                    updated[cardStart - 1] = {
                      ...writeable,
                      content: writeable.content + (event.text ?? ''),
                    }
                  } else {
                    // No usable text bubble before the trailing cards —
                    // insert a fresh one at that position.
                    updated.splice(cardStart, 0, {
                      role: 'assistant',
                      content: event.text ?? '',
                      timestamp: new Date().toISOString(),
                      kind: 'text',
                    })
                  }
                  return updated
                })
              } else if (event.type === 'bubble_break') {
                // Master signaled a bubble boundary. Make multiple bubbles
                // feel like a real chat by:
                //   1. Pushing a fresh empty assistant text slot. While
                //      loading=true and this empty slot is the last
                //      message, the widget renders the typing-dot
                //      indicator — "master is typing the next message".
                //   2. Sleeping the reader loop briefly so the typing
                //      dots actually have time to be seen. The server
                //      keeps streaming; subsequent `content` bytes buffer
                //      in the network layer until we wake.
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    kind: 'text',
                  },
                ])
                await new Promise((resolve) => setTimeout(resolve, 700))
              } else if (event.type === 'tool_start') {
                setToolStatus({ name: event.tool ?? '', label: labelFor(event.tool ?? '', lang) })
              } else if (event.type === 'tool_end') {
                setToolStatus(null)
              } else if (event.type === 'cta_card' && event.payload) {
                // Queue the card; render at the `done` event. Subsequent
                // prose streams into the last existing text bubble (or a
                // fresh one created by the content handler), so the
                // introductory text is fully typed before the card pops in.
                const payload = event.payload as CtaCardPayload
                pendingCards.push({
                  role: 'assistant',
                  content: '',
                  timestamp: new Date().toISOString(),
                  kind: 'cta_card',
                  ctaPayload: payload,
                })
                // pendingReading is the collapsed-bar status flag; set it
                // immediately so the collapsed bar shows "waiting for your
                // reading..." even before the card itself becomes visible.
                // Extract subject name from ctaContext for the collapsed bar display
                const ctxTarget = (payload as CtaCardPayload).ctaContext?.target
                const subjectName = ctxTarget && !ctxTarget.includes('自己') && !ctxTarget.includes('yourself') ? ctxTarget.replace(/^(為|For)\s*/, '').replace(/預測$/, '') : undefined
                setPendingReading({ type: payload.divinationType, url: payload.url, subjectName: subjectName || undefined })
              } else if (event.type === 'reading_card' && event.payload) {
                // Same deferral pattern as cta_card. Queue and let the
                // surrounding prose finish streaming before the card appears.
                const payload = event.payload as ReadingCardPayload
                pendingCards.push({
                  role: 'assistant',
                  content: '',
                  timestamp: new Date().toISOString(),
                  kind: 'reading_card',
                  readingCardPayload: payload,
                })
              } else if (event.type === 'metrics') {
                // Track turn latency metrics emitted by server
                const duration = typeof event.durationMs === 'number' ? event.durationMs : undefined
                if (duration) {
                  setMessages((prev) => {
                    const updated = [...prev]
                    if (updated.length > 0) {
                      const last = updated[updated.length - 1]
                      if (last && last.role === 'assistant') {
                        updated[updated.length - 1] = { ...last, turnDurationMs: duration }
                      }
                    }
                    return updated
                  })
                }
              } else if (event.type === 'feedback_prompt') {
                const reason = event.reason as 'slow_response' | 'milestone' | 'timeout'
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    kind: 'feedback_prompt',
                    feedbackPromptReason: reason,
                  },
                ])
              } else if (event.type === 'error') {
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...assistantMsg,
                    content: event.error ?? (T(lang, '抱歉，出了點問題。', 'Sorry, something went wrong.')),
                  }
                  return updated
                })
              } else if (event.type === 'done') {
                // Stream complete — release any queued cards now. The 400ms
                // beat inside flushPendingCards lets the final text settle
                // before the card animates in.
                flushPendingCards()
              }
            } catch {
              /* ignore malformed frames */
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          // The connection dropped. The server may have already persisted the
          // user turn and finished (or still be finishing) the reply. Do NOT
          // re-POST the same payload — that appends the user rows again and
          // re-runs the LLM, double-charging credits. Instead recover by
          // reloading server history once this turn settles (finally block),
          // which surfaces the real reply if it landed and otherwise leaves the
          // user free to retry manually.
          needsReloadRecovery = true
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...assistantMsg,
              content: T(
                lang,
                '玄機與天機的連結閃了一下，正在恢復……',
                'My connection to the celestial realm flickered — recovering…'
              ),
            }
            return updated
          })
        }
      } finally {
        // Safety: if the stream ended before `done` fired (error/abort),
        // flush any remaining queued cards so the user still sees the CTA.
        if (pendingCards.length > 0) {
          const cards = [...pendingCards]
          pendingCards.length = 0
          setMessages((prev) => [...prev, ...cards])
        }
        // Silent turn (reflection answered `[PASS]`): drop the empty slot.
        setMessages((prev) => prev.filter((m) => !(m === assistantMsg && m.content === '')))
        setLoading(false)
        setToolStatus(null)
        sendingRef.current = false
        // Release any awaiter blocked on this turn's completion.
        // flushPendingSends uses this when the user interrupts so the
        // follow-up runTurn fires AFTER the old one's state has settled.
        resolveTurn()
        // Error recovery: now that sendingRef is cleared, reload server history
        // so a server-completed-but-disconnected turn surfaces its real reply.
        // (loadHistory no-ops the message replacement while sendingRef is set.)
        if (needsReloadRecovery) void loadHistory()
      }
    },
    [enabled, lang, loadHistory],
  )

  // Flush the pending-sends queue: POST whatever the user has typed during
  // the debounce window as one request with all messages. Each becomes its
  // own user row server-side, so the LLM sees them as consecutive user
  // turns and the chat history shows each as its own bubble.
  const flushPendingSends = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const queued = pendingSendsRef.current
    if (queued.length === 0) return

    // Mid-stream interruption: master is currently streaming and the
    // user just typed something new. Two reasons to allow:
    //   (a) the user wants to redirect ("等等，我問的是…")
    //   (b) the user wants to add context ("还有，我老婆是…")
    // In both cases the sensible behavior is: stop the in-flight reply,
    // include the new turn's input alongside whatever already streamed,
    // and let the master compose a fresh response.
    //
    // We rate-limit interruptions on a sliding 60s window. Genuine
    // follow-ups are 2-3 per minute at most; anything more is either
    // stuck-loop spam or abuse (each interrupt still costs an LLM
    // call + credits server-side). When over the cap, we drop the
    // queue and tell the user to wait for the current reply.
    if (sendingRef.current) {
      const now = Date.now()
      interruptHistoryRef.current = interruptHistoryRef.current.filter(
        (t) => now - t < INTERRUPT_WINDOW_MS,
      )
      if (interruptHistoryRef.current.length >= MAX_INTERRUPTS_PER_WINDOW) {
        pendingSendsRef.current = []
        // The dropped messages are already on screen as user bubbles, so a
        // transient toast alone reads as "sent". Expose when the window
        // clears so the expanded view can show a persistent cooldown notice
        // until then (self-clears shortly after expiry).
        const clearsAt = interruptHistoryRef.current[0] + INTERRUPT_WINDOW_MS
        setInterruptCooldownUntil(clearsAt)
        setTimeout(() => {
          setInterruptCooldownUntil((cur) => (cur !== null && Date.now() >= cur ? null : cur))
        }, Math.max(0, clearsAt - now) + 250)
        toast.error(
          T(
            lang,
            '打斷過於頻繁，請等當前回應結束。',
            'Too many interruptions — please let the current reply finish.'
          ),
          { duration: 3000 },
        )
        return
      }
      interruptHistoryRef.current.push(now)

      // Mark the assistant's most recent text bubble (the one being
      // streamed into) with a small "(被打斷)" suffix. Visual cue so
      // the user understands why the response stopped mid-sentence.
      // Walks backward past CTA / reading cards to find the live text
      // slot — same path-finding the content handler uses.
      setMessages((prev) => {
        const updated = [...prev]
        for (let i = updated.length - 1; i >= 0; i--) {
          const m = updated[i]
          if (
            m.role === 'assistant' &&
            (m.kind === 'text' || !m.kind) &&
            m.content.trim().length > 0
          ) {
            updated[i] = {
              ...m,
              content: m.content + (T(lang, '\n\n*…(被打斷)*', '\n\n*…(interrupted)*')),
            }
            break
          }
        }
        return updated
      })

      // Abort the SSE fetch. The runTurn's catch will silently swallow
      // the AbortError and finally will release sendingRef + resolve
      // turnDoneRef. We await that so the new runTurn doesn't race the
      // cleanup.
      abortRef.current?.abort()
      await turnDoneRef.current
    }

    pendingSendsRef.current = []
    await runTurn({ messages: queued })
  }, [runTurn, lang])

  // Public sendMessage — what the input box and CTA buttons call. Pushes
  // the message onto the pending queue, optimistically renders it as a
  // user bubble, and (re)arms a debounce timer. The actual POST fires
  // BURST_DEBOUNCE_MS after the user stops sending, so 2-3 short messages
  // typed in rapid succession arrive at the server as a single request.
  //
  // Mid-stream interruption: this NO LONGER bails when sendingRef is
  // true. The follow-up text accumulates in the queue; flushPendingSends
  // (after debounce) detects the in-flight stream and aborts it before
  // firing the new turn. See its rate-limit + cleanup logic.
  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled) return
      const trimmed = content.trim()
      if (!trimmed) return

      pendingSendsRef.current.push(trimmed)
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
          kind: 'text',
        },
      ])

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        void flushPendingSends()
      }, BURST_DEBOUNCE_MS)
    },
    [enabled, flushPendingSends],
  )

  // Activation-resume dispatcher core. Called by the expand-effect after
  // its preconditions pass (history loaded, gap > 5 min, cooldown elapsed,
  // not streaming). Two stages — see docs/planning/activation-resume-design-2026-04-27.md.
  const runActivationDispatch = useCallback(async () => {
    if (!enabled || sendingRef.current) return
    // Don't speak over a user who's mid-message — let them send first.
    if (isUserActivelyTyping()) return
    proactiveLastFiredRef.current = Date.now()

    // Stage 1: pending CTA fast-path.
    const detectableMessages: DetectableMsg[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      kind: m.kind,
      ctaPayload: m.ctaPayload
        ? { divinationType: m.ctaPayload.divinationType, ctaContext: m.ctaPayload.ctaContext }
        : undefined,
    }))
    const cta = findLatestPendingCTA(detectableMessages)
    if (cta) {
      const ctaAgeMs = Date.now() - new Date(cta.timestamp).getTime()
      // Query the server: did a matching reading get created since the CTA
      // was emitted? Catches the cross-device / cross-tab completion case.
      try {
        const params = new URLSearchParams({
          type: cta.type,
          since: cta.timestamp,
          target: cta.target,
        })
        const res = await fetch(`/api/master/cta-status?${params.toString()}`, { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as { completed: boolean; readingId?: string }
          if (data.completed && data.readingId) {
            // Reuse the same handoff phrasing as the in-session readingComplete
            // listener: tell the master the chart now exists and re-check
            // multi-step CTA prerequisites before continuing.
            const synthetic = T(
              lang,
              `[占卜完成] ${cta.type} 的命盤已存好 (id: ${data.readingId})。用戶在他處完成後剛重新打開對話。請重新檢查當前任務是否還有缺失的前置占卜，若有則繼續發下一張 CTA 卡片；若已齊備，再進行分析。`,
              `[reading complete] ${cta.type} reading saved (id: ${data.readingId}). The user just reopened the chat after completing it elsewhere. Re-check whether the current task still has missing prerequisites; if so, redirect to the next CTA. Otherwise proceed with the analysis.`
            )
            // Clean completion marker (the synthetic goes to the LLM only).
            setMessages((prev) => [
              ...prev,
              {
                role: 'system',
                kind: 'system_note',
                content: readingCompleteNoteText(cta.type, lang),
                timestamp: new Date().toISOString(),
              },
            ])
            await runTurn({ messages: [synthetic] })
            return
          }
        }
      } catch {
        /* network failure → fall through to aged-CTA branch */
      }
      // Not completed. Old enough → ask; otherwise stay quiet (user may
      // still be on the form).
      if (ctaAgeMs >= CTA_AGED_THRESHOLD_MS) {
        await runTurn({ checkin: 'cta_pending_aged' })
      }
      return
    }

    // Stage 2: structural triage.
    const last = messages[messages.length - 1]
    if (!last) return
    const lastTs = new Date(last.timestamp).getTime()
    const ageMs = Date.now() - lastTs

    if (last.role === 'user') {
      // Assistant never replied — answer the user's question now.
      await runTurn({ checkin: 'unanswered_user' })
      return
    }
    if (last.role === 'assistant' && isConversationClosed(detectableMessages, lang)) {
      // Conversation looks closed; stay silent.
      return
    }
    if (ageMs > LONG_GAP_THRESHOLD_MS) {
      await runTurn({ checkin: 'long_gap_resume' })
      return
    }
    await runTurn({ checkin: 'ambiguous_resume' })
  }, [enabled, messages, runTurn, lang, isUserActivelyTyping])

  // ── Idle reflection scheduler ────────────────────────────────────────────
  // After every master reply, set a 90s timer. If it fires while the
  // widget is still expanded and no new user input has come, the master
  // takes one shot at supplementing the conversation. The
  // `reflectionAttemptsRef` cap means we never fire twice in the same
  // silent stretch — silence past one reflection is interpreted as "user
  // left", and badgering them with more would feel needy and chatty.
  const cancelReflection = useCallback(() => {
    if (reflectionTimerRef.current) {
      clearTimeout(reflectionTimerRef.current)
      reflectionTimerRef.current = null
    }
  }, [])

  const triggerReflection = useCallback(async () => {
    if (!enabled || sendingRef.current) return
    reflectionAttemptsRef.current += 1
    await runTurn({ reflection: true })
  }, [enabled, runTurn])

  // Content-aware check: should the master follow up?
  // Returns false for trivial closers, true for substantive conversation.
  const shouldReflect = useCallback((): boolean => {
    // Find the last user message (skip cards and system)
    const userMsgs = messages.filter(m => m.role === 'user' && m.kind === 'text')
    if (userMsgs.length === 0) return false
    const lastUserMsg = userMsgs[userMsgs.length - 1].content.trim()

    // Skip if user's last message was a trivial closer
    const trivialPatterns = /^(好|ok|好的|嗯|谢谢|謝謝|thank|thanks|bye|再[見见]|掰|知道了|明白|收到|got it|sure|okay|行|对|對|是的|没了|沒了|就这样|就這樣)$/i
    if (trivialPatterns.test(lastUserMsg)) return false

    // Skip if very short (< 5 chars) — likely a filler
    if (lastUserMsg.length < 5) return false

    return true
  }, [messages])

  const scheduleReflection = useCallback(() => {
    cancelReflection()
    if (!enabled) return
    if (reflectionAttemptsRef.current >= 1) return  // dead until user replies
    if (shape !== 'expanded') return  // user can't see the bubble anyway

    // Content-aware gate: skip reflection for trivial closers
    if (!shouldReflect()) return

    // Randomize delay to feel natural (75-120s)
    const delay = REFLECTION_IDLE_MS_BASE + Math.random() * REFLECTION_IDLE_MS_JITTER
    reflectionTimerRef.current = setTimeout(() => {
      reflectionTimerRef.current = null
      if (reflectionAttemptsRef.current >= 1) return
      if (sendingRef.current) return
      if (shape !== 'expanded') return
      if (!shouldReflect()) return  // re-check at fire time
      // User is mid-message — defer rather than drop. Re-arm so the
      // reflection still happens once they stop typing (this does NOT
      // consume the once-per-stretch budget, so silence later still fires).
      if (isUserActivelyTyping()) {
        scheduleReflectionRef.current()
        return
      }
      void triggerReflection()
    }, delay)
  }, [enabled, shape, triggerReflection, cancelReflection, shouldReflect, isUserActivelyTyping])

  // Keep the self-reference current so the in-timer re-arm above always calls
  // the latest scheduleReflection closure.
  scheduleReflectionRef.current = scheduleReflection

  // Schedule reflection after each completed master reply.
  useEffect(() => {
    if (loading) return
    if (!enabled) return
    if (shape !== 'expanded') return
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    scheduleReflection()
    return () => cancelReflection()
  }, [loading, enabled, shape, messages, scheduleReflection, cancelReflection])

  // ── Portrait-enabled cross-tab / cross-page sync ─────────────────────────
  // The /profile/portrait page and the master widget's own gate both flip
  // User.portraitEnabled. Without syncing, the widget's gate state goes stale
  // after a toggle elsewhere. Listen for the custom event dispatched by the
  // portrait page (and any other caller) and mirror the value here.
  useEffect(() => {
    if (!enabled) return
    return subscribe('xuanji:portraitEnabledChanged', (detail) => {
      if (typeof detail?.enabled !== 'boolean') return
      setPortraitEnabledState(detail.enabled)
    })
  }, [enabled])

  // ── Reading completion handoff ────────────────────────────────────────────
  // When the divination page saves a new reading, it dispatches a window
  // CustomEvent. If the master has a pendingReading matching the type:
  //   1. Replace the now-fulfilled CTA card with a reading_card pointing at
  //      the just-completed reading on /dashboard?reading={id}. The CTA's
  //      "click to start" affordance is stale; the reading_card is the
  //      forward-looking equivalent ("click to view what was generated").
  //   2. Send a synthetic "reading is ready" message DIRECTLY to runTurn,
  //      bypassing sendMessage so no user bubble is rendered. The server
  //      still appends it to LLM history (the model needs to know the
  //      reading exists to fetch + analyze it), but the user never sees
  //      this internal hand-off in their chat — it's plumbing, not chat.
  useEffect(() => {
    if (!enabled) return

    // Mirrors showReadingCard.ts's TYPE_LABELS so the swapped card visually
    // matches what the master would emit via show_reading_card. Kept inline
    // to avoid pulling a server-side tool module into the client bundle.
    const READING_CARD_LABELS: Record<string, { zh: string; en: string }> = {
      bazi: { zh: '八字命盤', en: 'BaZi Reading' },
      ziwei: { zh: '紫微斗數命盤', en: 'Zi Wei Reading' },
      iching: { zh: '易經占卜', en: 'I Ching Reading' },
      qimen: { zh: '奇門遁甲', en: 'Qi Men Reading' },
      meihua: { zh: '梅花易數', en: 'Mei Hua Reading' },
      fengshui: { zh: '風水分析', en: 'Feng Shui Reading' },
      liuyao: { zh: '六爻占卜', en: 'Liu Yao Reading' },
      other: { zh: '占卜', en: 'Reading' },
    }

    const handler = (detail: { readingId: string; type: string }) => {
      if (!detail) return
      if (pendingReading && pendingReading.type === detail.type) {
        setPendingReading(null)
        // Auto-expand so the user sees the master's response when it arrives.
        setShape('expanded')
        // Swap the matching CTA card → reading_card. Same array position,
        // so the transcript flow stays intact; only the affordance updates.
        setMessages((prev) =>
          prev.map((m) => {
            if (
              m.kind === 'cta_card' &&
              m.ctaPayload?.divinationType === detail.type
            ) {
              const labels =
                READING_CARD_LABELS[detail.type] ?? READING_CARD_LABELS.other
              const title = T(lang, labels.zh, labels.en)
              const today = new Date()
              const subtitle = T(
                lang,
                `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`,
                today.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
              )
              return {
                ...m,
                kind: 'reading_card' as const,
                ctaPayload: undefined,
                readingCardPayload: {
                  readingId: detail.readingId,
                  divinationType: detail.type,
                  title,
                  subtitle,
                  url: `/dashboard?reading=${detail.readingId}`,
                  note: T(lang, '剛完成', 'Just completed'),
                },
              }
            }
            return m
          }),
        )
        // Internal handoff — visible to the LLM (via the POST body, then
        // appended as a user row server-side), invisible to the user (we
        // skip sendMessage's user-bubble push by calling runTurn directly).
        // Phrasing: "[reading complete]" not "please continue" — the
        // master persona's multi-step CTA rules say to RE-CHECK
        // prerequisites first, not jump straight to analysis. Saying
        // "continue" used to bias the model into skipping the re-check
        // and starting the reading interpretation while another required
        // chart was still missing.
        const synthetic = T(
          lang,
          `[占卜完成] ${detail.type} 的命盤已存好 (id: ${detail.readingId})。請重新檢查當前任務是否還有缺失的前置占卜，若有則繼續發下一張 CTA 卡片；若已齊備，再進行分析。`,
          `[reading complete] ${detail.type} reading saved (id: ${detail.readingId}). Re-check whether the current task still has missing prerequisites; if so, redirect to the next CTA. Otherwise proceed with the analysis.`,
        )
        // Surface a clean completion marker right away (the synthetic itself is
        // sent to the LLM via runTurn but never rendered as a user bubble; on a
        // later reload loadHistory re-derives this same note from the stored row).
        setMessages((prev) => [
          ...prev,
          {
            role: 'system',
            kind: 'system_note',
            content: readingCompleteNoteText(detail.type, lang),
            timestamp: new Date().toISOString(),
          },
        ])
        void runTurn({ messages: [synthetic] })
      }
    }

    return subscribe('xuanji:readingComplete', handler)
  }, [enabled, pendingReading, runTurn, lang])

  // ── Cancel pending CTA — user reversal flow ──────────────────────────────
  // The collapsed bar shows a pending-reading status while the user is on
  // the divination form. If they change their mind there's no way to tell
  // the master to stop waiting without manually typing. cancelPendingReading
  // clears the local state AND injects a synthetic "[user cancelled]"
  // message so the master persona's "user cancelled" branch fires (see
  // master.md "Multi-step CTA flow"): acknowledge briefly, do NOT re-emit
  // the same CTA, switch to whatever else makes sense.
  const cancelPendingReading = useCallback(() => {
    if (!enabled) return
    const cancelled = pendingReading
    if (!cancelled) return
    setPendingReading(null)
    const synthetic = T(
      lang,
      `[用戶取消] 用戶取消了 ${cancelled.type} 的占卜。請簡短確認，不要再次發出相同 CTA，改用現有資料回應或換個方向。`,
      `[user cancelled] User aborted the pending ${cancelled.type} reading. Acknowledge briefly and do NOT re-emit the same CTA. Switch topic or work with what you already have.`,
    )
    void runTurn({ messages: [synthetic] })
  }, [enabled, pendingReading, runTurn, lang])

  // ── Clear session — "Forget everything" (DELETE) ─────────────────────────
  // Hard-delete master state: chat history + portrait + history + legacy blob.
  const clearSession = useCallback(async () => {
    if (!enabled) return
    try {
      await fetch('/api/master', { method: 'DELETE' })
    } catch {
      /* ignore */
    }
    setMessages([])
    setPendingReading(null)
    setGreetingHints({ hasReadings: false, lastReading: null, readingTypeCounts: {}, temporalContext: null })
    setDisclosureSeen(false) // re-show disclosure after a clean wipe
  }, [enabled])

  // ── Start new session — soft reset ───────────────────────────────────────
  // Archives current chat rows but keeps portrait + chart data. The next
  // master interaction begins a fresh sessionId.
  const startNewSession = useCallback(async () => {
    if (!enabled) return
    try {
      await fetch('/api/master/new-session', { method: 'POST' })
    } catch {
      /* ignore */
    }
    setMessages([])
    setPendingReading(null)
    // Reload greeting hints (the user still has readings + portrait)
    await loadHistory()
  }, [enabled, loadHistory])

  // ── Mark disclosure seen ────────────────────────────────────────────────
  const markDisclosureSeen = useCallback(async () => {
    if (!enabled) return
    setDisclosureSeen(true) // optimistic
    try {
      await fetch('/api/master/disclosure-seen', { method: 'PATCH' })
    } catch {
      /* ignore — local state is already set */
    }
  }, [enabled])

  // ── Toggle portrait (memory) enabled ─────────────────────────────────────
  // Memory is now a hard prerequisite for using the Master widget. When the
  // user flips this off, the widget re-pops the memory gate on the next open.
  const setPortraitEnabled = useCallback(async (next: boolean) => {
    if (!enabled) return
    setPortraitEnabledState(next) // optimistic
    try {
      await fetch('/api/profile/portrait/enabled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      // Notify any other component mirroring this field (e.g. the
      // /profile/portrait page's 暫停／啟用 toggle) so their local state
      // stays in sync with the DB — same cross-component sync pattern the
      // portrait page uses when IT toggles.
      publish('xuanji:portraitEnabledChanged', { enabled: next })
    } catch {
      /* ignore — local state already reflects the intent */
    }
  }, [enabled])

  const value = useMemo<MasterChatContextValue>(
    () => ({
      enabled,
      shape,
      setShape,
      toggleShape,
      messages,
      loading,
      toolStatus,
      pendingReading,
      greetingHints,
      disclosureSeen,
      portraitEnabled,
      sendMessage,
      notifyTyping,
      cancelPendingReading,
      startNewSession,
      clearSession,
      markDisclosureSeen,
      setPortraitEnabled,
      historyLoaded,
      widgetOpener,
      interruptCooldownUntil,
    }),
    [
      enabled, shape, toggleShape, messages, loading, toolStatus, pendingReading,
      greetingHints, disclosureSeen, portraitEnabled,
      sendMessage, notifyTyping, cancelPendingReading, startNewSession, clearSession,
      markDisclosureSeen, setPortraitEnabled, historyLoaded, widgetOpener,
      interruptCooldownUntil,
    ],
  )

  const actionsValue = useMemo<MasterChatActionsValue>(
    () => ({
      enabled,
      shape,
      setShape,
      toggleShape,
      sendMessage,
      notifyTyping,
      cancelPendingReading,
      startNewSession,
      clearSession,
      markDisclosureSeen,
      setPortraitEnabled,
      setViewingReading,
    }),
    [
      enabled,
      shape,
      setShape,
      toggleShape,
      sendMessage,
      notifyTyping,
      cancelPendingReading,
      startNewSession,
      clearSession,
      markDisclosureSeen,
      setPortraitEnabled,
      setViewingReading,
    ],
  )

  return (
    <MasterChatActionsContext.Provider value={actionsValue}>
      <MasterChatContext.Provider value={value}>{children}</MasterChatContext.Provider>
    </MasterChatActionsContext.Provider>
  )
}

export function useMasterChat(): MasterChatContextValue {
  const ctx = useContext(MasterChatContext)
  if (!ctx) {
    throw new Error('useMasterChat must be used within a MasterChatProvider')
  }
  return ctx
}

export function useMasterChatActions(): MasterChatActionsValue {
  const ctx = useContext(MasterChatActionsContext)
  if (!ctx) {
    throw new Error('useMasterChatActions must be used within a MasterChatProvider')
  }
  return ctx
}

/** Like useMasterChatActions, but returns null outside a MasterChatProvider. */
export function useOptionalMasterChatActions(): MasterChatActionsValue | null {
  return useContext(MasterChatActionsContext)
}
