'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          // Bottom-right, stacked above the Master FAB. The FAB sits at right-4
          // (56px wide); right-6 (24px) centers this 40px button over it.
          className="fixed bottom-24 right-6 z-30 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-sm transition-colors"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
          aria-label="Scroll to top"
        >
          ▲
        </motion.button>
      )}
    </AnimatePresence>
  )
}
