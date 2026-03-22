'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'
import { reportError } from '@/lib/errorReporter'
import YinYangIcon from '@/components/YinYangIcon'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

const suggestedQuestions: Record<string, { zh: string; en: string }[]> = {
  bazi: [
    { zh: '我的命格有什麼特別之處？', en: 'What is special about my chart?' },
    { zh: '今年的運勢如何？', en: 'How is my fortune this year?' },
    { zh: '我適合什麼行業？', en: 'What industries suit me?' },
  ],
  ziwei: [
    { zh: '我的命宮主星有什麼含義？', en: 'What do my main stars mean?' },
    { zh: '我目前的大運如何？', en: 'How is my current major cycle?' },
    { zh: '我的事業宮怎麼看？', en: 'How does my career palace look?' },
  ],
}

export default function XuanjiChat({ readingResult, readingType }: {
  readingResult: string
  readingType: string
}) {
  const { data: session } = useSession()
  const { lang } = useLang()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async (text?: string) => {
    const userMsg = (text || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          readingContext: readingResult,
          readingType,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `${T(lang, '錯誤', 'Error')}：${data.error || T(lang, '請稍後再試', 'Please try again')}` }])
        reportError({ endpoint: '/api/chat', status: res.status, error: data.error || 'Unknown', context: 'xuanji-chat-tab' })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      setMessages(prev => [...prev, { role: 'assistant', content: T(lang, '網路錯誤，請檢查連接後重試。', 'Network error, please check your connection.') }])
      reportError({ endpoint: '/api/chat', error: msg, context: 'xuanji-chat-tab' })
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const questions = suggestedQuestions[readingType] || suggestedQuestions.bazi

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <YinYangIcon size={48} />
        <p className="text-white/50 text-sm">{T(lang, '請登入後使用玄機問答', 'Please sign in to use Xuanji Q&A')}</p>
        <a href="/login" className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors">
          {T(lang, '登入帳號', 'Sign In')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '400px' }}>
      {/* Messages area */}
      <div className="flex-1 space-y-4 mb-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {messages.length === 0 ? (
          /* Welcome + suggested questions */
          <div className="text-center py-8">
            <div className="mb-6">
              <YinYangIcon size={40} className="mx-auto mb-3" />
              <h3 className="text-gold font-serif text-lg mb-1">
                {T(lang, '玄機問答', 'Xuanji Q&A')}
              </h3>
              <p className="text-white/40 text-xs">
                {T(lang, '基於您的命盤解讀結果，深入探討任何問題', 'Ask anything based on your reading results')}
              </p>
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(lang === 'en' ? q.en : q.zh)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all
                    border border-gold/15 hover:border-gold/40 text-white/60 hover:text-gold
                    bg-transparent hover:bg-gold/5"
                >
                  <span className="text-gold/60 mr-2">💬</span>
                  {lang === 'en' ? q.en : q.zh}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-gold/15 border border-gold/20">
                    <YinYangIcon size={18} />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'max-w-[70%] bg-gold text-navy-950 rounded-br-sm'
                      : 'max-w-[85%] bg-navy-900/60 text-white/80 border border-gold/10 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gold/15 border border-gold/20">
                  <YinYangIcon size={18} />
                </div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-navy-900/60 border border-gold/10">
                  <MysticalLoader lang={lang} variant="chat" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gold/15 pt-3 mt-auto">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={T(lang, '對命盤有什麼疑問？', 'Any questions about your reading?')}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm bg-navy-900/80 border border-gold/15
              text-white/90 placeholder-white/30 focus:outline-none focus:border-gold/40 transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold text-navy-950
              hover:bg-gold-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {T(lang, '發送', 'Send')}
          </button>
        </div>
      </div>
    </div>
  )
}
