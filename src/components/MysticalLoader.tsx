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

interface MysticalLoaderProps {
  lang: string
  variant?: 'divination' | 'chat' | 'page'
  divinationType?: string
}

export default function MysticalLoader({ lang, variant = 'divination', divinationType }: MysticalLoaderProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const quotes = lang === 'en' ? divinationQuotes.en : divinationQuotes['zh-TW']

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
      // Show each tip for 7 seconds, cycle through playlist
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
        <span className="text-white/40 text-xs">{lang === 'en' ? 'Contemplating...' : '玄機推演中...'}</span>
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
      className="flex flex-col items-center justify-center py-16 gap-8"
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

      {/* Progress dots */}
      <motion.div
        className="flex gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gold/40"
            animate={{
              backgroundColor: ['rgba(212,168,83,0.3)', 'rgba(212,168,83,1)', 'rgba(212,168,83,0.3)'],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
