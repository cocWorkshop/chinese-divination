'use client'
import YinYangIcon from '@/components/YinYangIcon'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomPlaylist, TipPlaylist } from './divinationTips'
import { T, TEN } from '@/lib/i18n'

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

// Hexagram-based divination types (use 卦象 instead of 命盤)
const HEXAGRAM_TYPES = new Set(['iching', 'liuyao', 'qimen', 'fengshui', 'meihua', 'other'])

// Three Celestial Rite Stages (三階天地氣象儀軌)
function getCelestialRiteStage(elapsed: number, isEn: boolean, isHexagram: boolean) {
  if (elapsed < 12) {
    return {
      stage: 1,
      title: TEN(isEn, '乾坤定序', 'Ordering Heaven & Earth'),
      desc: TEN(
        isEn,
        isHexagram ? '六爻定序，布列體用世應...' : '乾坤定序，排定四柱干支...',
        isHexagram ? 'Casting hexagram and establishing host lines...' : 'Aligning the Four Pillars and cyclical stems...'
      ),
    }
  }
  if (elapsed < 45) {
    return {
      stage: 2,
      title: TEN(isEn, '星曜入宮', 'Stars & Spirits Converge'),
      desc: TEN(
        isEn,
        isHexagram ? '參詳變爻，感應動靜之機...' : '星曜入宮，吉凶神煞引聚...',
        isHexagram ? 'Discerning changing lines and mutual resonance...' : 'Celestial stars enter palaces, gathering cosmic Qi...'
      ),
    }
  }
  return {
    stage: 3,
    title: TEN(isEn, '天機凝聚', 'Mystic Revelation'),
    desc: TEN(
      isEn,
      isHexagram ? '天機凝聚，詳批卦辭將現...' : '天機凝聚，詳批命書將現...',
      isHexagram ? 'Heavenly mechanisms align, oracle taking shape...' : 'Heavenly mechanisms align, fate report unfolding...'
    ),
  }
}

