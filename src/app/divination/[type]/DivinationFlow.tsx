'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'
import { useDivination } from './DivinationContext'
import { T } from './constants'
import DivinationForm from './forms/DivinationForm'
import GeneratingState from './components/GeneratingState'
import ReadingPanel from './components/ReadingPanel'
import CacheBanner from './components/CacheBanner'

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
    <div className={`flex flex-col py-8 sm:py-12 px-3 sm:px-4 max-w-4xl mx-auto w-full ${loading ? '' : 'min-h-[calc(100vh-4rem)]'}`}>
      <CacheBanner />

      {/* Page header (type symbol + name). Hidden during the generating
          stage so it doesn't sit redundantly above the animated loader. */}
      {!showGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-5xl mb-3">{type === 'iching' ? <YinYangIcon size={48} /> : info.symbol}</div>
          <h1 className="text-3xl font-serif text-gold">{lang === 'en' ? info.enName : info.twName}</h1>
        </motion.div>
      )}

      {/* Back link (form stage) */}
      {!result && !loading && (
        <button
          type="button"
          onClick={() => router.push('/divination')}
          className="mb-4 text-sm transition-colors hover:text-gold flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          ← {T(lang, '返回占卜列表', 'Back to Divination')}
        </button>
      )}

      {/* Stage 1 — form */}
      {!result && !loading && <DivinationForm />}

      {/* Stage 2 — generating */}
      {showGenerating && <GeneratingState />}
    </div>
  )
}
