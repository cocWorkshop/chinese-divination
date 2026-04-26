'use client'

/**
 * Memory disclosure / gate modal — pops when the user tries to use the master
 * widget but either hasn't seen the disclosure or has memory disabled. Blocks
 * interaction until the user picks "enable" or "decline".
 *
 * Pure presentational: receives `visible`, `isEn`, and an `onResolve` callback.
 * Backdrop clicks are intentionally swallowed — the user must choose.
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { /* swallow backdrop clicks — user must choose */ }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="max-w-lg rounded-2xl p-7"
            style={{
              background: 'var(--card-bg, #1a1a2e)',
              border: '1px solid var(--border-gold, rgba(212,175,55,0.4))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl mb-4" style={{ color: 'var(--gold)' }}>
              {isEn ? 'Master Xuanji needs memory' : '玄機大師需要開啟記憶'}
            </h3>
            <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
              {isEn ? (
                <>
                  <p>
                    To consult with Master Xuanji, you need to enable the memory function. It lets me remember:
                    your interests (career, family, health…), how you prefer responses
                    (concise vs. detailed), and stable life context you've shared.
                  </p>
                  <p style={{ color: 'var(--text-muted)' }}>
                    <strong>Not recorded:</strong> momentary moods, one-off questions, or
                    private content unrelated to your charts. Chart data lives in your
                    reading history, not in my memory.
                  </p>
                  <p>
                    You can view, edit, pause, or delete this memory anytime in your profile.
                    If you choose not to enable it, the Master will remain unavailable.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    與玄機大師對話需要先開啟「記憶功能」。它讓我記下：你常關心的主題（事業、家庭、健康…）、你偏好的回應方式（簡潔／詳細），以及你提過的穩定生活背景。
                  </p>
                  <p style={{ color: 'var(--text-muted)' }}>
                    <strong>不會記錄：</strong>一次性的情緒、臨時的煩惱、與命盤無關的私人內容。命盤資料存在你的占卜歷史裡，不在我的「記憶」裡。
                  </p>
                  <p>
                    你可以隨時在個人資料中查看、編輯、暫停或刪除這份記憶。若你選擇不開啟，大師功能將無法使用。
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => onResolve('decline')}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--card-border)',
                }}
              >
                {isEn ? 'Not now' : '暫不開啟'}
              </button>
              <button
                onClick={() => onResolve('enable')}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                {isEn ? 'Enable memory & continue' : '開啟記憶，繼續使用'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
