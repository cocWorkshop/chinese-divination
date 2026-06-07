'use client'

import { motion } from 'framer-motion'
import { useDivination } from '../DivinationContext'
import { T } from '../constants'

/**
 * Inline cache banner — replaces the old blocking modal. Sits above the
 * form, non-blocking, so users can still edit fields or ignore it. Shown
 * when a matching bazi/ziwei reading already exists.
 */
export default function CacheBanner() {
  const { lang, showCacheDialog, cachedReading, handleViewCached, setShowCacheDialog } = useDivination()

  if (!showCacheDialog || !cachedReading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-serif" style={{ color: 'var(--gold)' }}>
          📦 {T(lang,
            `已有 ${cachedReading.count} 筆相同分析（${new Date(cachedReading.createdAt).toLocaleDateString('zh-TW')}）`,
            `${cachedReading.count} existing reading(s) found (${new Date(cachedReading.createdAt).toLocaleDateString('en-US')})`
          )}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleViewCached}
          className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
          style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          {T(lang, '查看歷史', 'View History')}
        </button>
        <button
          onClick={() => setShowCacheDialog(false)}
          className="px-3 py-1.5 text-xs rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
