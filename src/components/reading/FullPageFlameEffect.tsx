'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { subscribe } from '@/lib/events'

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
 * FullPageFlameEffect — Celestial Sacred Flame & Consecration Effect.
 *
 * Triggered when LLM generation completes ("reading result 页面的LLM加载全部完成后，
 * 再加一个整页燃烧的特效吧，这样用户直到完全完成了").
 *
 * Visuals:
 *   - Luminous golden flame boundary sweeping inwards from all four viewport edges.
 *   - Dynamic rising golden embers & cinnabar sparks resembling consecrated incense.
 *   - Centered celestial seal: 「✦ 天機推演圓滿 · 萬象昭然 ✦」 with vermillion stamp.
 *   - Automatic graceful fade-out after ~3.5s, strictly pointer-events-none.
 */
export default function FullPageFlameEffect({
  streaming = false,
  lang = 'zh-TW',
}: FullPageFlameEffectProps) {
  const [active, setActive] = useState(false)
  const prevStreamingRef = useRef(streaming)
  const hasTriggeredRef = useRef(false)
  const reduceMotion = useReducedMotion()
  const isZh = lang !== 'en'

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
    setActive(true)
    const timer = setTimeout(() => {
      setActive(false)
    }, 3600)
    return () => clearTimeout(timer)
  }

  // 1. Trigger when streaming transitions from true to false
  useEffect(() => {
    if (prevStreamingRef.current && !streaming && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true
      triggerEffect()
    }
    prevStreamingRef.current = streaming
  }, [streaming])

  // 2. Listen to xuanji:readingComplete or explicit trigger
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
    }
  }, [])

  if (!active) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* Full-screen Flame Vignette & Glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.9, 0.7, 0] }}
          transition={{ duration: 3.5, times: [0, 0.15, 0.5, 0.8, 1], ease: 'easeInOut' }}
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(212, 168, 83, 0.08) 0%, rgba(245, 158, 11, 0.22) 65%, rgba(234, 88, 12, 0.38) 100%)',
            boxShadow: 'inset 0 0 120px 30px rgba(245, 158, 11, 0.45), inset 0 0 60px 15px rgba(254, 240, 138, 0.35)',
          }}
        />

        {/* Bottom Flame Corona Surge */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: [0, 0.9, 0.8, 0], y: [60, 0, -20, -50] }}
          transition={{ duration: 3.4, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
          className="absolute bottom-0 left-0 right-0 h-48 sm:h-64"
          style={{
            background:
              'linear-gradient(to top, rgba(234, 88, 12, 0.5) 0%, rgba(245, 158, 11, 0.35) 45%, rgba(212, 168, 83, 0.15) 75%, transparent 100%)',
            filter: 'blur(12px)',
          }}
        />

        {/* Top Flame Glow */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: [0, 0.7, 0.5, 0], y: [-30, 0, 10, 0] }}
          transition={{ duration: 3.2, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
          className="absolute top-0 left-0 right-0 h-32"
          style={{
            background:
              'linear-gradient(to bottom, rgba(245, 158, 11, 0.3) 0%, rgba(212, 168, 83, 0.12) 60%, transparent 100%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Left & Right Perimeter Flame Tongues */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 3.2, times: [0, 0.25, 1] }}
          className="absolute inset-y-0 left-0 w-24 sm:w-32"
          style={{
            background: 'linear-gradient(to right, rgba(245, 158, 11, 0.35) 0%, transparent 100%)',
            filter: 'blur(10px)',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 3.2, times: [0, 0.25, 1] }}
          className="absolute inset-y-0 right-0 w-24 sm:w-32"
          style={{
            background: 'linear-gradient(to left, rgba(245, 158, 11, 0.35) 0%, transparent 100%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Rising Golden Embers & Sparks (skipped if reduceMotion) */}
        {!reduceMotion &&
          embers.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 0,
                scale: 0.2,
                x: 0,
                y: '105vh',
              }}
              animate={{
                opacity: [0, 1, 0.9, 0],
                scale: [0.3, 1.2, 0.9, 0.4],
                x: [0, p.drift * 0.5, p.drift],
                y: '-10vh',
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

        {/* Grand Consecration Seal & Toast Banner */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
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
            className="relative px-6 py-5 sm:px-9 sm:py-6 rounded-2xl shadow-2xl border text-center max-w-lg mx-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 24, 48, 0.92) 0%, rgba(8, 12, 23, 0.96) 100%)',
              borderColor: 'rgba(212, 168, 83, 0.6)',
              boxShadow:
                '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 40px 8px rgba(212, 168, 83, 0.3), inset 0 0 20px rgba(212, 168, 83, 0.15)',
              backdropFilter: 'blur(16px)',
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
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-gold/60 text-xs">✦</span>
              <span className="stamp-vermillion text-[11px] py-0.5 px-2.5 tracking-widest font-serif shadow-md">
                {isZh ? '玄機圓滿' : 'CONSECRATED'}
              </span>
              <span className="text-gold/60 text-xs">✦</span>
            </div>

            {/* Main Consecration Title */}
            <h2 className="text-lg sm:text-2xl font-serif font-medium text-gold-light tracking-wide mb-1.5 drop-shadow-[0_2px_8px_rgba(212,168,83,0.4)]">
              {isZh ? '✦ 天機推演圓滿 · 萬象昭然 ✦' : '✦ Divination Consecrated ✦'}
            </h2>

            {/* Subtitle / Blessing */}
            <p className="text-xs sm:text-sm font-serif text-white/75 font-light tracking-wider">
              {isZh
                ? '全盤氣數推演已成，吉凶玄機盡在掌握'
                : 'Celestial insight fully synthesized · All chapters unlocked'}
            </p>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
