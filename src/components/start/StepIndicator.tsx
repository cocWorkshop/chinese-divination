'use client'

/**
 * StepIndicator — 5-dot funnel progress, derived from the current pathname.
 *
 * The funnel is linear:
 *   1. /start              hook
 *   2. /start/cast         form
 *   3. /start/reading/[id] streaming reading
 *   4. /start/master/[id]  master demo
 *   5. /start/unlock/[id]  unlock
 *
 * /start/verify-sent is post-funnel (signup completed) — we render the
 * indicator at full (5/5) on that page. Users who navigate here bypassing
 * earlier views (e.g. from a deep link) still see consistent progress.
 *
 * Pure visual cue — no clicks, no nav. Sized small so it doesn't compete
 * with the hero / form on each view.
 */

import { usePathname } from 'next/navigation'

const STEPS = 5

function indexFromPath(pathname: string): number {
  if (pathname === '/start') return 1
  if (pathname.startsWith('/start/cast')) return 2
  if (pathname.startsWith('/start/reading')) return 3
  if (pathname.startsWith('/start/master')) return 4
  if (pathname.startsWith('/start/unlock')) return 5
  if (pathname.startsWith('/start/verify-sent')) return 5
  return 1
}

export default function StepIndicator() {
  const pathname = usePathname() || '/start'
  const current = indexFromPath(pathname)

  return (
    <div className="flex items-center justify-center gap-1.5 py-3" aria-label={`Step ${current} of ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isPast = stepNum < current
        const filled = isActive || isPast
        return (
          <span
            key={i}
            className="block rounded-full transition-all duration-300"
            style={{
              width: isActive ? 22 : 6,
              height: 6,
              background: filled ? 'var(--gold)' : 'rgba(212,175,55,0.18)',
              opacity: isActive ? 1 : isPast ? 0.65 : 0.5,
              boxShadow: isActive ? '0 0 8px rgba(212,175,55,0.4)' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}
