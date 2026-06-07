'use client'

import { motion } from 'framer-motion'
import { useDivination } from '../DivinationContext'
import { T } from '../constants'

/**
 * Blocking cache dialog — shown when a matching bazi/ziwei reading already
 * exists for this user/target. Restores the original modal UX (view history /
 * new reading / cancel) in place of the inline banner: clicking 解卦 halts
 * submission and surfaces this choice front-and-center so the user can't miss it.
 */
export default function CacheDialog() {
  const {
    lang, type, showCacheDialog, cachedReading,
    handleViewCached, handleNewReading, setShowCacheDialog,
  } = useDivination()

  if (!showCacheDialog || !cachedReading) return null

  const subject = type === 'ziwei' ? T(lang, '紫微', 'Zi Wei') : T(lang, '八字', 'BaZi')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowCacheDialog(false)}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 rounded-2xl max-w-md w-full text-center space-y-4 border border-gold/25"
      >
        <div className="text-4xl">📦</div>
        <h3 className="text-xl font-serif text-gold">
          {T(lang, `發現歷史${subject}分析`, `Existing ${subject} Reading Found`)}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {T(lang,
            `已有 ${cachedReading.count} 筆相同生辰的分析記錄。最近一次：${new Date(cachedReading.createdAt).toLocaleDateString('zh-TW')}`,
            `Found ${cachedReading.count} existing reading(s) with the same birth data. Latest: ${new Date(cachedReading.createdAt).toLocaleDateString('en-US')}`
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
          <button
            onClick={handleViewCached}
            className="px-5 py-2.5 rounded-lg font-medium bg-gold/15 border border-gold/40 text-gold hover:bg-gold/25 transition-colors"
          >
            {T(lang, '📖 查看歷史', '📖 View History')}
          </button>
          <button
            onClick={handleNewReading}
            className="px-5 py-2.5 rounded-lg font-medium bg-gold text-navy-950 hover:bg-gold-light transition-colors"
          >
            {T(lang, '🔮 重新占卜', '🔮 New Reading')}
          </button>
        </div>
        <button
          onClick={() => setShowCacheDialog(false)}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {T(lang, '取消', 'Cancel')}
        </button>
      </motion.div>
    </div>
  )
}
