'use client'

import { motion } from 'framer-motion'

interface MasterEntryProps {
  isAdmin: boolean
  onEnter: () => void
  lang: string
}

export default function MasterEntry({ isAdmin, onEnter, lang }: MasterEntryProps) {
  const isEn = lang === 'en'

  // Hide entirely for non-admin users
  if (!isAdmin) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="mt-6 max-w-3xl mx-auto"
    >
      <div
        onClick={onEnter}
        className="relative overflow-hidden rounded-xl px-5 py-3 flex items-center gap-4 cursor-pointer backdrop-blur-md border transition-all duration-300 hover:border-[color:var(--gold)] hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] active:scale-[0.99]"
        style={{ borderColor: 'rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.04)' }}
      >
        <motion.span
          className="text-2xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🧙‍♂️
        </motion.span>
        <div className="flex-1 min-w-0">
          <span className="text-base font-serif" style={{ color: 'var(--gold)' }}>
            {isEn ? 'Ask the Master' : '問問大師'}
          </span>
          <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {isEn ? 'Chat with Master Xuanji' : '與玄機大師對話'}
          </span>
        </div>
        <span className="text-sm" style={{ color: 'var(--gold)', opacity: 0.6 }}>→</span>
      </div>
    </motion.div>
  )
}
