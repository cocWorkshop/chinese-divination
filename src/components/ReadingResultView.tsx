'use client'

import BackButton from './BackButton'
import ReadingResultCard, { type ReadingResultCardProps } from './ReadingResultCard'

interface ReadingResultViewProps extends ReadingResultCardProps {
  /** Custom back action (e.g. reset the divination form). */
  onBack?: () => void
  /** Back destination when not using a custom handler. */
  backHref?: string
  backFallbackHref?: string
}

/**
 * The single, canonical reading-result page body — used identically by the
 * divination flow (live) and the saved-reading page (history). The ONLY
 * difference between the two is driven by props handled internally:
 *   - `streaming`  → flame border + live placeholders
 *   - back action  → reset-to-form (divination) vs navigate (history)
 *
 * Top-left: back button. Top-right (in the card header): share button.
 */
export default function ReadingResultView({
  onBack, backHref, backFallbackHref, ...card
}: ReadingResultViewProps) {
  return (
    <div className="flex-1 py-8 sm:py-12 px-3 sm:px-4 max-w-4xl mx-auto w-full overflow-x-hidden">
      <div className="mb-4">
        <BackButton onClick={onBack} href={backHref} fallbackHref={backFallbackHref} />
      </div>
      <ReadingResultCard {...card} />
    </div>
  )
}
