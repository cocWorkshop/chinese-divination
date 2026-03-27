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
      transition={{ delay: 0.5, duration: 0.6 }}
      className="mt-10 max-w-2xl mx-auto"
    >
      <div
        onClick={isAdmin ? onEnter : undefined}
        className={`
          relative overflow-hidden rounded-2xl p-8 sm:p-10 text-center
          backdrop-blur-md border transition-all duration-500
          ${isAdmin
            ? 'cursor-pointer border-[color:var(--gold)]/30 hover:border-[color:var(--gold)] hover:shadow-[0_0_40px_rgba(212,175,55,0.25)] active:scale-[0.98]'
            : 'opacity-50 cursor-default border-white/10'
          }
        `}
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(139,101,8,0.12) 25%, rgba(17,29,53,0.9) 50%, rgba(139,101,8,0.12) 75%, rgba(212,175,55,0.08) 100%)',
            backgroundSize: '400% 400%',
            animation: 'masterGradient 8s ease infinite',
          }}
        />
        <div className="absolute inset-0 -z-10 bg-[var(--card-bg)] opacity-60" />

        {/* Coming soon badge */}
        {!isAdmin && (
          <span
            className="absolute top-4 right-4 text-xs font-medium px-3 py-1 rounded-full border border-white/10"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
          >
            {isEn ? 'Coming Soon' : '即將開放'}
          </span>
        )}

        {/* Icon */}
        <motion.div
          className="text-5xl mb-5"
          animate={isAdmin ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🧙‍♂️
        </motion.div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
          {isEn ? 'Ask the Master' : '問問大師'}
        </h2>

        {/* Subtitle */}
        <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {isEn
            ? 'Consult with Master Xuanji for destiny insights'
            : '與玄機大師對話，洞察命運玄機'}
        </p>

        {/* Enter hint */}
        {isAdmin && (
          <motion.div
            className="mt-5 text-sm font-medium"
            style={{ color: 'var(--gold)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {isEn ? 'Enter' : '進入對話'} →
          </motion.div>
        )}
      </div>

      {/* CSS keyframes */}
      <style jsx global>{`
        @keyframes masterGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.div>
  )
}
