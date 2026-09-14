'use client'

/**
 * StepIndicator — Dynamic progress dots derived from current pathname and step query param.
 */

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function StepIndicatorInner() {
  const pathname = usePathname() || '/start'
  const searchParams = useSearchParams()
  const stepParam = searchParams?.get('step')

  let current = 1
  let total = 3

  if (pathname === '/start') {
    total = 3
    if (stepParam === 'spark') current = 2
    else if (stepParam === 'roadmap') current = 3
    else current = 1
  } else if (pathname.startsWith('/start/cast')) {
    total = 5
    current = 2
  } else if (pathname.startsWith('/start/reading')) {
    total = 5
    current = 3
  } else if (pathname.startsWith('/start/master')) {
    total = 5
    current = 4
  } else if (pathname.startsWith('/start/unlock') || pathname.startsWith('/start/verify-sent')) {
    total = 5
    current = 5
  }

  return (
    <div className="flex items-center justify-center gap-1.5 py-3" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isPast = stepNum < current
        const filled = isActive || isPast
        return (
          <span
            key={i}
            className="block rounded-full transition-all duration-300"
            style={{
              width: isActive ? 24 : 6,
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

export default function StepIndicator() {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <StepIndicatorInner />
    </Suspense>
  )
}
