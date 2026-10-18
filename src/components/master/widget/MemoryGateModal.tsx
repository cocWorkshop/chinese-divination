'use client'

/**
 * Lightweight memory consent — a slim bottom-sheet that asks for memory
 * permission in 2 lines instead of a full-screen blocking modal.
 * Backdrop click / Escape = "decline" (dismiss). User must only click one
 * button. Focus moves to the primary button on open and is trapped between
 * the two buttons while visible.
 */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MasterSageIcon } from '@/components/DivinationIcons'
import { registerOverlay } from '@/lib/overlayStack'
import { TEN } from '@/lib/i18n'

interface Props {
  visible: boolean
  isEn: boolean
  onResolve: (action: 'enable' | 'decline') => void
}

export default function MemoryGateModal({ visible, isEn, onResolve }: Props) {
  const declineRef = useRef<HTMLButtonElement>(null)
  const enableRef = useRef<HTMLButtonElement>(null)
  const onResolveRef = useRef(onResolve)
  onResolveRef.current = onResolve

  useEffect(() => {
    if (visible) setTimeout(() => enableRef.current?.focus(), 50)
  }, [visible])

  // Android hardware-back / global back: dismiss = decline.
  useEffect(() => {
    if (!visible) return
    return registerOverlay('memory-gate', () => onResolveRef.current('decline'))
  }, [visible])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onResolve('decline')
    } else if (e.key === 'Tab') {
      // Two-element focus trap — Tab toggles between Decline and Enable.
      e.preventDefault()
      if (document.activeElement === enableRef.current) declineRef.current?.focus()
      else enableRef.current?.focus()
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="memory-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-scrim"
          onClick={() => onResolve('decline')}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
            style={{
              background: 'var(--card-bg, #1a1a2e)',
              border: '1px solid var(--border-gold, rgba(212,175,55,0.4))',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-gate-title"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0" aria-hidden>
                <MasterSageIcon size={28} color="var(--gold)" />
              </span>
              <div>
                <h3 id="memory-gate-title" className="font-serif text-base mb-1" style={{ color: 'var(--gold)' }}>
                  {TEN(isEn, '開啟大師記憶？', 'Enable Master memory?')}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                  {TEN(
                    isEn,
                    '玄機大師會記住你的偏好和命盤背景，提供更精準的建議。你可以隨時在個人資料中管理記憶功能。',
                    'Master Xuanji remembers your preferences and reading context for better advice. You can manage the memory function anytime in your profile.',
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                ref={declineRef}
                onClick={() => onResolve('decline')}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
              >
                {TEN(isEn, '暫不開啟', 'Not now')}
              </button>
              <button
                ref={enableRef}
                onClick={() => onResolve('enable')}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                {TEN(isEn, '開啟', 'Enable')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
