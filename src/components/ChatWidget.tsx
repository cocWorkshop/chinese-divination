'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLang } from './LanguageContext'
import MysticalLoader from './MysticalLoader'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `${lang === 'en' ? 'Error' : '錯誤'}：${data.error || (lang === 'en' ? 'Please try again' : '請稍後再試')}` }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'en' ? 'Network error, please check your connection.' : '網路錯誤，請檢查連接後重試。' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96 rounded-2xl border border-gold/30 bg-navy-950/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '480px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gold/20 flex items-center justify-between bg-navy-900/80">
              <div className="flex items-center gap-2">
                <span className="text-gold text-lg">☯</span>
                <div>
                  <div className="text-gold font-serif text-sm">{lang === 'en' ? 'Xuanji Assistant' : '玄機助手'}</div>
                  <div className="text-white/40 text-xs">{lang === 'en' ? 'Divination Q&A' : '命理問答'}</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-gold transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!session ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <div className="text-4xl">☯</div>
                  <p className="text-white/60 text-sm">{lang === 'en' ? 'Please sign in to use the assistant' : '請登入後使用命理問答'}</p>
                  <a
                    href="/login"
                    className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold hover:bg-gold/80 transition-colors"
                  >
                    {lang === 'en' ? 'Sign In' : '登入帳號'}
                  </a>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="text-center text-white/40 text-xs py-4">
                      <div className="text-2xl mb-2">☯</div>
                      <p>{lang === 'en' ? 'Hello, I am the Xuanji divination assistant' : '您好，我是玄機命理助手'}</p>
                      <p>{lang === 'en' ? 'Ask me anything about your readings' : '可以問我關於您命盤的任何問題'}</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 text-gold text-xs mt-0.5">
                          ☯
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gold text-navy-950 rounded-br-sm'
                            : 'bg-navy-800 text-white/80 border border-gold/10 rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 text-gold text-xs">
                        ☯
                      </div>
                      <div className="bg-navy-800 border border-gold/10 rounded-xl rounded-bl-sm px-4 py-2">
                        <MysticalLoader lang={lang} variant="chat" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {session && (
              <div className="border-t border-gold/20 bg-navy-900/80">
                <div className="flex gap-2 p-3">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={lang === 'en' ? 'Ask about your destiny...' : '問問命理...'}
                    className="flex-1 bg-navy-800 border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder-white/30"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="px-3 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold hover:bg-gold/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {lang === 'en' ? 'Send' : '發送'}
                  </button>
                </div>
                <div className="px-3 pb-2 text-white/25 text-xs text-center">
                  {lang === 'en' ? 'Conversation highlights are auto-saved to your profile' : '對話要點將自動保存至您的檔案'}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <div className="relative">
        {!isOpen && (
          <div className="absolute -top-8 right-0 bg-navy-800 text-gold text-xs px-2 py-1 rounded whitespace-nowrap border border-gold/20 pointer-events-none opacity-0 group-hover:opacity-100">
            {lang === 'en' ? 'Divination Q&A' : '命理問答'}
          </div>
        )}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gold text-navy-950 text-2xl shadow-lg hover:bg-gold/90 transition-colors flex items-center justify-center"
          animate={!isOpen ? { boxShadow: ['0 0 0 0 rgba(212,168,83,0.4)', '0 0 0 12px rgba(212,168,83,0)', '0 0 0 0 rgba(212,168,83,0)'] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          title={lang === 'en' ? 'Divination Q&A' : '命理問答'}
        >
          {isOpen ? '✕' : '☯'}
        </motion.button>
      </div>
    </div>
  )
}
