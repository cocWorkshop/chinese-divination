'use client'

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMasterChat } from '@/hooks/useMasterChat'

interface MasterChatProps {
  onClose: () => void
  lang: string
}

const welcomeText: Record<string, string> = {
  zh: '施主有禮了。\n我是玄機，修習命理數十年，略通八字、紫微、奇門之術。\n你有什麼想了解的，儘管問吧。',
  en: 'Greetings.\nI am Xuanji, a master of Chinese metaphysics for decades.\nWhat would you like to know?',
}

const suggestions: Record<string, string[]> = {
  zh: ['幫我看看今年運勢', '我的八字如何？', '最近事業有什麼變化？'],
  en: ['How is my luck this year?', 'Analyze my BaZi', 'Any career changes ahead?'],
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function MasterChat({ onClose, lang }: MasterChatProps) {
  const isEn = lang === 'en'
  const { messages, loading, toolStatus, credits, historyLoaded, sendMessage, loadHistory } = useMasterChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const userScrolledRef = useRef(false)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Track user scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledRef.current = distanceFromBottom > 80
  }, [])

  // Auto-scroll respecting user scroll position
  useEffect(() => {
    const el = scrollRef.current
    if (el && !userScrolledRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, toolStatus])

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    userScrolledRef.current = false
    sendMessage(msg, isEn ? 'en' : 'zh')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showWelcome = historyLoaded && messages.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Atmospheric bg — adapts to theme */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.06) 0%, var(--bg-primary) 70%)',
        }}
      />

      {/* Main container */}
      <div className="relative w-full h-full sm:h-[85vh] sm:max-w-2xl flex flex-col rounded-none sm:rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid var(--card-border)' }}>
        <div className="absolute inset-0" style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.98 }} />

        {/* Header — minimal */}
        <div className="relative flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg tracking-wide" style={{ color: 'var(--gold)' }}>
              {isEn ? 'Master Xuanji' : '玄機大師'}
            </span>
            {loading && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scrollbar-thin"
        >
          {/* Welcome */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center text-center pt-8 pb-4"
              >
                {/* Golden divider line */}
                <div className="w-16 h-px mb-6" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
                <p className="font-serif text-sm sm:text-base leading-relaxed whitespace-pre-line max-w-md" style={{ color: 'var(--text-primary, #e0e0e0)' }}>
                  {isEn ? welcomeText.en : welcomeText.zh}
                </p>
                <div className="w-16 h-px mt-6" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

                {/* Suggestion chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {(isEn ? suggestions.en : suggestions.zh).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-xs px-3.5 py-2 rounded-full border border-[var(--gold)]/20 hover:border-[var(--gold)]/50 hover:bg-[var(--gold)]/5 transition-all"
                      style={{ color: 'var(--gold)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const isLastAssistant = !isUser && i === messages.length - 1
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
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-line ${!isUser ? 'font-serif' : ''}`}
                    style={{ color: 'var(--text-primary, #e0e0e0)' }}
                  >
                    {msg.content}
                    {isLastAssistant && loading && !msg.content && (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_infinite]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.2s_infinite]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.4s_infinite]" />
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</p>
                </div>
              </motion.div>
            )
          })}

          {/* Tool status animation */}
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
                    {/* Golden pulse line */}
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'var(--gold)',
                          opacity: 0.15,
                          animation: 'toolPulse 1.5s ease infinite',
                        }}
                      />
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
                    </div>
                    <span className="text-sm font-serif" style={{ color: 'var(--gold)' }}>
                      {toolStatus.label}
                    </span>
                    {/* Drifting dots */}
                    <span className="flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-[var(--gold)]/60 animate-[drift_1.8s_ease_infinite]" />
                      <span className="w-1 h-1 rounded-full bg-[var(--gold)]/40 animate-[drift_1.8s_ease_0.3s_infinite]" />
                      <span className="w-1 h-1 rounded-full bg-[var(--gold)]/20 animate-[drift_1.8s_ease_0.6s_infinite]" />
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input area */}
        <div className="relative px-4 sm:px-5 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>
          {credits !== null && (
            <p className="text-[10px] mb-1.5 text-right" style={{ color: 'var(--text-muted)' }}>
              {isEn ? 'Karma' : '機緣'}: {credits}
            </p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isEn ? 'Ask the Master...' : '請問大師...'}
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', maxHeight: '120px' }}
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
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes toolPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes drift {
          0% { opacity: 0; transform: translateX(0); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: translateX(8px); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 2px; }
      `}</style>
    </div>
  )
}
