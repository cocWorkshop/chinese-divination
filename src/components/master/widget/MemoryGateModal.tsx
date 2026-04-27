'use client'

/**
 * Lightweight memory consent — a slim bottom-sheet that asks for memory
 * permission in 2 lines instead of a full-screen blocking modal.
 * Backdrop click = "decline" (dismiss). User must only click one button.
 */

import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  visible: boolean
  isEn: boolean
  onResolve: (action: 'enable' | 'decline') => void
}

export default function MemoryGateModal({ visible, isEn, onResolve }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="memory-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => onResolve('decline')}
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
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl flex-shrink-0">🧙‍♂️</span>
              <div>
                <h3 className="font-serif text-base mb-1" style={{ color: 'var(--gold)' }}>
                  {isEn ? 'Enable Master memory?' : '開啟大師記憶？'}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                  {isEn
                    ? 'Master Xuanji remembers your preferences and reading context for better advice. You can view or delete this memory anytime in your profile.'
                    : '玄機大師會記住你的偏好和命盤背景，提供更精準的建議。你可以隨時在個人資料中查看或刪除記憶。'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onResolve('decline')}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
              >
                {isEn ? 'Not now' : '暫不開啟'}
              </button>
              <button
                onClick={() => onResolve('enable')}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                {isEn ? 'Enable' : '開啟'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