interface MysticalLoaderProps {
  lang?: string
  variant?: 'divination' | 'chat' | 'page'
  divinationType?: string
  startTime?: number  // Unix timestamp (ms) for elapsed timer — defaults to Date.now() on mount
  /**
   * When provided, a "cancel and return to the form" affordance appears after
   * 5 minutes of waiting (form inputs are preserved by the caller). Omit on
   * surfaces where cancelling has no meaning (e.g. polling a pending reading).
   */
  onCancel?: () => void
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export default function MysticalLoader({
  lang = 'zh-TW',
  variant = 'divination',
  divinationType,
  startTime,
  onCancel,
  size = 'md',
  message,
}: MysticalLoaderProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const quotes = T(lang, divinationQuotes['zh-TW'], divinationQuotes.en)
  const [elapsed, setElapsed] = useState(0)

  // Educational tips playlist (selected once on mount)
  const playlistRef = useRef<TipPlaylist | null>(null)
  if (divinationType && !playlistRef.current) {
    playlistRef.current = getRandomPlaylist(divinationType)
  }
  const playlist = playlistRef.current
  const hasTips = Boolean(playlist && playlist.length > 0)
  const [tipIndex, setTipIndex] = useState(0)

  // Tip rotation: 7 seconds per tip (same pace as divinationQuotes)
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

  // Elapsed timer for progress bar. `startTime` in the deps restarts the
  // interval with the new anchor if the parent passes a different start —
  // correct behavior (the old code kept counting from the stale anchor).
  useEffect(() => {
    if (variant !== 'divination') return
    const start = startTime || Date.now()
    setElapsed(Math.floor((Date.now() - start) / 1000))
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [variant, startTime])

  if (variant === 'chat') {
    return (
      <div className="flex items-center gap-2 py-2" role="status">
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
        <span className="text-foreground/40 text-xs">{T(lang, '破解玄機中...', 'Deciphering the hidden path...')}</span>
      </div>
    )
  }

  if (variant === 'page') {
    const iconSize = size === 'sm' ? 28 : size === 'md' ? 36 : 48
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-3" role="status">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <YinYangIcon size={iconSize} className="drop-shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
        </motion.div>
        <p className="text-gold/70 text-sm font-serif">
          {message || (T(lang, '載入中...', 'Loading...'))}
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-6 sm:py-8 gap-5 sm:gap-6 min-h-[60vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      role="status"
    >
      {/* Rotating Bagua / Yin-Yang — adaptive size.
          `vmin` scales with the smaller of viewport width/height so it
          looks generous in both portrait and landscape. Lower bound
          keeps it usable on tiny screens; upper bound prevents it from
          dwarfing the rest of the content on big monitors. */}
      <motion.div
        className="relative aspect-square"
        style={{ width: 'clamp(220px, 60vmin, 480px)' }}
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
              className="absolute text-gold/60"
              style={{
                left: `${50 + 45 * Math.cos((i * Math.PI) / 4 - Math.PI / 2)}%`,
                top: `${50 + 45 * Math.sin((i * Math.PI) / 4 - Math.PI / 2)}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: 'clamp(1rem, 4vmin, 2rem)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.8 + i * 0.15 }}
            >
              {trigram}
            </motion.span>
          ))}
        </motion.div>

        {/* Inner yin-yang — fills the inset region; SVG scales with
            container via w-full / h-full overriding the size attribute. */}
        <motion.div
          className="absolute inset-[18%] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 1.2, ease: 'easeOut' },
            scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
            rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
          }}
        >
          <YinYangIcon size={200} className="w-full h-full drop-shadow-[0_0_24px_rgba(212,168,83,0.5)]" />
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
              className="text-foreground/50 text-xs text-center leading-relaxed font-serif"
            >
              {T(lang, playlist![tipIndex].zh, playlist![tipIndex].en)}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}

      {/* Three Celestial Nodes (三階氣象儀軌) */}
      {(() => {
        const isEn = lang === 'en'
        const isHex = HEXAGRAM_TYPES.has(divinationType || '')
        const current = getCelestialRiteStage(elapsed, isEn, isHex)
        const stagesList = [
          { num: 1, title: T(lang, '乾坤定序', 'Order') },
          { num: 2, title: T(lang, '星曜入宮', 'Converge') },
          { num: 3, title: T(lang, '天機凝聚', 'Reveal') },
        ]
        return (
          <motion.div
            className="w-full max-w-sm mx-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {/* Connected Stage Nodes */}
            <div className="flex items-center justify-between relative mb-2">
              {/* Connecting hairline */}
              <div
                className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-[1px] -z-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.4) 50%, rgba(212,168,83,0.15) 100%)',
                }}
              />
              {stagesList.map((st) => {
                const isActive = current.stage === st.num
                const isPassed = current.stage > st.num
                return (
                  <div key={st.num} className="relative z-10 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-serif transition-all duration-500 ${
                        isActive
                          ? 'border border-gold bg-gold/25 text-gold-light shadow-[0_0_12px_rgba(212,168,83,0.4)] scale-110'
                          : isPassed
                          ? 'border border-gold/40 bg-gold/10 text-gold/80'
                          : 'border border-gold/15 bg-surface/60 text-foreground/30'
                      }`}
                    >
                      {isActive ? '✧' : isPassed ? '✓' : st.num}
                    </div>
                    <span
                      className={`text-[11px] font-serif transition-colors duration-300 ${
                        isActive ? 'text-gold font-medium' : isPassed ? 'text-gold/70' : 'text-foreground/35'
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Current Stage Descriptive Line */}
            <div className="text-center min-h-[1.5rem] mt-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={current.desc}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4 }}
                  className="text-xs font-serif text-gold/80 leading-relaxed"
                >
                  {current.desc}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )
      })()}

      {/* Timeout reassurance — appears gently after 3 minutes */}
      {elapsed >= 180 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center mt-3 max-w-xs mx-auto leading-relaxed font-serif"
          style={{ color: 'var(--text-muted)' }}
        >
          {T(
            lang,
            '天機深邃，宗師正逐層參詳命脈氣候 — 靜候片刻，機緣即顯。',
            'The celestial path runs deep. Master Xuanji is contemplating the chart layers — please remain peacefully present.'
          )}
        </motion.p>
      )}

      {/* Cancel & return — after 5 minutes the wait may be a hung call; give
          the user a way out. The caller preserves the filled form. */}
      {onCancel && elapsed >= 300 && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onCancel}
          className="mt-2 px-4 py-2 rounded-lg text-xs transition-colors hover:bg-gold/10"
          style={{ color: 'var(--gold)', border: '1px solid var(--border-gold)' }}
        >
          {T(lang, '取消並返回表單（已填資料會保留）', 'Cancel and return to the form (your inputs are kept)')}
        </motion.button>
      )}
    </motion.div>
  )
}
