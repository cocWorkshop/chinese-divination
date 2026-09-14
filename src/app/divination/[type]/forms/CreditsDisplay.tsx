'use client'

import { SparkleIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T } from '../constants'

/**
 * Karma balance display — shown once credits are loaded (i.e. signed in).
 * Signed-out users have no balance yet, so nothing renders here; the auth
 * check happens on submit.
 */
export default function CreditsDisplay() {
  const { type, lang, credits, paipanOnly } = useDivination()

  if (!credits) return null

  return (
    <div className="oriental-sanctuary-card rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-gold-light/90 text-xs font-serif font-medium tracking-wide flex items-center gap-1.5">
          <SparkleIcon className="w-3.5 h-3.5 text-gold" />
          <span>{T(lang, '機緣餘額', 'Karma Balance')}</span>
        </span>
        <span className="text-gold font-mono font-bold">
          {credits.credits === 999 ? '∞' : (credits.credits ?? 0)}
          {paipanOnly ? (
            <span className="text-emerald-400/80 text-xs ml-1 font-sans font-normal">
              ({T(lang, '本次免費', 'free this time')})
            </span>
          ) : credits.costs && credits.costs[type] ? (
            <span className="text-white/40 text-xs ml-1">
              ({T(lang, `本次消耗 ${credits.costs[type]} 點`, `costs ${credits.costs[type]} pts`)})
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}
