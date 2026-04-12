'use client'

/**
 * MasterChatWidget — global two-shape Xuanji Master chat.
 *
 *   Shape 1 (collapsed):  thin bar pinned to the bottom of every page with
 *                         just an input + send button. Tapping it expands.
 *                         Shows a "waiting for your reading..." status when
 *                         a pendingReading is active.
 *
 *   Shape 2 (expanded):   fullscreen overlay (z-50) with transcript, input,
 *                         and a collapse button. Framer-motion spring
 *                         transitions between the two shapes.
 *
 * Driven entirely by MasterChatContext. Not mounted for anonymous users
 * (the provider's `enabled` flag gates the render).
 */

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMasterChat, type MasterMsg } from './MasterChatContext'
import { useLang } from '@/components/LanguageContext'
import { renderGreeting } from '@/lib/master/greetings'

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function MasterChatWidget() {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const {
    enabled,
    shape,
    setShape,
    messages,
    loading,
    toolStatus,
    pendingReading,
    greetingHints,
    disclosureSeen,
    sendMessage,
    startNewSession,
    clearSession,
    markDisclosureSeen,
  } = useMasterChat()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<null | 'newSession' | 'clearAll'>(null)

  // Templated greeting (NOT LLM-generated) — rendered when message list is
  // empty. State 1 (first-time) or State 2 (returning) is picked by hasReadings.
  const greeting = useMemo(
    () =>
      renderGreeting({
        lang: isEn ? 'en' : 'zh-TW',
        hasReadings: greetingHints.hasReadings,
        lastReading: greetingHints.lastReading,
        readingTypeCounts: greetingHints.readingTypeCounts,
      }),
    [isEn, greetingHints.hasReadings, greetingHints.lastReading, greetingHints.readingTypeCounts],
  )

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const userScrolledRef = useRef(false)
  const router = useRouter()

  // Auto-scroll transcript when new messages arrive, unless user scrolled up.
  useEffect(() => {
    if (shape !== 'expanded') return
    const el = scrollRef.current
    if (el && !userScrolledRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, toolStatus, shape])

  // Focus input when expanding.
  useEffect(() => {
    if (shape === 'expanded') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [shape])

  // C0: Hide the widget entirely on auth pages. The collapsed bar's input
  // field creates false affordance on pages whose single job is "log in".
  // Even if the user is authenticated (visiting /login to switch accounts),
  // the widget is irrelevant and distracting.
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  if (!enabled || isAuthPage) return null

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    userScrolledRef.current = false
    // If sending from collapsed, expand to show the response.
    if (shape === 'collapsed') setShape('expanded')
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

  const showWelcome = messages.length === 0

  // ─────────────────────────────────────────────────────────────────────────
  // Collapsed shape — bottom bar
  // ─────────────────────────────────────────────────────────────────────────
  if (shape === 'collapsed') {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--card-border)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg flex-shrink-0" aria-hidden>🧙‍♂️</span>

          {pendingReading ? (
            <div className="flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="font-serif" style={{ color: 'var(--gold)' }}>
                {isEn ? `Waiting for your ${pendingReading.type} reading...` : `等待 ${pendingReading.type} 占卜完成中...`}
              </span>
            </div>
          ) : (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              onFocus={() => { if (input.trim() === '') setShape('expanded') }}
              placeholder={isEn ? 'Ask Master Xuanji...' : '問問玄機大師...'}
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          )}

          <button
            onClick={() => setShape('expanded')}
            className="text-xs px-3 py-1.5 rounded-full transition-colors"
            style={{
              color: 'var(--gold)',
              border: '1px solid var(--border-gold, rgba(212,175,55,0.3))',
            }}
          >
            {isEn ? 'Open' : '展開'}
          </button>
        </div>
      </motion.div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Expanded shape — fullscreen overlay
  // ─────────────────────────────────────────────────────────────────────────
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
          className="relative w-full h-full sm:h-[85vh] sm:max-w-2xl flex flex-col rounded-none sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.98 }} />

          {/* Header */}
          <div
            className="relative flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-lg tracking-wide" style={{ color: 'var(--gold)' }}>
                {isEn ? 'Master Xuanji' : '玄機大師'}
              </span>
              {loading && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />}
              {/* H5: quick link to portrait/memory settings */}
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
              {/* Menu button — opens the actions popover */}
              <button
                onClick={() => setMenuOpen((m) => !m)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg hover:bg-[rgba(212,175,55,0.08)]"
                style={{ color: 'var(--text-muted)' }}
                aria-label={isEn ? 'Menu' : '選單'}
                aria-expanded={menuOpen}
              >
                ⋮
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

            {/* Actions popover */}
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-3 top-12 z-20 rounded-xl py-1.5 min-w-[200px]"
                    style={{
                      background: 'var(--card-bg, #1a1a2e)',
                      border: '1px solid var(--card-border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmAction('newSession')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[rgba(212,175,55,0.08)] transition-colors flex items-center gap-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span aria-hidden>🌙</span>
                      <span>{isEn ? 'Start new session' : '開始新對話'}</span>
                    </button>
                    <div className="h-px mx-3 my-1" style={{ background: 'var(--card-border)' }} />
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmAction('clearAll')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[rgba(220,38,38,0.08)] transition-colors flex items-center gap-2"
                      style={{ color: '#ff8a8a' }}
                    >
                      <span aria-hidden>🗑️</span>
                      <span>{isEn ? 'Forget everything about me' : '忘記關於我的一切'}</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scrollbar-thin"
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

            {messages.map((msg, i) => {
              const isUser = msg.role === 'user'

              // Hide empty assistant text bubbles. Empty bubbles arise when
              // the model only emitted tool calls (and the route's synthesis
              // pass produced no extra prose) or when a card was emitted as
              // the trailing message. Don't render a ghost bubble.
              const isLastMessage = i === messages.length - 1
              if (
                !isUser &&
                (msg.kind === 'text' || !msg.kind) &&
                !msg.content &&
                !(loading && isLastMessage)
              ) {
                return null
              }

              // CTA card message type — for new-reading prefill (gold filled style)
              if (msg.kind === 'cta_card' && msg.ctaPayload) {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-start"
                  >
                    <div
                      className="max-w-[90%] sm:max-w-[80%] rounded-xl p-4"
                      style={{
                        background: 'var(--accent-bg, rgba(212,175,55,0.08))',
                        border: '1px solid var(--border-gold, rgba(212,175,55,0.35))',
                      }}
                    >
                      <div className="font-serif text-sm mb-1.5" style={{ color: 'var(--gold)' }}>
                        {msg.ctaPayload.ctaTitle}
                      </div>
                      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                        {msg.ctaPayload.ctaDescription}
                      </p>
                      <button
                        onClick={() => handleCtaClick(msg)}
                        className="text-sm px-4 py-2 rounded-lg font-medium transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                        style={{ backgroundColor: 'var(--gold)', color: '#000' }}
                      >
                        {msg.ctaPayload.ctaLabel}
                      </button>
                    </div>
                  </motion.div>
                )
              }

              // Reading card — reference to an existing reading. Visually
              // distinct from CTA: outlined (not filled), scroll icon, and
              // navigates without setting pendingReading.
              if (msg.kind === 'reading_card' && msg.readingCardPayload) {
                const card = msg.readingCardPayload
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-start"
                  >
                    <button
                      onClick={() => {
                        setShape('collapsed')
                        router.push(card.url)
                      }}
                      className="max-w-[90%] sm:max-w-[80%] rounded-xl p-3.5 text-left transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                      style={{
                        background: 'transparent',
                        border: '1px dashed var(--border-gold, rgba(212,175,55,0.4))',
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base flex-shrink-0 mt-0.5" aria-hidden>
                          {{ bazi: '🏛️', ziwei: '⭐', iching: '☯', qimen: '🧭', liuyao: '🪙', meihua: '🌸', fengshui: '🏯' }[card.divinationType] ?? '📜'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-sm" style={{ color: 'var(--gold)' }}>
                            {card.title}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {card.subtitle}
                          </div>
                          {card.note && (
                            <div className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                              {card.note}
                            </div>
                          )}
                          <div className="text-[10px] mt-1.5" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                            {isEn ? 'Click to open →' : '點擊查看 →'}
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                )
              }

              // Text message (user or assistant)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3"
                    style={{
                      background: isUser ? 'var(--accent-bg)' : 'var(--card-bg)',
                      border: `1px solid ${isUser ? 'var(--border-gold)' : 'var(--card-border)'}`,
                    }}
                  >
                    {isUser ? (
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: 'var(--text-primary, #e0e0e0)' }}
                      >
                        {msg.content}
                      </p>
                    ) : msg.content ? (
                      <div
                        className="text-sm leading-relaxed font-serif prose-master"
                        style={{ color: 'var(--text-primary, #e0e0e0)' }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      loading && (
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_infinite]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.2s_infinite]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.4s_infinite]" />
                        </span>
                      )
                    )}
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              )
            })}

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
                placeholder={isEn ? 'Ask the Master...' : '請問大師...'}
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  maxHeight: '120px',
                }}
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-20 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                style={{ backgroundColor: 'var(--gold)', color: '#000' }}
              >
                {isEn ? 'Send' : '發送'}
              </button>
            </div>
          </div>

          {/* Confirmation modal for destructive actions */}
          <AnimatePresence>
            {confirmAction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center p-6"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="max-w-md rounded-xl p-6"
                  style={{
                    background: 'var(--card-bg, #1a1a2e)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  {confirmAction === 'newSession' ? (
                    <>
                      <h3 className="font-serif text-lg mb-3" style={{ color: 'var(--gold)' }}>
                        {isEn ? 'Start new session?' : '開始新對話？'}
                      </h3>
                      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                        {isEn
                          ? "I'll archive this conversation and start fresh, but I'll keep your charts and what I've learned about you. Your reading history is not affected."
                          : '我會把這段對話收起來，從頭開始 — 但你的命盤和我對你的了解都會保留。占卜歷史不受影響。'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-serif text-lg mb-3" style={{ color: '#ff8a8a' }}>
                        {isEn ? 'Forget everything about you?' : '忘記關於你的一切？'}
                      </h3>
                      <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                        {isEn
                          ? "This will permanently delete all our conversations and everything I've learned about you. Your reading history and personal profile are NOT affected. This cannot be undone."
                          : '這將永久刪除我們的所有對話和我對你的全部了解。你的占卜歷史和個人檔案不受影響。無法復原。'}
                      </p>
                    </>
                  )}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-4 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        color: 'var(--text-muted)',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      {isEn ? 'Cancel' : '取消'}
                    </button>
                    <button
                      onClick={async () => {
                        const action = confirmAction
                        setConfirmAction(null)
                        if (action === 'newSession') await startNewSession()
                        if (action === 'clearAll') await clearSession()
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: confirmAction === 'clearAll' ? '#dc2626' : 'var(--gold)',
                        color: confirmAction === 'clearAll' ? '#fff' : '#000',
                      }}
                    >
                      {confirmAction === 'newSession'
                        ? (isEn ? 'Start new session' : '開始新對話')
                        : (isEn ? 'Forget everything' : '全部忘記')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* First-use disclosure modal */}
          <AnimatePresence>
            {!disclosureSeen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center p-6"
                style={{ background: 'rgba(0,0,0,0.65)' }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="max-w-lg rounded-2xl p-7"
                  style={{
                    background: 'var(--card-bg, #1a1a2e)',
                    border: '1px solid var(--border-gold, rgba(212,175,55,0.4))',
                  }}
                >
                  <h3 className="font-serif text-xl mb-4" style={{ color: 'var(--gold)' }}>
                    {isEn ? 'Master Xuanji remembers' : '玄機大師的記憶功能'}
                  </h3>
                  <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                    {isEn ? (
                      <>
                        <p>
                          To give better readings across our conversations, I will remember:
                          your interests (career, family, health…), how you prefer responses
                          (concise vs. detailed), and stable life context you've shared.
                        </p>
                        <p style={{ color: 'var(--text-muted)' }}>
                          <strong>Not recorded:</strong> momentary moods, one-off questions, or
                          private content unrelated to your charts. Chart data lives in your
                          reading history, not in my memory.
                        </p>
                        <p>
                          You can view, edit, pause, or delete this memory anytime in your profile.
                          It's also included in your data export.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          為了在多次對話中給你更貼近的解讀，我會記下：你常關心的主題（事業、家庭、健康…）、你偏好的回應方式（簡潔／詳細），以及你提過的穩定生活背景。
                        </p>
                        <p style={{ color: 'var(--text-muted)' }}>
                          <strong>不會記錄：</strong>一次性的情緒、臨時的煩惱、與命盤無關的私人內容。命盤資料存在你的占卜歷史裡，不在我的「記憶」裡。
                        </p>
                        <p>
                          你可以隨時在個人資料中查看、編輯、暫停或刪除這份記憶。它也會包含在你的資料匯出中。
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <button
                      onClick={async () => {
                        // Opt-out: disable portrait, mark disclosure seen, close modal
                        try {
                          await fetch('/api/profile/portrait/enabled', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enabled: false }),
                          })
                        } catch { /* ignore */ }
                        await markDisclosureSeen()
                      }}
                      className="px-4 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        color: 'var(--text-muted)',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      {isEn ? 'Disable memory' : '關閉記憶功能'}
                    </button>
                    <button
                      onClick={async () => {
                        await markDisclosureSeen()
                      }}
                      className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: 'var(--gold)', color: '#000' }}
                    >
                      {isEn ? 'Got it, continue' : '我了解，繼續使用'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
