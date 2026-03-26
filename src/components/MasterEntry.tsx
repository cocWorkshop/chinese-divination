'use client'

import { motion } from 'framer-motion'

interface MasterEntryProps {
  isAdmin: boolean
  onEnter: () => void
  lang: string
}

export default function MasterEntry({ isAdmin, onEnter, lang }: MasterEntryProps) {
  const isEn = lang === 'en'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-10 max-w-2xl mx-auto"
    >
      <div
        onClick={isAdmin ? onEnter : undefined}
        className={`relative rounded-2xl p-6 sm:p-8 text-center transition-all
          bg-white/5 backdrop-blur-sm border border-white/10
          ${isAdmin ? 'cursor-pointer hover:border-[var(--gold)] hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]' : 'opacity-50 cursor-default'}
        `}
      >
        {!isAdmin && (
          <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-white/10" style={{ color: 'var(--text-muted)' }}>
            {isEn ? 'Coming Soon' : '即將開放'}
          </span>
        )}
        <div className="text-5xl mb-4">🧙‍♂️</div>
        <h2 className="text-2xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
          {isEn ? 'Ask the Master' : '問問大師'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isEn
            ? 'Consult with Master Xuanji for destiny insights'
            : '與玄機大師對話，洞察命運玄機'}
        </p>
        {isAdmin && (
          <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            {isEn ? 'Enter' : '進入對話'} →
          </div>
        )}
      </div>
    </motion.div>
  )
}
