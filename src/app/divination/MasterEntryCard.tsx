'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import { T } from '@/lib/i18n'
import {
  getMasterQuickPrompts,
  handleMasterEntryAction,
} from './masterEntryConfig'

export default function MasterEntryCard() {
  const { lang } = useLang()
  const router = useRouter()
  const { enabled: masterEnabled, setShape: setMasterShape, sendMessage } = useMasterChatActions()
  const [query, setQuery] = useState('')

  const quickPrompts = getMasterQuickPrompts(lang)

  const handleAction = (promptText?: string) => {
    handleMasterEntryAction({
      masterEnabled,
      prompt: promptText,
      routerPush: (url) => router.push(url),
      setShape: setMasterShape,
      sendMessage,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAction(query.trim() || undefined)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 max-w-4xl mx-auto"
    >
      <div className="card-mystic-featured p-3 sm:p-4 relative overflow-hidden group">
        {/* Subtle warm glow behind */}
        <div
          className="absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-15"
          style={{ background: 'var(--gold)' }}
          aria-hidden="true"
        />

        {/* Quick prompt pills row on top of the input box */}
        <div className="relative z-10 mb-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {quickPrompts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAction(item.prompt)}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer bg-foreground/[0.03] hover:bg-gold/[0.08] border border-gold/15 hover:border-gold/35 text-foreground/70 hover:text-gold-light font-serif"
            >
              <span className="text-gold/60 text-[10px]">✦</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Command bar input + submit button */}
        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          <div className="relative flex-1 flex items-center bg-[#070b14]/90 border border-gold/30 hover:border-gold/50 focus-within:border-gold rounded-xl px-3.5 py-2.5 shadow-inner transition-colors">
            <span className="stamp-gold text-[10px] py-0.5 px-1.5 select-none mr-2 flex-shrink-0">
              {T(lang, '玄機', 'XuanJi')}
            </span>
            <span className="text-gold/25 mr-2.5 font-light select-none">|</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={T(
                lang,
                '輸入你想問的事，向玄機大師提問（如：近期適合換工作嗎？）...',
                'Ask Master Xuanji anything (e.g. Is now a good time for a job change?)...',
              )}
              className="w-full bg-transparent text-xs sm:text-sm text-foreground/90 placeholder:text-foreground/40 focus:outline-none font-serif"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-serif text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border border-gold/40 hover:border-gold bg-gold/15 hover:bg-gold/25 text-gold-light hover:text-foreground shadow-sm shadow-gold/5 active:scale-98 flex-shrink-0"
          >
            <span>{T(lang, '向大師提問', 'Ask Master')}</span>
            <span className="transition-transform group-hover:translate-x-0.5 font-sans text-xs">→</span>
          </button>
        </form>
      </div>
    </motion.div>
  )
}
