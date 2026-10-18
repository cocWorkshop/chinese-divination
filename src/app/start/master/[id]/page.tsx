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
import { MasterSageIcon, KeyPredictionIcon, DivinationIcon } from '@/components/DivinationIcons'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export default function StartMasterPage() {
  const router = useRouter()
  const params = useParams()
  const readingId = params?.id as string

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [streaming, setStreaming] = useState(false)
  const [chips, setChips] = useState<string[]>([])
  const [userTurns, setUserTurns] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialFiredRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  // Scroll transcript to bottom on new messages / chunks.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming])

  // Cleanup abort on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // Mount effect: kick off master check-in turn.
  useEffect(() => {
    if (initialFiredRef.current) return
    initialFiredRef.current = true
    void runTurn({ checkin: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runTurn = async (payload: { checkin?: boolean; message?: string }) => {
    const isUserMessage = Boolean(payload.message)
    if (isUserMessage && payload.message) {
      setMessages((prev) => [...prev, { role: 'user', content: payload.message! }])
    }
    setStreaming(true)
    setErrorMsg(null)

    // Prepare an empty assistant slot to stream into.
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch('/api/master', {
        method: 'POST',
        signal: ac.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          readingId,
          ...(payload.checkin ? { checkin: true } : { message: payload.message }),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '大師暫未能回應，請稍後再試')
      }

      if (!res.body) throw new Error('ReadableStream not supported')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6).trim()
          if (!dataStr) continue
          let parsed: any
          try {
            parsed = JSON.parse(dataStr)
          } catch {
            continue
          }

          if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
            setMessages((prev) => {
              if (prev.length === 0) return prev
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + parsed.text }
              }
              return next
            })
          } else if (parsed.type === 'chips' && Array.isArray(parsed.chips)) {
            setChips(parsed.chips.filter((c: unknown): c is string => typeof c === 'string'))
          } else if (parsed.type === 'error' && typeof parsed.message === 'string') {
            setErrorMsg(parsed.message)
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = e instanceof Error ? e.message : '連線中斷'
      setErrorMsg(msg)
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
        <h2 className="font-serif text-xl mb-1 text-gold">
          您剛看到的，只是命盤的開端
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          玄機大師將陪您逐段細看 — 以萬卷之識，承中華命理之道
        </p>
      </header>

      {/* ── Transcript ──────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[280px] oriental-sanctuary-card rounded-2xl p-4 mb-3 space-y-3 overflow-y-auto shadow-md"
        style={{ maxHeight: '50vh' }}
      >
        {messages.length === 0 && !streaming && (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
            玄機大師正在靠近…
          </p>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-gold shadow-sm">
                  <MasterSageIcon className="w-4 h-4" />
                </div>
              )}
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
                    {/* Live typing cursor */}
                    {!isUser && streaming && i === messages.length - 1 && (
                      <span
                        aria-hidden
                        className="inline-block ml-[1px] align-baseline"
                        style={{
                          width: '0.55ch',
                          borderBottom: '2px solid var(--gold)',
                          animation: 'xjCursorBlink 0.9s steps(2, start) infinite',
                        }}
                      />
                    )}
                  </p>
                ) : (
                  <p className="text-xs font-serif italic" style={{ color: 'var(--text-muted)' }}>
                    大師正沈吟思索…
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Chips ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!streaming && chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {chips.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChipClick(c)}
                className="px-3 py-1.5 min-h-[44px] rounded-full text-xs font-serif transition-all hover:scale-[1.02] active:scale-[0.98] border border-gold/30 hover:border-gold hover:bg-gold/10 text-gold-light/90"
              >
                {c}
              </button>
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
          { icon: <KeyPredictionIcon className="w-3.5 h-3.5 text-gold inline-block" />, title: '逐段深析', sub: '點哪段問哪段' },
          { icon: <DivinationIcon type="bazi" className="w-3.5 h-3.5 text-gold inline-block" />, title: '跨命盤互參', sub: '八字、紫微、家人合盤' },
          { icon: <MasterSageIcon className="w-3.5 h-3.5 text-gold inline-block" />, title: '跨會話記憶', sub: '大師會記得您' },
        ].map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
            className="oriental-sanctuary-card rounded-xl p-3 shadow-sm"
          >
            <div className="font-serif text-gold flex items-center gap-1.5 mb-0.5">
              {p.icon}
              <span>{p.title}</span>
            </div>
            <p className="text-[11px] text-foreground/50">{p.sub}</p>
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
