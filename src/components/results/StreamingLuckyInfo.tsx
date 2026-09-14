'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useLang } from '../LanguageContext'
import { T } from '@/lib/i18n'

interface LuckyInfoData {
  colors?: string[]
  directions?: string[]
  timing?: string
  direction?: string
}

interface StreamingLuckyInfoProps {
  luckyInfo?: LuckyInfoData | null
  streaming?: boolean
  delay?: number
  mode?: 'inline' | 'grid'
}

export default function StreamingLuckyInfo({
  luckyInfo,
  streaming = false,
  delay = 0.14,
  mode = 'inline',
}: StreamingLuckyInfoProps) {
  const { lang } = useLang()
  const isEn = lang === 'en'

  const hasColors = Array.isArray(luckyInfo?.colors) && luckyInfo.colors.length > 0
  const hasDirections = Array.isArray(luckyInfo?.directions) && luckyInfo.directions.length > 0
  const hasTiming = typeof luckyInfo?.timing === 'string' && luckyInfo.timing.trim().length > 0
  const hasDirection = typeof luckyInfo?.direction === 'string' && luckyInfo.direction.trim().length > 0

  const hasContent = hasColors || hasDirections || hasTiming || hasDirection

  if (!hasContent && !streaming) {
    return null
  }

  if (mode === 'grid') {
    const timingText = hasTiming ? luckyInfo?.timing : (isEn ? '09:00 - 11:00 (Si Hour)' : '巳時、申時（辰巳吉時）')
    const directionText = hasDirection ? luckyInfo?.direction : (isEn ? 'Due East / Southeast' : '正東開門、東南方生氣位')

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className={`grid grid-cols-2 gap-3 transition-all duration-700 ${
          streaming && !hasContent ? 'blur-[6px] opacity-60 select-none pointer-events-none' : ''
        }`}
      >
        <div className="glass-card rounded-xl p-3.5 border border-gold/20 text-center">
          <div className="text-[var(--text-muted)] text-xs mb-1">{T(lang, '吉時', 'Auspicious Time')}</div>
          <div className="text-gold text-sm font-medium">{timingText}</div>
        </div>
        <div className="glass-card rounded-xl p-3.5 border border-gold/20 text-center">
          <div className="text-[var(--text-muted)] text-xs mb-1">{T(lang, '吉方', 'Auspicious Direction')}</div>
          <div className="text-gold text-sm font-medium">{directionText}</div>
        </div>
      </motion.div>
    )
  }

  // mode === 'inline' (BaZi, ZiWei)
  const colorsText = hasColors
    ? luckyInfo!.colors!.join(', ')
    : (isEn ? 'Gold, Jade Green, Ivory' : '赤金、翡翠青、月白')
  const directionsText = hasDirections
    ? luckyInfo!.directions!.join(', ')
    : (isEn ? 'Due East, Southeast, North' : '正東、東南、正北')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass-card rounded-xl p-3 border border-gold/20 transition-all duration-700 ${
        streaming && !hasContent ? 'blur-[6px] opacity-60 select-none pointer-events-none' : ''
      }`}
    >
      <div className="flex flex-wrap gap-4 text-xs">
        <div>
          <span className="text-[var(--text-muted)]">{T(lang, '幸運色:', 'Lucky Colors:')}</span>{' '}
          <span className="text-gold font-medium">{colorsText}</span>
        </div>
        <div>
          <span className="text-[var(--text-muted)]">{T(lang, '吉方位:', 'Auspicious Directions:')}</span>{' '}
          <span className="text-gold font-medium">{directionsText}</span>
        </div>
      </div>
    </motion.div>
  )
}
