'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'
import BackButton from '@/components/BackButton'
import { DivinationIcon } from '@/components/DivinationIcons'
import { useDivination } from './DivinationContext'
import { T } from './constants'
import DivinationForm from './forms/DivinationForm'
import GeneratingState from './components/GeneratingState'
import ReadingPanel from './components/ReadingPanel'
import CacheDialog from './components/CacheDialog'

/**
 * Stage orchestrator — switches between form (stage 1), generating
 * indicator (stage 2) and reading result (stage 3) based on the stream
 * state, without any route change.
 *
 * The result stage early-returns <ReadingPanel>, which renders the exact
 * same <ReadingResultView> the saved-reading page uses — so the divination
 * result and the dashboard-opened reading are an identical page (the only
 * difference, streaming, is handled inside that view via props).
 */
export default function DivinationFlow() {
  const router = useRouter()
  const { lang, info, type, loading, streaming, hasLLMContent, result } = useDivination()

  // One-render gate (formerly a role-tier check). Kept so the first paint
  // matches the original behavior and avoids a hydration flash.
  const [tierChecked, setTierChecked] = useState(false)
  useEffect(() => { setTierChecked(true) }, [])

  if (!tierChecked) return null

  const showGenerating = (loading && !streaming && !result) || (streaming && !hasLLMContent)
  const showResult = hasLLMContent || (!streaming && result)

  // Stage 3 — the result is its own full-width page, identical to /reading/[id].
  if (showResult) return <ReadingPanel />

  // Stages 1 & 2 — form / generating share the narrower form layout.
  return (
    <div className={`flex flex-col py-6 sm:py-10 px-3 sm:px-4 max-w-4xl mx-auto w-full ${loading ? '' : 'min-h-[calc(100vh-4rem)]'}`}>
      <CacheDialog />

      {/* Top Navigation Bar with BackButton & Breadcrumbs */}
      {!showGenerating && (
        <div className="flex items-center justify-between gap-3 mb-6">
          <BackButton fallbackHref="/divination" label={T(lang, '返回大廳', 'Divinations')} variant="pill" />
          <div className="flex items-center gap-1.5 text-xs text-white/50 font-serif">
            <Link href="/divination" className="hover:text-gold transition-colors">
              {T(lang, '占卜大廳', 'Divinations')}
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-gold/80">{lang === 'en' ? info.enName : info.twName}</span>
          </div>
        </div>
      )}

      {/* Page header (type symbol + name). Hidden during the generating
          stage so it doesn't sit redundantly above the animated loader. */}
      {!showGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-navy-900/80 border border-gold/30 flex items-center justify-center shadow-lg shadow-gold/5 relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gold/10 to-transparent pointer-events-none" />
              {type === 'iching' ? (
                <YinYangIcon size={38} className="text-gold" />
              ) : (
                <DivinationIcon type={type} className="w-9 h-9 text-gold-light drop-shadow-md" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-serif text-gold tracking-wide">{lang === 'en' ? info.enName : info.twName}</h1>
        </motion.div>
      )}

      {/* Stage 1 — form */}
      {!result && !loading && <DivinationForm />}

      {/* Stage 2 — generating */}
      {showGenerating && <GeneratingState />}
    </div>
  )
}
