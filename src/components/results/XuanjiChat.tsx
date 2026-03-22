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
    { zh: '破解我命格中的隱藏格局', en: 'Decode the hidden patterns in my chart' },
    { zh: '我的大運轉折點在哪裡？', en: 'Where are the turning points in my cycles?' },
    { zh: '五行喜忌對事業有何影響？', en: 'How do my elemental preferences affect career?' },
  ],
  ziwei: [
    { zh: '破解我命宮主星的深層含義', en: 'Decode the deeper meaning of my main stars' },
    { zh: '四化飛星揭示了什麼天機？', en: 'What secrets do the Four Transformations reveal?' },
    { zh: '我命盤中最有利的宮位是哪個？', en: 'Which palace is most favorable in my chart?' },
  ],
  liuyao: [
    { zh: '用神旺衰如何？事情成敗關鍵是什麼？', en: 'How strong is the Yong Shen? What determines success?' },
    { zh: '應期在什麼時候？', en: 'When will this matter come to fruition?' },
    { zh: '變卦暗示了什麼最終結果？', en: 'What final outcome does the changed hexagram suggest?' },
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
  const [chatRemaining, setChatRemaining] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to latest message within the chat area (internal scroll only)
  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement
      if (container) {
        container.scrollTop = container.scrollHeight
      }
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
        if (data.chatCredits) setChatRemaining(data.chatCredits.remaining)
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{T(lang, '請登入後使用玄機破', 'Please sign in to use Xuanji Po')}</p>
        <a href="/login" className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-colors"
          style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}>
          {T(lang, '登入帳號', 'Sign In')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '400px' }}>
      {/* Messages area */}
      <div className="flex-1 space-y-3 sm:space-y-4 mb-3 sm:mb-4 scrollbar-hide" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {messages.length === 0 ? (
          /* Welcome + suggested questions */
          <div className="text-center py-4 sm:py-8">
            <div className="mb-4 sm:mb-6">
              <YinYangIcon size={40} className="mx-auto mb-3" />
              <h3 className="font-serif text-lg mb-1" style={{ color: 'var(--gold)' }}>
                {T(lang, '玄機破', 'Xuanji Po')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {T(lang, '破解命盤玄機，洞悉天機奧秘', 'Decode the mysteries of your destiny')}
              </p>
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(lang === 'en' ? q.en : q.zh)}
                  className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-sm transition-all hover:opacity-80"
                  style={{ border: '1px solid var(--border-gold)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-bg)'; e.currentTarget.style.color = 'var(--gold)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  <span style={{ color: 'var(--gold)', opacity: 0.6 }} className="mr-2">💬</span>
                  {lang === 'en' ? q.en : q.zh}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: 'rgba(var(--gold-rgb, 212,168,83), 0.15)', border: '1px solid var(--border-gold)' }}>
                    <YinYangIcon size={14} className="sm:hidden" /><YinYangIcon size={18} className="hidden sm:block" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' ? 'max-w-[80%] sm:max-w-[70%] rounded-br-sm' : 'max-w-[92%] sm:max-w-[85%] rounded-bl-sm'
                  }`}
                  style={msg.role === 'user'
                    ? { backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }
                    : { backgroundColor: 'var(--accent-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-gold)' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 sm:gap-3 justify-start">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(var(--gold-rgb, 212,168,83), 0.15)', border: '1px solid var(--border-gold)' }}>
                  <YinYangIcon size={14} className="sm:hidden" /><YinYangIcon size={18} className="hidden sm:block" />
                </div>
                <div className="rounded-2xl rounded-bl-sm px-3 py-2 sm:px-4 sm:py-3"
                  style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border-gold)' }}>
                  <MysticalLoader lang={lang} variant="chat" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="pt-2 sm:pt-3 mt-auto" style={{ borderTop: '1px solid var(--border-gold)' }}>
        <div className="flex gap-1.5 sm:gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={T(lang, '破解什麼玄機？', 'What mystery to decode?')}
            className="flex-1 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-gold)',
              color: 'var(--text-primary)',
            }}
            disabled={loading || (chatRemaining !== null && chatRemaining <= 0)}
          />
          {chatRemaining !== null && chatRemaining <= 0 ? (
            <a
              href="/pricing"
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-colors text-center whitespace-nowrap"
              style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
            >
              {T(lang, '訂閱', 'Subscribe')}
            </a>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
            >
              {chatRemaining !== null
                ? `${T(lang, '發送', 'Send')} (${chatRemaining})`
                : T(lang, '發送', 'Send')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
