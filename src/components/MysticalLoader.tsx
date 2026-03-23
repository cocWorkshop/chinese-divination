'use client'
import YinYangIcon from '@/components/YinYangIcon'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomPlaylist, TipPlaylist } from './divinationTips'

const divinationQuotes = {
  'zh-TW': [
    '天機正在運轉...',
    '卦象浮現中...',
    '陰陽交匯，命盤顯現...',
    '觀天象，察地理...',
    '五行流轉，氣運凝聚...',
    '紫微星動，命數將明...',
    '乾坤變化，玄機漸顯...',
    '八卦推演，吉凶將定...',
    '天人合一，命理初成...',
    '星斗排列，運勢可期...',
  ],
  en: [
    'The celestial mechanisms are turning...',
    'Hexagram patterns are emerging...',
    'Yin and Yang converge, destiny reveals...',
    'Reading the heavens and earth...',
    'Five elements flow, energy gathers...',
    'The Purple Star moves, fate becomes clear...',
    'Heaven and earth shift, mysteries unfold...',
    'Eight trigrams align, fortune takes shape...',
    'Unity of heaven and humanity...',
    'Stars arrange, destiny awaits...',
  ],
}

// Progress stages with estimated time thresholds (seconds)
const progressStages = {
  'zh-TW': [
    { at: 0, label: '正在排盤計算...', pct: 5 },
    { at: 3, label: '命盤數據準備完成', pct: 15 },
    { at: 8, label: '正在連接天機...', pct: 20 },
    { at: 15, label: '大師正在研讀命盤...', pct: 30 },
    { at: 40, label: '深入分析命理格局...', pct: 50 },
    { at: 70, label: '撰寫詳批報告中...', pct: 65 },
    { at: 100, label: '精批大運流年...', pct: 80 },
    { at: 140, label: '最終審閱中...', pct: 90 },
    { at: 180, label: '即將完成，請稍候...', pct: 95 },
  ],
  en: [
    { at: 0, label: 'Calculating chart...', pct: 5 },
    { at: 3, label: 'Chart data ready', pct: 15 },
    { at: 8, label: 'Connecting to oracle...', pct: 20 },
    { at: 15, label: 'Master is studying your chart...', pct: 30 },
    { at: 40, label: 'Analyzing destiny patterns...', pct: 50 },
    { at: 70, label: 'Writing detailed analysis...', pct: 65 },
    { at: 100, label: 'Analyzing life phases...', pct: 80 },
    { at: 140, label: 'Final review...', pct: 90 },
    { at: 180, label: 'Almost done, please wait...', pct: 95 },
  ],
}

interface MysticalLoaderProps {
  lang: string
  variant?: 'divination' | 'chat' | 'page'
  divinationType?: string
}

export default function MysticalLoader({ lang, variant = 'divination', divinationType }: MysticalLoaderProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const quotes = lang === 'en' ? divinationQuotes.en : divinationQuotes['zh-TW']
  const [elapsed, setElapsed] = useState(0)

  // Educational tips playlist (selected once on mount)
  const playlistRef = useRef<TipPlaylist | null>(null)
  if (divinationType && !playlistRef.current) {
    playlistRef.current = getRandomPlaylist(divinationType)
  }
  const playlist = playlistRef.current
  const hasTips = playlist && playlist.length > 0
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    if (hasTips) {
      const interval = setInterval(() => {
        setTipIndex(i => (i + 1) % playlist!.length)
      }, 7000)
      return () => clearInterval(interval)
    }
  }, [hasTips, playlist])

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % quotes.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [quotes.length])

  // Elapsed timer for progress bar
  useEffect(() => {
    if (variant !== 'divination') return
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [variant])

  if (variant === 'chat') {
    return (
      <div className="flex items-center gap-2 py-2">
        <motion.div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-gold"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
        <span className="text-white/40 text-xs">{lang === 'en' ? 'Deciphering the hidden path...' : '破解玄機中...'}</span>
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <YinYangIcon size={48} className="drop-shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
        </motion.div>
        <p className="text-gold/60 text-sm font-serif">
          {lang === 'en' ? 'Loading...' : '載入中...'}
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      {/* Rotating Bagua / Yin-Yang */}
      <motion.div
        className="relative w-32 h-32"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Outer ring with trigram symbols */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, rotate: -360 }}
          transition={{
            opacity: { duration: 2, delay: 0.5 },
            scale: { duration: 2, delay: 0.5, ease: 'easeOut' },
            rotate: { duration: 20, repeat: Infinity, ease: 'linear', delay: 0.5 },
          }}
        >
          {['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'].map((trigram, i) => (
            <motion.span
              key={i}
              className="absolute text-gold/60 text-lg"
              style={{
                left: `${50 + 45 * Math.cos((i * Math.PI) / 4 - Math.PI / 2)}%`,
                top: `${50 + 45 * Math.sin((i * Math.PI) / 4 - Math.PI / 2)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.8 + i * 0.15 }}
            >
              {trigram}
            </motion.span>
          ))}
        </motion.div>

        {/* Inner yin-yang */}
        <motion.div
          className="absolute inset-6 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 1.2, ease: 'easeOut' },
            scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
            rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
          }}
        >
          <YinYangIcon size={48} className="drop-shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
        </motion.div>

        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.15) 0%, transparent 70%)' }}
          initial={{ opacity: 0 }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        />
      </motion.div>

      {/* Animated quote text */}
      <motion.div
        className="h-8 flex items-center"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-gold/80 text-sm font-serif text-center"
          >
            {quotes[quoteIndex]}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Educational tips */}
      {hasTips && (
        <motion.div
          className="max-w-md mx-auto px-4 min-h-[3rem] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6 }}
              className="text-white/50 text-xs text-center leading-relaxed font-serif"
            >
              💡 {lang === 'en' ? playlist![tipIndex].en : playlist![tipIndex].zh}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}

      {/* Progress bar */}
      {(() => {
        const stages = lang === 'en' ? progressStages.en : progressStages['zh-TW']
        const current = [...stages].reverse().find(s => elapsed >= s.at) || stages[0]
        return (
          <motion.div
            className="w-full max-w-xs mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={current.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-serif"
                  style={{ color: 'var(--gold)' }}
                >
                  {current.label}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(212,168,83,0.1)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, rgba(212,168,83,0.6), rgba(212,168,83,1))' }}
                initial={{ width: '0%' }}
                animate={{ width: `${current.pct}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )
      })()}
    </motion.div>
  )
}
