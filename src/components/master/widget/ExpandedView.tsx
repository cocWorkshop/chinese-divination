'use client'

/**
 * Expanded shape — fullscreen overlay (z-50) with header, transcript, and
 * input row. Owns its own input state, scroll refs, and the new-chat
 * confirm modal. The widget-level memory gate modal renders ABOVE this
 * view and is signaled via `onRequestGate`.
 *
 * Auto-scroll behavior: snaps instantly to the bottom on first paint after
 * open (so the user lands at the latest turn), then smooth-scrolls for
 * subsequent message arrivals — unless the user has scrolled up.
 */

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useMasterChat, type MasterMsg } from '../MasterChatContext'
import { useLang } from '@/components/LanguageContext'
import { renderGreeting } from '@/lib/master/greetings'
import MessageBubble from './MessageBubble'
import type { GateIntent } from './CollapsedBar'

interface Props {
  needsMemoryGate: boolean
  onRequestGate: (intent: GateIntent) => void
}

export default function ExpandedView({ needsMemoryGate, onRequestGate }: Props) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const {
    setShape,
    messages,
    loading,
    toolStatus,
    greetingHints,
    sendMessage,
    startNewSession,
    widgetOpener,
  } = useMasterChat()

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const userScrolledRef = useRef(false)
  // True for the first scroll-effect fire after the view mounts. Lets us
  // snap instantly to the bottom on open instead of smooth-scrolling from
  // top → bottom (which exposes the entire history in fast-forward).
  const justOpenedRef = useRef(true)
  const router = useRouter()

  // Templated greeting (NOT LLM-generated) — rendered when the message list
  // is empty.
  const greeting = useMemo(
    () =>
      renderGreeting({
        lang: isEn ? 'en' : 'zh-TW',
        hasReadings: greetingHints.hasReadings,
        lastReading: greetingHints.lastReading,
        readingTypeCounts: greetingHints.readingTypeCounts,
        temporalContext: greetingHints.temporalContext,
        // Reuse the opener picked once at provider mount — the user
        // already saw this exact line in the collapsed bar's hint, so
        // randomizing again here would produce two introductions.
        presetOpener: widgetOpener,
      }),
    [
      isEn,
      greetingHints.hasReadings,
      greetingHints.lastReading,
      greetingHints.readingTypeCounts,
      greetingHints.temporalContext,
      widgetOpener,
    ],
  )

  // Auto-scroll on new messages. Instant on first paint, smooth thereafter.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || userScrolledRef.current) return
    const behavior: ScrollBehavior = justOpenedRef.current ? 'auto' : 'smooth'
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
    if (justOpenedRef.current) justOpenedRef.current = false
  }, [messages, toolStatus])

  // Focus input on mount.
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    if (needsMemoryGate) {
      onRequestGate({ kind: 'send', message: msg })
      return
    }
    setInput('')
    userScrolledRef.current = false
    sendMessage(msg)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledRef.current = distanceFromBottom > 80
  }

  const handleCtaClick = (msg: MasterMsg) => {
    if (!msg.ctaPayload) return
    setShape('collapsed')
    router.push(msg.ctaPayload.url)
  }

  const handleReadingCardClick = (url: string) => {
    setShape('collapsed')
    router.push(url)
  }

  const showWelcome = messages.length === 0

  return (
    <AnimatePresence>
      <motion.div
        key="expanded"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      >
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.06) 0%, var(--bg-primary) 70%)' }}
        />

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="relative w-full max-w-[100vw] h-full sm:h-[85vh] sm:max-w-2xl flex flex-col rounded-none sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.98 }} />

          {/* Header */}
          <div
            className="relative flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="text-xl leading-none"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(212,175,55,0.4))' }}
                aria-hidden
              >
                🧙‍♂️
              </span>
              <span className="font-serif text-lg tracking-wide" style={{ color: 'var(--gold)' }}>
                {isEn ? 'Master Xuanji' : '玄機大師'}
              </span>
              {loading && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />}
              <button
                onClick={() => { setShape('collapsed'); router.push('/profile/portrait') }}
                className="text-[10px] px-2 py-0.5 rounded-full transition-colors hover:bg-[rgba(212,175,55,0.08)]"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
                title={isEn ? 'Memory settings' : '記憶設定'}
              >
                {isEn ? 'Memory' : '記憶'}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { void startNewSession() }}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs transition-colors hover:bg-[rgba(212,175,55,0.08)]"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
                title={isEn ? 'Start a new chat' : '開始新對話'}
              >
                <span aria-hidden>🌙</span>
                <span>{isEn ? 'New chat' : '新對話'}</span>
              </button>
              <button
                onClick={() => setShape('collapsed')}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Collapse"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scrollbar-thin"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {showWelcome && (
              <div className="flex flex-col items-center text-center pt-8 pb-4">
                <div className="w-16 h-px mb-6" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
                <p
                  className="font-serif text-sm sm:text-base leading-relaxed whitespace-pre-line max-w-md"
                  style={{ color: 'var(--text-primary, #e0e0e0)' }}
                >
                  {greeting.text}
                </p>
                <div className="w-16 h-px mt-6" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {greeting.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-xs px-3.5 py-2 rounded-full border hover:bg-[rgba(212,175,55,0.08)] transition-all"
                      style={{ color: 'var(--gold)', borderColor: 'var(--border-gold, rgba(212,175,55,0.2))' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                isLastMessage={i === messages.length - 1}
                loading={loading}
                isEn={isEn}
                onCtaClick={handleCtaClick}
                onReadingCardClick={handleReadingCardClick}
              />
            ))}

            {/* Tool running indicator */}
            <AnimatePresence>
              {toolStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl px-4 py-3" style={{ border: '1px solid var(--border-gold)', background: 'var(--accent-bg)' }}>
                    <div className="flex items-center gap-3">
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{ background: 'var(--gold)', opacity: 0.15, animation: 'toolPulse 1.5s ease infinite' }}
                        />
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
                      </div>
                      <span className="text-sm font-serif" style={{ color: 'var(--gold)' }}>
                        {toolStatus.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input row */}
          <div className="relative px-4 sm:px-5 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={(e) => {
                  // If memory was paused while the widget was still expanded
                  // (e.g. user toggled on /profile/portrait), block typing and
                  // pop the gate.
                  if (needsMemoryGate) {
                    onRequestGate({ kind: 'open' })
                    e.currentTarget.blur()
                  }
                }}
                placeholder={isEn ? 'Ask the Master...' : '請問大師...'}
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  maxHeight: '120px',
                }}
                disabled={loading || needsMemoryGate}
              />
              <button
                onClick={() => {
                  if (needsMemoryGate) {
                    onRequestGate({ kind: 'open' })
                    return
                  }
                  handleSend()
                }}
                disabled={loading || (!needsMemoryGate && !input.trim())}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-20 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                style={{ backgroundColor: 'var(--gold)', color: '#000' }}
              >
                {isEn ? 'Send' : '發送'}
              </button>
            </div>
          </div>

        </motion.div>

        {/* CSS for dot + tool pulse animations */}
        <style jsx global>{`
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
          @keyframes toolPulse {
            0%, 100% { transform: scale(1); opacity: 0.15; }
            50% { transform: scale(1.8); opacity: 0; }
          }
          .prose-master p { margin: 0.3em 0; }
          .prose-master strong { color: var(--gold); }
          .scrollbar-thin::-webkit-scrollbar { width: 4px; }
          .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
          .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 2px; }
        `}</style>
      </motion.div>
    </AnimatePresence>
  )
}
