'use client'

/**
 * View 1 of the /start ad funnel — pure marketing hook.
 *
 * Cosmic-minimalism polish: hero is typed in char-by-char (echoes the
 * "AI is generating" feel that View 3/4 use for real); the CTA gets a
 * gold halo on idle. Background starfield comes from /start/layout.tsx.
 *
 * UTM params from the ad URL are captured into sessionStorage here so
 * View 2 can attach them to the /api/start/init payload (attribution).
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import TypewriterText from '@/components/start/TypewriterText'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

export default function StartHookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hookDone, setHookDone] = useState(false)

  useEffect(() => {
    const utm: Record<string, string> = {}
    for (const k of UTM_KEYS) {
      const v = searchParams.get(k)
      if (v) utm[k] = v
    }
    if (Object.keys(utm).length > 0) {
      try {
        sessionStorage.setItem('xj_utm', JSON.stringify(utm))
      } catch { /* private mode or quota */ }
    }
  }, [searchParams])

  return (
    <main className="relative flex-1 flex items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-xl text-center">
        {/* Hook line — typed in char-by-char to set the "AI generating" tone */}
        <h1
          className="font-serif text-3xl sm:text-4xl leading-tight mb-3 min-h-[3rem]"
          style={{ color: 'var(--gold)' }}
        >
          <TypewriterText
            text="一念既起，玄機已現"
            speed={130}
            startDelay={120}
            onDone={() => setHookDone(true)}
          />
        </h1>

        {/* Sub-headline + CTA fade in once the hook completes — sequenced reveal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: hookDone ? 1 : 0, y: hookDone ? 0 : 8 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p
            className="text-base sm:text-lg leading-relaxed mb-10"
            style={{ color: 'var(--text-secondary)' }}
          >
            古法命理 × 萬卷之識
            <br />
            三分鐘為您起一張命盤
          </p>

          {/* CTA with breathing halo */}
          <div className="relative inline-block">
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: 'var(--gold)',
                filter: 'blur(18px)',
                opacity: 0.35,
                animation: 'xjCtaBreathe 3.2s ease-in-out infinite',
              }}
            />
            <button
              onClick={() => router.push('/start/cast')}
              className="relative px-8 py-3.5 rounded-xl font-medium text-base transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
            >
              免費為我起命盤 →
            </button>
          </div>

          <p className="mt-8 text-xs" style={{ color: 'var(--text-muted)' }}>
            免費試用 · 無需註冊 · 您的資訊只用於這次排盤
          </p>
        </motion.div>

        <style jsx>{`
          @keyframes xjCtaBreathe {
            0%, 100% { opacity: 0.25; transform: scale(0.97); }
            50% { opacity: 0.45; transform: scale(1.05); }
          }
        `}</style>
      </div>
    </main>
  )
}
