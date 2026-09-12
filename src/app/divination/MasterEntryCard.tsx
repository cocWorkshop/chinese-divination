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
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mb-8 max-w-4xl mx-auto"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-300 shadow-xl group"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(212, 175, 55, 0.12) 0%, rgba(26, 26, 46, 0.85) 60%, rgba(15, 23, 42, 0.95) 100%)',
          borderColor: 'rgba(212, 175, 55, 0.3)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 215, 0, 0.2)',
        }}
      >
        {/* Ambient background glow */}
        <div
          className="absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
          style={{ background: 'var(--gold)' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: '#9370db' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left section: Avatar + Info */}
          <div className="flex items-start sm:items-center gap-4 flex-1">
            {/* Mystic Avatar Icon */}
            <div
              onClick={() => handleAction()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAction()}
              className="relative flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full"
              aria-label={config.title}
            >
              <div
                className="w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center text-2xl sm:text-3xl border transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(15, 23, 42, 0.85) 100%)',
                  borderColor: 'rgba(212, 175, 55, 0.5)',
                  boxShadow: '0 0 20px rgba(212, 175, 55, 0.25)',
                }}
              >
                ☯
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-navy-950" />
              </span>
            </div>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 className="text-lg sm:text-xl font-serif font-semibold text-gold tracking-wide">
                  {config.title}
                </h2>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: 'var(--gold)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                  }}
                >
                  {config.role}
                </span>
                <span
                  className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full text-text-muted"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {config.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {/* Right section: Main CTA Button */}
          <div className="w-full md:w-auto flex-shrink-0">
            <button
              onClick={() => handleAction()}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-amber-500/20 active:scale-98"
              style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)',
                color: '#0f172a',
                border: '1px solid rgba(255, 223, 114, 0.4)',
              }}
            >
              <span>💬</span>
              <span className="font-semibold">{config.ctaButton}</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted mr-1 hidden sm:inline-block">
            {lang === 'en' ? 'Quick Topics:' : '快捷請教：'}
          </span>
          {quickPrompts.map((item) => (
            <button
              key={item.id}
              onClick={() => handleAction(item.prompt)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)'
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)'
                e.currentTarget.style.color = 'var(--gold)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
