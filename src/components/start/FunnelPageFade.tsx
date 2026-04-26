'use client'

/**
 * Wraps the funnel children in <AnimatePresence> keyed by pathname so
 * route transitions between View 1 → 2 → 3 → 4 → 5 fade smoothly instead
 * of cutting hard. ~180ms — short enough to feel responsive, long enough
 * to feel deliberate.
 *
 * Uses `mode="wait"` so the exit completes before the enter begins (no
 * overlap flicker). The motion wrapper is `flex-1 flex flex-col` so child
 * pages that use `flex-1` for vertical centering still work correctly.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function FunnelPageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/start'
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
