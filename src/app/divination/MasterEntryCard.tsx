'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import { T } from '@/lib/i18n'
import {
  getMasterEntryConfig,
  getMasterQuickPrompts,
  handleMasterEntryAction,
} from './masterEntryConfig'

export default function MasterEntryCard() {
  const { lang } = useLang()
  const router = useRouter()
  const { enabled: masterEnabled, setShape: setMasterShape, sendMessage } = useMasterChatActions()

  const config = getMasterEntryConfig(lang)
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8 max-w-4xl mx-auto"
    >
      <div className="card-mystic-featured p-5 sm:p-7 relative overflow-hidden group">
        {/* Ambient subtle warm gold radial halo (no harsh purple or cyber-light) */}
        <div
          className="absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
          style={{ background: 'var(--gold)' }}
          aria-hidden="true"
        />

        {/* Top bar: Classical Sanctuary Header & Seal */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <span className="text-gold/70 font-serif text-sm">✧</span>
            <span className="text-xs uppercase tracking-[0.25em] text-gold/80 font-serif">
              {T(lang, '天機玄覽 · 歲時氣象', 'Celestial Sanctuary · Master Xuanji')}
            </span>
          </div>
          <span className="stamp-vermillion text-[10px] py-0.5 px-2 select-none">
            {T(lang, '玄機驗證', 'XuanJi')}
          </span>
        </div>

        {/* Main Content Area: Atmospheric typography + Dignified Action */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            {/* Philosophical Motto */}
            <p className="font-serif text-sm sm:text-base text-foreground/90 leading-relaxed font-light mb-2">
              {T(
                lang,
                '「天地無全功，萬物無全用。靜觀命盤變遷，順時而動，凶亦能化。」',
                '“Heaven and Earth fulfill in cycles; all things shift in due time. Observe the movements of fate, act in harmony, and misfortune dissolves.”'
              )}
            </p>

            <p className="text-xs sm:text-sm text-foreground/55 leading-relaxed font-light">
              {config.description}
            </p>
          </div>

          {/* Action CTA Button: Quiet dignity, restrained gold leaf framing */}
          <div className="w-full md:w-auto flex-shrink-0">
            <button
              onClick={() => handleAction()}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-serif text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-gold/40 hover:border-gold bg-gold/15 hover:bg-gold/25 text-gold-light hover:text-foreground shadow-md shadow-gold/5 hover:shadow-gold/20 active:scale-98"
            >
              <span>{T(lang, '登堂請益 · 叩問玄機', config.ctaButton)}</span>
              <span className="transition-transform group-hover:translate-x-1 font-sans">→</span>
            </button>
          </div>
        </div>

        {/* Disciplines of Inquiry (Subtle, non-chatty themes) */}
        <div className="relative z-10 mt-5 pt-3.5 border-t border-gold/10 flex flex-wrap items-center gap-2">
          <span className="text-xs text-foreground/40 mr-1 hidden sm:inline-block font-serif">
            {T(lang, '參詳方向：', 'Inquire:')}
          </span>
          {quickPrompts.map((item) => (
            <button
              key={item.id}
              onClick={() => handleAction(item.prompt)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer bg-foreground/[0.03] hover:bg-gold/[0.08] border border-gold/15 hover:border-gold/40 text-foreground/70 hover:text-gold-light font-serif"
            >
              <span className="text-gold/60">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
