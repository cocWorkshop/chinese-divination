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
import { useLang } from '@/components/LanguageContext'

// ---------------------------------------------------------------------------
// Message shapes used inside the widget transcript
// ---------------------------------------------------------------------------

export interface CtaCardPayload {
  url: string
  ctaLabel: string
  ctaTitle: string
  ctaDescription: string
  divinationType: string
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
  kind?: 'text' | 'cta_card' | 'reading_card' | 'greeting'
  ctaPayload?: CtaCardPayload
  readingCardPayload?: ReadingCardPayload
}

export interface ToolStatus {
  name: string
  label: string
}

type Shape = 'collapsed' | 'expanded'

/**
 * Greeting state hydrated from GET /api/master. Used by the widget to render
 * a templated greeting (not LLM-generated) when the message list is empty.
 */
export interface GreetingHints {
  hasReadings: boolean
  lastReading: { type: string; createdAt: string } | null
  readingTypeCounts: Record<string, number>
}

interface MasterChatContextValue {
  enabled: boolean
  shape: Shape
  setShape: (s: Shape) => void
  toggleShape: () => void
  messages: MasterMsg[]
  loading: boolean
  toolStatus: ToolStatus | null
  pendingReading: { type: string; url: string } | null
  greetingHints: GreetingHints
  /** Whether the user has seen the master memory first-use disclosure modal. */
  disclosureSeen: boolean
  /** Whether portrait extraction + personalized prompt are enabled for this user. */
  portraitEnabled: boolean
  sendMessage: (content: string) => Promise<void>
  /** Soft reset — archives chat history, keeps portrait. */
  startNewSession: () => Promise<void>
  /** Hard reset — wipes chat history AND portrait. "Forget everything." */
  clearSession: () => Promise<void>
  /** Mark the disclosure modal as seen (called by the widget after the user dismisses it). */
  markDisclosureSeen: () => Promise<void>
  historyLoaded: boolean
}

