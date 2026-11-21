'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { subscribe } from '@/lib/events'
import { T } from '@/lib/i18n'

interface FullPageFlameEffectProps {
  /**
   * Current streaming status. When streaming transitions from true to false,
   * the full-page flame effect triggers automatically.
   */
  streaming?: boolean
  /** Language for the consecration seal banner. Defaults to zh-TW. */
  lang?: string
}

interface Particle {
  id: number
  left: number // 0-100%
  size: number // 3-8px
  delay: number // 0-1.2s
  duration: number // 1.6-3.0s
  drift: number // -40 to 40px
  color: string
}

/**
 * FullPageFlameEffect — Scoped Sacred Flame & Consecration Effect.
 *
 * Triggered when LLM generation completes (streaming true -> false or
 * `xuanji:readingComplete`), rendering strictly inside its anchored reading
 * card/region (never full-viewport above navbar or right-hand Master dock).
 *
 * Visuals:
 *   - Luminous golden perimeter glow & side flames clipped to the reading card.
 *   - Viewport-sticky stage keeping top/bottom corona surges and rising embers
 *     continuously visible even across multi-thousand-pixel natal charts.
 *   - Sticky consecration seal: 「✦ 天機推演圓滿 · 萬象昭然 ✦」 staying within
 *     both horizontal card bounds and visible scroll position.
 *   - Dual-theme surface (oriental-sanctuary-card) adapting to Dark & Light mode.
 */
