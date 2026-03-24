'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useLang } from '../LanguageContext'

const XuanjiChat = dynamic(() => import('./XuanjiChat'), { ssr: false })

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

interface XuanjiChatCardProps {
  readingResult: string
  readingType: string
  readingId?: string | null
  isShared?: boolean
  chatMessages?: { role: 'user' | 'assistant'; content: string }[]
  delay?: number
}

export default function XuanjiChatCard({ readingResult, readingType, readingId, isShared, chatMessages, delay = 0.15 }: XuanjiChatCardProps) {
  const { lang } = useLang()

  // For shared readings: show chat history read-only if available
  if (isShared) {
    if (!chatMessages || chatMessages.length === 0) return null
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
        <div className="glass-card rounded-xl p-4 sm:p-6 border-2 border-gold/30">
          <h3 className="flex items-center gap-2 text-gold font-serif text-base sm:text-lg mb-3">
            <span className="text-xl">☯</span>
            <span className="bg-gradient-to-r from-amber-400 to-gold bg-clip-text text-transparent font-semibold">
              {T(lang, '玄機破對話', 'Xuanji Po Chat')}
            </span>
          </h3>
          <div className="space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'max-w-[80%] rounded-br-sm' : 'max-w-[92%] rounded-bl-sm'
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
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="glass-card rounded-xl p-4 sm:p-6 border-2 border-gold/30">
        <h3 className="flex items-center gap-2 text-gold font-serif text-base sm:text-lg mb-3">
          <span className="text-xl">☯</span>
          <span className="bg-gradient-to-r from-amber-400 to-gold bg-clip-text text-transparent font-semibold">
            {T(lang, '玄機破', 'Xuanji Po')}
          </span>
        </h3>
        <XuanjiChat readingResult={readingResult} readingType={readingType} readingId={readingId} />
      </div>
    </motion.div>
  )
}
