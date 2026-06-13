'use client'

/**
 * View 4 of the /start ad funnel — the relationship-building moment.
 *
 * Trial user has just seen their bazi reading. Now they meet the master:
 * a real LLM-streamed conversation grounded in their own chart, kicked
 * off by chip suggestions. The point is to convert "I tried a tool" into
 * "I had a conversation with this thing" — relationship anchor for the
 * paywall on View 5.
 *
 * Auth: funnel cookie (set in /api/start/init). /api/master accepts it
 * the same way /api/divination does. Each master turn deducts master
 * Karma (1 per turn) from the trial allotment — TRIAL_CREDITS=10 budgets
 * for ~5 turns after the bazi reading consumed 5.
 *
 * Flow:
 *   1. On mount, fire /api/master with `{ checkin: true }` so the master
 *      speaks first based on the just-completed reading.
 *   2. Show 3 hardcoded chips that demo the master's three core powers
 *      (focused section dive / temporal context / family chart).
 *   3. After the user's first chip + master reply, surface the bottom
 *      CTA to View 5.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const STARTER_CHIPS = [
  '我的事業運如何？',
  '今年的運勢，請細看',
  '想為配偶也起一張盤',
]

export default function StartMasterPage() {
  const router = useRouter()
  const params = useParams()
  const readingId = params?.id as string

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [streaming, setStreaming] = useState(false)
  const [userTurns, setUserTurns] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const checkinFiredRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  // Fire the proactive checkin once on mount — the master speaks first.
  useEffect(() => {
    if (checkinFiredRef.current) return
    checkinFiredRef.current = true
    void runTurn({ checkin: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runTurn(payload: { checkin: true } | { message: string }) {
    if (streaming) return
    setStreaming(true)
    setErrorMsg(null)

    const isUserMessage = 'message' in payload
    if (isUserMessage) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: payload.message, timestamp: Date.now() },
      ])
    }

    // Pre-allocate an assistant slot to stream into.
    setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setErrorMsg(data.error || '玄機大師暫時無法回應')
        setStreaming(false)
        return
      }
      const reader = res.body?.getReader()
      if (!reader) { setStreaming(false); return }
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
          const raw = line.slice(6)
          if (!raw || raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw) as { type: string; text?: string; error?: string }
            if (ev.type === 'content' && ev.text) {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + ev.text }
                }
                return updated
              })
            } else if (ev.type === 'error') {
              setErrorMsg(ev.error || '對話中斷')
            }
          } catch { /* ignore malformed frames */ }
        }
      }
    } catch (e) {
      setErrorMsg((e as Error).message || '連線失敗')
    } finally {
      setStreaming(false)
      if (isUserMessage) setUserTurns((n) => n + 1)
    }
  }

  const onChipClick = (text: string) => {
    if (streaming) return
    void runTurn({ message: text })
  }

  return (
    <main className="flex-1 flex flex-col px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full pb-32">
      {/* ── Hook ─────────────────────────────────────────────────────────── */}
      <header className="text-center mb-5">
        <h2 className="font-serif text-xl mb-1" style={{ color: 'var(--gold)' }}>
          您剛看到的，只是命盤的開端
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          玄機大師將陪您逐段細看 — 以萬卷之識，承中華命理之道
        </p>
      </header>

      {/* ── Transcript ──────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[280px] glass-card rounded-2xl p-4 mb-3 space-y-3 overflow-y-auto"
        style={{ border: '1px solid var(--card-border)', maxHeight: '50vh' }}
      >
        {messages.length === 0 && !streaming && (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
            玄機大師正在靠近…
          </p>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          // Skip empty assistant slots that aren't currently streaming.
          if (!isUser && !m.content && !(streaming && i === messages.length - 1)) return null
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                style={{
                  background: isUser ? 'var(--accent-bg)' : 'var(--card-bg)',
                  border: `1px solid ${isUser ? 'var(--border-gold)' : 'var(--card-border)'}`,
                }}
              >
                {m.content ? (
                  <p
                    className={`text-sm leading-relaxed ${isUser ? '' : 'font-serif'} whitespace-pre-line`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {m.content}
                    {/* Live typing cursor — renders only on the streaming
                        assistant bubble (last message in transcript while
                        `streaming` is true). Echoes the terminal-style
                        cursor used in the View 1 typewriter for visual
                        consistency across the funnel. */}
                    {!isUser && streaming && i === messages.length - 1 && (
                      <span
                        aria-hidden
                        className="inline-block ml-[1px] align-baseline"
                        style={{
                          width: '0.55ch',
                          borderBottom: '2px solid var(--gold)',
                          animation: 'xjMasterCursor 1s step-end infinite',
                        }}
                      >&nbsp;</span>
                    )}
                  </p>
                ) : streaming ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_infinite]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.2s_infinite]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.4s_infinite]" />
                  </span>
                ) : null}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Chip suggestions ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!streaming && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2 justify-center mb-3"
          >
            {STARTER_CHIPS.map((chip, i) => (
              <motion.button
                key={chip}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                onClick={() => onChipClick(chip)}
                className="text-xs px-3.5 py-2 rounded-full transition-all hover:bg-[rgba(212,175,55,0.12)] hover:shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:scale-[1.03]"
                style={{ color: 'var(--gold)', border: '1px solid var(--border-gold)' }}
              >
                {chip}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <p className="text-xs text-red-400 text-center mb-3">{errorMsg}</p>
      )}

      {/* ── Three pitch bullets — staggered fade-in for a deliberate reveal ── */}
      <div className="grid sm:grid-cols-3 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {[
          { icon: '🔮', title: '逐段深析', sub: '點哪段問哪段' },
          { icon: '🪶', title: '跨命盤互參', sub: '八字、紫微、家人合盤' },
          { icon: '📜', title: '跨會話記憶', sub: '大師會記得您' },
        ].map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
            className="rounded-lg p-2.5"
            style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}
          >
            <span className="font-serif" style={{ color: 'var(--gold)' }}>{p.icon} {p.title}</span>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Bottom CTA (appears after 1+ user turn) ──────────────────────── */}
      {userTurns >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-30 p-4 backdrop-blur-md border-t"
          style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              想繼續這場對話？
            </p>
            <button
              onClick={() => router.push(`/start/unlock/${readingId}`)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-sm transition-all hover:shadow-[0_0_18px_rgba(212,175,55,0.4)]"
              style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
            >
              領取 50 機緣 + 解鎖完整命盤 →
            </button>
          </div>
        </motion.div>
      )}

      <style jsx global>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes xjMasterCursor {
          0%, 60% { opacity: 1; }
          61%, 100% { opacity: 0; }
        }
      `}</style>
    </main>
  )
}
