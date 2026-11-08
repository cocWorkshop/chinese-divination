'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import { ChevronDownIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'
import {
  getMasterQuickPrompts,
  handleMasterEntryAction,
  type QuickPrompt,
} from './masterEntryConfig'

const PROMPT_THEMES: Record<QuickPrompt['theme'], { bg: string; border: string; text: string; dot: string; hover: string }> = {
  gold: {
    bg: 'bg-[rgba(212,168,83,0.08)]',
    border: 'border-[rgba(212,168,83,0.25)]',
    text: 'text-[#e8c66e]',
    dot: 'text-[rgba(212,168,83,0.9)]',
    hover: 'hover:bg-[rgba(212,168,83,0.18)] hover:border-[rgba(212,168,83,0.5)]',
  },
  azure: {
    bg: 'bg-[rgba(56,189,248,0.07)]',
    border: 'border-[rgba(56,189,248,0.22)]',
    text: 'text-[#7dd3fc]',
    dot: 'text-[#38bdf8]',
    hover: 'hover:bg-[rgba(56,189,248,0.16)] hover:border-[rgba(56,189,248,0.45)]',
  },
  jade: {
    bg: 'bg-[rgba(52,211,153,0.07)]',
    border: 'border-[rgba(52,211,153,0.22)]',
    text: 'text-[#6ee7b7]',
    dot: 'text-[#34d399]',
    hover: 'hover:bg-[rgba(52,211,153,0.16)] hover:border-[rgba(52,211,153,0.45)]',
  },
  rose: {
    bg: 'bg-[rgba(244,114,182,0.07)]',
    border: 'border-[rgba(244,114,182,0.22)]',
    text: 'text-[#f472b6]',
    dot: 'text-[#f472b6]',
    hover: 'hover:bg-[rgba(244,114,182,0.16)] hover:border-[rgba(244,114,182,0.45)]',
  },
  amber: {
    bg: 'bg-[rgba(251,191,36,0.07)]',
    border: 'border-[rgba(251,191,36,0.22)]',
    text: 'text-[#fcd34d]',
    dot: 'text-[#fbbf24]',
    hover: 'hover:bg-[rgba(251,191,36,0.16)] hover:border-[rgba(251,191,36,0.45)]',
  },
  purple: {
    bg: 'bg-[rgba(167,139,250,0.07)]',
    border: 'border-[rgba(167,139,250,0.22)]',
    text: 'text-[#c4b5fd]',
    dot: 'text-[#a78bfa]',
    hover: 'hover:bg-[rgba(167,139,250,0.16)] hover:border-[rgba(167,139,250,0.45)]',
  },
  teal: {
    bg: 'bg-[rgba(20,184,166,0.07)]',
    border: 'border-[rgba(20,184,166,0.22)]',
    text: 'text-[#5eead4]',
    dot: 'text-[#2dd4bf]',
    hover: 'hover:bg-[rgba(20,184,166,0.16)] hover:border-[rgba(20,184,166,0.45)]',
  },
  indigo: {
    bg: 'bg-[rgba(129,140,248,0.07)]',
    border: 'border-[rgba(129,140,248,0.22)]',
    text: 'text-[#a5b4fc]',
    dot: 'text-[#818cf8]',
    hover: 'hover:bg-[rgba(129,140,248,0.16)] hover:border-[rgba(129,140,248,0.45)]',
  },
}

export default function MasterEntryCard() {
  const { lang } = useLang()
  const router = useRouter()
  const { enabled: masterEnabled, setShape: setMasterShape, sendMessage } = useMasterChatActions()
  const [query, setQuery] = useState('')
  const [showPresets, setShowPresets] = useState(false)

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
      className="mb-1 sm:mb-2 max-w-4xl mx-auto w-full"
    >
      <div className="card-mystic-featured p-3 sm:p-4.5 relative overflow-hidden group">
        {/* Subtle warm glow behind */}
        <div
          className="absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-15"
          style={{ background: 'var(--gold)' }}
          aria-hidden="true"
        />

        {/* Command bar input + submit button + dropdown toggle */}
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-2.5">
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

            {/* Button + Dropdown Arrow Container */}
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-serif text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center cursor-pointer border border-gold/40 hover:border-gold bg-gold/15 hover:bg-gold/25 text-gold-light hover:text-foreground shadow-sm shadow-gold/5 active:scale-98"
              >
                <span>{T(lang, '請教大師', 'Ask Master')}</span>
              </button>

              {/* Little dropdown arrow placed under the button */}
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="mt-1 flex items-center justify-center w-8 h-4 rounded text-gold/60 hover:text-gold-light hover:bg-gold/10 transition-all cursor-pointer"
                title={showPresets ? T(lang, '收起預設方向', 'Collapse presets') : T(lang, '展開預設方向', 'Expand presets')}
                aria-label={showPresets ? T(lang, '收起預設方向', 'Collapse presets') : T(lang, '展開預設方向', 'Expand presets')}
                aria-expanded={showPresets}
              >
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Expandable 8 presets container */}
          <AnimatePresence initial={false}>
            {showPresets && (
              <motion.div
                key="presets"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-gold/15 mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {quickPrompts.map((item) => {
                    const style = PROMPT_THEMES[item.theme] || PROMPT_THEMES.gold
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAction(item.prompt)}
                        className={`w-full inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs px-2 py-1.5 rounded-lg transition-all duration-200 cursor-pointer font-serif border shadow-sm truncate ${style.bg} ${style.border} ${style.text} ${style.hover}`}
                      >
                        <span className={`${style.dot} text-[10px] shrink-0`}>✦</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </motion.div>
  )
}