const MasterChatContext = createContext<MasterChatContextValue | null>(null)

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
  if (m) return lang === 'en' ? m.en : m.zh
  return lang === 'en' ? 'Processing...' : '處理中...'
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
  const [pendingReading, setPendingReading] = useState<{ type: string; url: string } | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [greetingHints, setGreetingHints] = useState<GreetingHints>({
    hasReadings: false,
    lastReading: null,
    readingTypeCounts: {},
  })
  const [disclosureSeen, setDisclosureSeen] = useState(true) // optimistic — set to false if GET says null
  const [portraitEnabled, setPortraitEnabled] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false)

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
      const res = await fetch('/api/master')
      if (!res.ok) {
        setHistoryLoaded(true)
        return
      }
      const data = (await res.json()) as {
        messages?: MasterMsg[]
        hasReadings?: boolean
        lastReading?: { type: string; createdAt: string } | null
        readingTypeCounts?: Record<string, number>
        disclosureSeen?: boolean
        portraitEnabled?: boolean
      }
      if (data.messages?.length) {
        setMessages(
          data.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ ...m, kind: m.kind ?? 'text' })),
        )
      } else {
        // Fresh load with empty messages (e.g. after a soft reset) — clear
        // any stale local state.
        setMessages([])
      }
      setGreetingHints({
        hasReadings: data.hasReadings ?? false,
        lastReading: data.lastReading ?? null,
        readingTypeCounts: data.readingTypeCounts ?? {},
      })
      setDisclosureSeen(data.disclosureSeen ?? true)
      setPortraitEnabled(data.portraitEnabled ?? true)
      setHistoryLoaded(true)
    } catch {
      setHistoryLoaded(true)
    }
  }, [enabled])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // ── Core send-message + SSE parse loop ───────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled || sendingRef.current) return
      const trimmed = content.trim()
      if (!trimmed) return

      sendingRef.current = true
      setLoading(true)

      const userMsg: MasterMsg = {
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
        kind: 'text',
      }
      setMessages((prev) => [...prev, userMsg])

      // Pre-allocate an assistant message slot we will stream into.
      const assistantMsg: MasterMsg = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        kind: 'text',
      }
      setMessages((prev) => [...prev, assistantMsg])

      try {
        abortRef.current = new AbortController()
        const res = await fetch('/api/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }))
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...assistantMsg,
              content: (err as { error?: string }).error ?? '抱歉，出了點問題。',
            }
            return updated
          })
          return
        }

        const reader = res.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

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
              }

              if (event.type === 'content') {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  updated[updated.length - 1] = { ...last, content: last.content + (event.text ?? '') }
                  return updated
                })
              } else if (event.type === 'tool_start') {
                setToolStatus({ name: event.tool ?? '', label: labelFor(event.tool ?? '', lang) })
              } else if (event.type === 'tool_end') {
                setToolStatus(null)
              } else if (event.type === 'cta_card' && event.payload) {
                // Append a special CTA card message AFTER the current assistant text.
                const payload = event.payload as CtaCardPayload
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    kind: 'cta_card',
                    ctaPayload: payload,
                  },
                ])
                setPendingReading({ type: payload.divinationType, url: payload.url })
              } else if (event.type === 'reading_card' && event.payload) {
                // Reference card linking to an existing reading. Visually
                // distinct from cta_card; does NOT set pendingReading because
                // there's no new reading being awaited.
                //
                // Per Template A in master.md, the typical flow is:
                //   headline content → show_reading_card → invitation content
                // So we push the card AND a new empty text message slot so the
                // trailing prose has a target — otherwise subsequent `content`
                // events would be appended to the card message, which doesn't
                // render `content`.
                const payload = event.payload as ReadingCardPayload
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    kind: 'reading_card',
                    readingCardPayload: payload,
                  },
                  {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    kind: 'text',
                  },
                ])
              } else if (event.type === 'error') {
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...assistantMsg,
                    content: event.error ?? '抱歉，出了點問題。',
                  }
                  return updated
                })
              } else if (event.type === 'done') {
                /* stream complete */
              }
            } catch {
              /* ignore malformed frames */
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...assistantMsg,
              content: lang === 'en' ? 'Connection interrupted. Please retry.' : '連接中斷，請重試。',
            }
            return updated
          })
        }
      } finally {
        setLoading(false)
        setToolStatus(null)
        sendingRef.current = false
      }
    },
    [enabled, lang],
  )

  // ── Reading completion handoff ────────────────────────────────────────────
  // When the divination page saves a new reading, it dispatches a window
  // CustomEvent. If the master has a pendingReading matching the type, we
  // auto-inject a synthetic user turn so the model can fetch the new row via
  // list_readings / get_reading on its next turn.
  useEffect(() => {
    if (!enabled) return

    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ readingId: string; type: string }>).detail
      if (!detail) return
      if (pendingReading && pendingReading.type === detail.type) {
        setPendingReading(null)
        // Auto-expand the widget so the user sees the master's response.
        setShape('expanded')
        // Inject a synthetic user message so the LLM picks up context.
        const synthetic = lang === 'en'
          ? `The ${detail.type} reading is ready (id: ${detail.readingId}). Please continue.`
          : `${detail.type} 的占卜結果已出 (id: ${detail.readingId})，請繼續分析。`
        sendMessage(synthetic)
      }
    }

    window.addEventListener('xuanji:readingComplete', handler as EventListener)
    return () => window.removeEventListener('xuanji:readingComplete', handler as EventListener)
  }, [enabled, pendingReading, sendMessage, lang])

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
    setGreetingHints({ hasReadings: false, lastReading: null, readingTypeCounts: {} })
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
      startNewSession,
      clearSession,
      markDisclosureSeen,
      historyLoaded,
    }),
    [
      enabled, shape, toggleShape, messages, loading, toolStatus, pendingReading,
      greetingHints, disclosureSeen, portraitEnabled,
      sendMessage, startNewSession, clearSession, markDisclosureSeen, historyLoaded,
    ],
  )

  return <MasterChatContext.Provider value={value}>{children}</MasterChatContext.Provider>
}

export function useMasterChat(): MasterChatContextValue {
  const ctx = useContext(MasterChatContext)
  if (!ctx) {
    throw new Error('useMasterChat must be used within a MasterChatProvider')
  }
  return ctx
}
