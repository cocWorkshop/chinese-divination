'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { useMasterChat } from '@/components/master/MasterChatContext'
import {
  getMasterEntryConfig,
  getMasterQuickPrompts,
  handleMasterEntryAction,
} from './masterEntryConfig'

export default function MasterEntryCard() {
  const { lang } = useLang()
  const router = useRouter()
  const { enabled: masterEnabled, setShape: setMasterShape, sendMessage } = useMasterChat()

  const config = getMasterEntryConfig(lang)
  const quickPrompts = getMasterQuickPrompts(lang)
  const isZh = lang !== 'en'

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
      <div className="card-mystic-featured p-6 sm:p-7 relative overflow-hidden group">
        {/* Ambient subtle warm gold radial halo (no harsh purple or cyber-light) */}
        <div
          className="absolute -top-20 -left-20 w-52 h-52 rounded-full blur-3xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
          style={{ background: 'var(--gold)' }}
          aria-hidden="true"
        />

        {/* Top bar: Classical Sanctuary Header & Seal */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-gold/60 font-serif text-sm">✧</span>
            <span className="text-xs uppercase tracking-[0.25em] text-gold/80 font-serif">
              {isZh ? '天機玄覽 · 歲時氣象' : 'Celestial Sanctuary · Master Xuanji'}
            </span>
          </div>
          <span className="stamp-vermillion text-[10px] py-0.5 px-2 select-none">
            {isZh ? '玄機神算' : 'XuanJi'}
          </span>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            {/* Philosophical Motto */}
            <p className="font-serif text-sm sm:text-base text-white/90 leading-relaxed font-light mb-2">
              {isZh
                ? '「天地無全功，萬物無全用。靜觀命盤變遷，順時而動，凶亦能化。」'
                : '“Heaven and Earth fulfill in cycles; all things shift in due time. Observe the movements of fate, act in harmony, and misfortune dissolves.”'}
            </p>

            <p className="text-xs sm:text-sm text-white/55 leading-relaxed font-light">
              {config.description}
            </p>
          </div>

          {/* Action CTA Button */}
          <div className="w-full md:w-auto flex-shrink-0">
            <button
              onClick={() => handleAction()}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-gold/10 hover:shadow-gold/25 active:scale-98 bg-gold hover:bg-gold-light text-navy-950 font-serif"
            >
              <span>{isZh ? '登堂請益 · 叩問玄機' : config.ctaButton}</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>

        {/* Quick Suggestion Scroll Chips */}
        <div className="relative z-10 mt-5 pt-3.5 border-t border-white/5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/40 mr-1 hidden sm:inline-block font-serif">
            {isZh ? '快捷請教：' : 'Inquire:'}
          </span>
          {quickPrompts.map((item) => (
            <button
              key={item.id}
              onClick={() => handleAction(item.prompt)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 text-white/75 hover:text-gold-light"
            >
              <span className="text-gold/70">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
