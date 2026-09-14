'use client'

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { useMasterChat } from '../MasterChatContext'
import type { GateIntent } from './CollapsedBar'

import { MasterSageIcon } from '@/components/DivinationIcons'

interface Props {
  needsMemoryGate: boolean
  onRequestGate: (intent: GateIntent) => void
  /** Reclaim keyboard focus on mount — set when the user just collapsed the expanded view. */
  focusOnMount?: boolean
}

/**
 * Collapsed Master entry as a bottom-right floating action button — the
 * app's native chat-entry language (reviving the old ChatWidget FAB form),
 * far less intrusive than the full-width bar. A breathing gold glow keeps it
 * prominent; tapping expands the Master (passing through the memory gate).
 *
 * The informative full-width bar (CollapsedBar) is still used while a reading
 * is being read (pendingReading) — see MasterChatWidget.
 */
export default function MasterFab({ needsMemoryGate, onRequestGate, focusOnMount }: Props) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const { setShape, widgetOpener } = useMasterChat()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // The infinite breathing glow is decorative — drop it entirely under
  // reduce-motion (MotionConfig only suppresses transform/layout animations,
  // not boxShadow keyframe loops).
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (focusOnMount) buttonRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpen = () => {
    if (needsMemoryGate) {
      onRequestGate({ kind: 'open' })
      return
    }
    setShape('expanded')
  }

  return (
    <div
      className="fixed right-5 sm:right-6 z-40 flex flex-col items-center gap-1.5 group"
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Hover label — reveals the Master's greeting without the permanent bar. */}
      <div
        className="hidden sm:block absolute right-[4.5rem] bottom-2 whitespace-nowrap text-sm font-serif px-3 py-1.5 rounded-xl pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
        style={{ backgroundColor: 'var(--nav-bg)', color: 'var(--gold)', border: '1px solid var(--border-gold)', backdropFilter: 'blur(8px)' }}
      >
        {widgetOpener}
      </div>

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          ...(reduceMotion
            ? {}
            : {
                boxShadow: [
                  '0 0 0 0 rgba(212,168,83,0.45)',
                  '0 0 0 12px rgba(212,168,83,0)',
                  '0 0 0 0 rgba(212,168,83,0)',
                ],
              }),
        }}
        transition={{
          scale: { type: 'spring', stiffness: 260, damping: 20 },
          opacity: { duration: 0.3 },
          ...(reduceMotion ? {} : { boxShadow: { repeat: Infinity, duration: 2.4, ease: 'easeOut' } }),
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        title={widgetOpener}
        aria-label={isEn ? 'Open Master Xuanji chat' : '展開玄機大師對話'}
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative shadow-lg"
        style={{
          background: 'linear-gradient(135deg, var(--gold) 0%, #b88628 100%)',
          color: '#080c17',
          boxShadow: '0 8px 24px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.5)',
        }}
      >
        <MasterSageIcon size={30} color="#080c17" />
      </motion.button>
    </div>
  )
}
