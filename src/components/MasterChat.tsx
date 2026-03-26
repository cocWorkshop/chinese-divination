'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useMasterChat } from '@/hooks/useMasterChat'

interface MasterChatProps {
  onClose: () => void
  lang: string
}

const welcomeMessage: Record<string, string> = {
  zh: '施主有禮了。\n我是玄機，修習命理數十年，略通八字、紫微、奇門之術。\n你有什麼想了解的，儘管問吧。',
  en: 'Greetings.\nI am Xuanji, a master of Chinese metaphysics for decades.\nWhat would you like to know?',
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

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, toolStatus])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    sendMessage(text, isEn ? 'en' : 'zh')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showWelcome = historyLoaded && messages.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full h-full sm:h-[80vh] sm:max-w-2xl flex flex-col rounded-none sm:rounded-2xl overflow-hidden bg-[var(--card-bg,#1a1a2e)] border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧙‍♂️</span>
            <span className="font-serif text-lg" style={{ color: 'var(--gold)' }}>
              {isEn ? 'Master Xuanji' : '玄機大師'}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          </div>
          <button
            onClick={onClose}
            className="text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {showWelcome && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10">
                <p className="font-serif text-sm whitespace-pre-line" style={{ color: 'var(--text-primary, #e0e0e0)' }}>
                  {isEn ? welcomeMessage.en : welcomeMessage.zh}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[rgba(212,175,55,0.2)]'
                    : 'bg-white/5 backdrop-blur-sm border border-white/10'
                }`}
              >
                <p className={`text-sm whitespace-pre-line ${msg.role === 'assistant' ? 'font-serif' : ''}`} style={{ color: 'var(--text-primary, #e0e0e0)' }}>
                  {msg.content}
                  {msg.role === 'assistant' && i === messages.length - 1 && loading && !msg.content && (
                    <span className="inline-block animate-pulse">…</span>
                  )}
                </p>
                <p className="text-[10px] mt-1 opacity-40">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          ))}

          {/* Tool status */}
          {toolStatus && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 animate-pulse" style={{ borderColor: 'rgba(212,175,55,0.4)' }}>
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-spin text-lg" style={{ animationDuration: '2s' }}>☯️</span>
                  <span className="text-sm font-serif" style={{ color: 'var(--gold)' }}>{toolStatus.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-white/10 px-4 py-3">
          {credits !== null && (
            <p className="text-[10px] mb-1 opacity-40 text-right">
              {isEn ? 'Credits' : '餘額'}: {credits}
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
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm bg-white/5 border border-white/10 focus:border-[var(--gold)] focus:outline-none transition-colors"
              style={{ color: 'var(--text-primary, #e0e0e0)', maxHeight: '120px' }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-30"
              style={{ backgroundColor: 'var(--gold)', color: '#000' }}
            >
              {isEn ? 'Send' : '發送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
