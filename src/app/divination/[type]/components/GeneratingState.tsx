'use client'

import LoadingOracle from '@/components/LoadingOracle'
import { useDivination } from '../DivinationContext'

/**
 * Stage 2 — the "generating" indicator shown while the reading is being
 * produced but no LLM content has streamed in yet. Bridges the (possibly
 * long) reasoning phase so the user isn't staring at empty placeholders.
 */
export default function GeneratingState() {
  const { type, streamStartTime } = useDivination()
  return (
    <div className="flex-1 flex flex-col">
      <LoadingOracle divinationType={type} startTime={streamStartTime || undefined} />
    </div>
  )
}