export default function FullPageFlameEffect({
  streaming = false,
  lang = 'zh-TW',
}: FullPageFlameEffectProps) {
  const [active, setActive] = useState(false)
  const prevStreamingRef = useRef(streaming)
  const hasTriggeredRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()

  // Generate randomized embers once
  const embers: Particle[] = useMemo(() => {
    const colors = ['#f59e0b', '#d4a853', '#fbbf24', '#fef08a', '#ea580c', '#eab308']
    return Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      left: Math.random() * 96 + 2, // 2% to 98%
      size: Math.floor(Math.random() * 5) + 3, // 3px to 7px
      delay: Math.random() * 1.2,
      duration: 1.8 + Math.random() * 1.4,
      drift: (Math.random() - 0.5) * 80,
      color: colors[i % colors.length],
    }))
  }, [])

  const triggerEffect = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setActive(true)
    timerRef.current = setTimeout(() => {
      setActive(false)
      timerRef.current = null
    }, 3600)
  }

  // 1. Trigger when streaming transitions from true to false
  useEffect(() => {
    if (prevStreamingRef.current && !streaming && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true
      triggerEffect()
    }
    prevStreamingRef.current = streaming
  }, [streaming])

  // 2. Listen to xuanji:readingComplete or explicit trigger & cleanup timer
  useEffect(() => {
    const unsubComplete = subscribe('xuanji:readingComplete', () => {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true
        triggerEffect()
      }
    })

    const handleManual = () => {
      triggerEffect()
    }
    window.addEventListener('xuanji:triggerFlame', handleManual)

    return () => {
      unsubComplete()
      window.removeEventListener('xuanji:triggerFlame', handleManual)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!active) return null

  return (
    <AnimatePresence>
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none z-30 overflow-clip select-none"
        aria-hidden="true"
      >
        {/* Full-Card Perimeter Flame Vignette & Glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.9, 0.7, 0] }}
          transition={{ duration: 3.5, times: [0, 0.15, 0.5, 0.8, 1], ease: 'easeInOut' }}
          className="absolute inset-0 rounded-[inherit]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(212, 168, 83, 0.06) 0%, rgba(245, 158, 11, 0.18) 65%, rgba(234, 88, 12, 0.32) 100%)',
            boxShadow: 'inset 0 0 80px 20px rgba(245, 158, 11, 0.4), inset 0 0 36px 10px rgba(254, 240, 138, 0.3)',
          }}
        />

        {/* Left & Right Card-Edge Perimeter Flame Tongues */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 3.2, times: [0, 0.25, 1] }}
          className="absolute inset-y-0 left-0 w-16 sm:w-24"
          style={{
            background: 'linear-gradient(to right, rgba(245, 158, 11, 0.32) 0%, transparent 100%)',
            filter: 'blur(10px)',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 3.2, times: [0, 0.25, 1] }}
          className="absolute inset-y-0 right-0 w-16 sm:w-24"
          style={{
            background: 'linear-gradient(to left, rgba(245, 158, 11, 0.32) 0%, transparent 100%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Sticky Viewport-Slice Stage: keeps top/bottom flames and rising sparks in view on long charts */}
        <div className="sticky top-16 [.workspace-docked_&]:top-0 h-[calc(100vh-4rem)] max-h-full w-full overflow-hidden">
          {/* Bottom Flame Corona Surge */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: [0, 0.9, 0.8, 0], y: [30, 0, -12, -30] }}
            transition={{ duration: 3.4, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
            className="absolute bottom-0 left-0 right-0 h-32 sm:h-44"
            style={{
              background:
                'linear-gradient(to top, rgba(234, 88, 12, 0.45) 0%, rgba(245, 158, 11, 0.3) 45%, rgba(212, 168, 83, 0.12) 75%, transparent 100%)',
              filter: 'blur(12px)',
            }}
          />

          {/* Top Flame Glow */}
          <motion.div
            initial={{ opacity: 0, y: -25 }}
            animate={{ opacity: [0, 0.7, 0.5, 0], y: [-20, 0, 8, 0] }}
            transition={{ duration: 3.2, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
            className="absolute top-0 left-0 right-0 h-24 sm:h-28"
            style={{
              background:
                'linear-gradient(to bottom, rgba(245, 158, 11, 0.28) 0%, rgba(212, 168, 83, 0.1) 60%, transparent 100%)',
              filter: 'blur(8px)',
            }}
          />

          {/* Rising Golden Embers & Sparks (percentage-bound inside stage; skipped if reduceMotion) */}
          {!reduceMotion &&
            embers.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  opacity: 0,
                  scale: 0.2,
                  x: 0,
                  top: '102%',
                }}
                animate={{
                  opacity: [0, 1, 0.9, 0],
                  scale: [0.3, 1.2, 0.9, 0.4],
                  x: [0, p.drift * 0.5, p.drift],
                  top: '-8%',
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: 'easeOut',
                }}
                className="absolute rounded-full"
                style={{
                  left: `${p.left}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  boxShadow: `0 0 ${p.size * 2.5}px ${p.color}, 0 0 ${p.size * 4}px rgba(254, 240, 138, 0.6)`,
                }}
              />
            ))}
        </div>

        {/* Sticky Consecration Seal & Toast Banner — strictly horizontally & vertically clamped inside card */}
        <div className="absolute inset-0 py-6 px-4">
          <div className="sticky top-[35vh] [.workspace-docked_&]:top-[30vh] flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 25 }}
              animate={{
                opacity: [0, 1, 1, 0.95, 0],
                scale: [0.85, 1.02, 1, 0.98, 0.92],
                y: [25, 0, 0, -5, -20],
              }}
              transition={{
                duration: 3.4,
                times: [0, 0.18, 0.65, 0.85, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="oriental-sanctuary-card relative px-6 py-5 sm:px-9 sm:py-6 rounded-2xl shadow-2xl border border-gold/60 text-center max-w-md w-full sm:w-auto mx-auto"
              style={{
                boxShadow:
                  '0 20px 50px -10px rgba(0, 0, 0, 0.55), 0 0 36px 6px rgba(212, 168, 83, 0.28), inset 0 0 18px rgba(212, 168, 83, 0.12)',
              }}
            >
              {/* Ambient inner gold aura */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
                style={{
                  background: 'radial-gradient(circle at 50% 30%, var(--gold) 0%, transparent 70%)',
                }}
              />

              {/* Top vermillion seal stamp */}
              <div className="flex items-center justify-center gap-2 mb-2 relative z-10">
                <span className="text-gold/60 text-xs">✦</span>
                <span className="stamp-vermillion text-[11px] py-0.5 px-2.5 tracking-widest font-serif shadow-md">
                  {T(lang, '玄機圓滿', 'CONSECRATED')}
                </span>
                <span className="text-gold/60 text-xs">✦</span>
              </div>

              {/* Main Consecration Title */}
              <h2 className="text-lg sm:text-2xl font-serif font-medium text-gold tracking-wide mb-1.5 drop-shadow-[0_2px_8px_rgba(212,168,83,0.3)] relative z-10">
                {T(lang, '✦ 天機推演圓滿 · 萬象昭然 ✦', '✦ Divination Consecrated ✦')}
              </h2>

              {/* Subtitle / Blessing */}
              <p className="text-xs sm:text-sm font-serif text-[var(--text-secondary)] font-light tracking-wider relative z-10">
                {T(
                  lang,
                  '全盤氣數推演已成，吉凶玄機盡在掌握',
                  'Celestial insight fully synthesized · All chapters unlocked',
                )}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  )
}
