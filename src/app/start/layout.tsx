/**
 * /start funnel layout — shared cosmic backdrop + step indicator + page
 * transitions.
 *
 * Every view under /start renders inside this. The starfield sits at z-0
 * (pointer-events-none); the step indicator and content sit at z-10.
 *
 * Page transitions: a thin <FunnelPageFade> client component wraps the
 * route children in AnimatePresence keyed by pathname, so navigating
 * between View 1→2→3→4→5 fades the old view out + new view in over
 * ~180ms. Subtle — not flashy — to keep the ceremonial mood.
 */

import Starfield from '@/components/start/Starfield'
import StepIndicator from '@/components/start/StepIndicator'
import FunnelPageFade from '@/components/start/FunnelPageFade'

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <Starfield />
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        <StepIndicator />
        <FunnelPageFade>{children}</FunnelPageFade>
      </div>
    </div>
  )
}
