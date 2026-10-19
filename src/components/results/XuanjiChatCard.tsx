'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import { T } from '@/lib/i18n'
import YinYangIcon from '@/components/YinYangIcon'
import { useEffect } from 'react'
import { useOptionalMasterChatActions } from '@/components/master/MasterChatContext'

const XuanjiChat = dynamic(() => import('./XuanjiChat'), { ssr: false })

interface XuanjiChatCardProps {
  readingResult: string
  readingType: string
  readingId?: string | null
  isShared?: boolean
  chatMessages?: { role: 'user' | 'assistant' | string; content: string }[]
  delay?: number
}

export default function XuanjiChatCard({ readingResult, readingType, readingId, isShared, chatMessages, delay = 0.15 }: XuanjiChatCardProps) {
  const { lang } = useLang()
  const masterChat = useOptionalMasterChatActions()
  // The global Master widget sits below the reading; when it's available it
  // replaces this per-reading Q&A. The reading is registered so every Master
  // turn carries it as context.
  const masterReplacesQa = !isShared && !!readingId && !!masterChat?.enabled
  const setViewingReading = masterChat?.setViewingReading

  useEffect(() => {
    if (!masterReplacesQa || !readingId || !setViewingReading) return
    let questions: string[] | undefined
    try {
      const parsed = typeof readingResult === 'string' ? JSON.parse(readingResult) : readingResult
      if (Array.isArray(parsed?.suggestedQuestions) && parsed.suggestedQuestions.length > 0) {
        questions = parsed.suggestedQuestions.filter((q: unknown): q is string => typeof q === 'string' && q.trim().length > 0)
      }
    } catch {
      /* ignore JSON parse failure */
    }
    setViewingReading(readingId, questions)
    return () => setViewingReading(null)
  }, [masterReplacesQa, readingId, readingResult, setViewingReading])

  if (masterReplacesQa) return null

  // For shared readings: show chat history read-only if available
  if (isShared) {
    if (!chatMessages || chatMessages.length === 0) return null
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
        <div className="card-quiet rounded-xl p-4 sm:p-6 border-2 border-gold/30">
          <h3 className="flex items-center gap-2 text-gold font-serif text-base sm:text-lg mb-3">
            <YinYangIcon size={20} />
            <span className="bg-gradient-to-r from-amber-400 to-gold bg-clip-text text-transparent font-semibold">
              {T(lang, '玄機問答', 'Q&A Chat')}
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
                  {msg.role === 'assistant' ? (
                    <div className="classic-prose text-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-gold [&>h2]:text-gold [&>h3]:text-gold [&>h4]:text-gold [&>strong]:text-gold/90 [&>ul>li::marker]:text-gold/50 [&>ol>li::marker]:text-gold/50">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div id="xuanji-qa" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="card-quiet rounded-xl p-4 sm:p-6 border-2 border-gold/30">
        <h3 className="flex items-center gap-2 text-gold font-serif text-base sm:text-lg mb-3">
          <YinYangIcon size={20} />
          <span className="bg-gradient-to-r from-amber-400 to-gold bg-clip-text text-transparent font-semibold">
            {T(lang, '玄機問答', 'Q&A')}
          </span>
        </h3>
        <XuanjiChat readingResult={readingResult} readingType={readingType} readingId={readingId} />
      </div>
    </motion.div>
  )
}
