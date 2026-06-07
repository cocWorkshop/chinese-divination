'use client'

import { DivinationProvider } from './DivinationContext'
import DivinationFlow from './DivinationFlow'

/**
 * Divination flow entry point. A single dynamic route ([type]) serves all
 * divination types and all three stages (form → generating → result),
 * which are state-driven (no route change). The provider holds the shared
 * state; DivinationFlow renders the active stage.
 *
 * The implementation is decomposed under this folder:
 *   - constants.ts            static data, types, shared style strings
 *   - hooks/                  form state, /api/init fetch, streaming submit
 *   - DivinationContext.tsx   composes the hooks, exposes useDivination()
 *   - forms/                  per-type form sections + dispatcher + fields
 *   - components/             generating / result / cache-banner / flame style
 *   - DivinationFlow.tsx      the three-stage orchestrator
 */
export default function DivinationFormPage() {
  return (
    <DivinationProvider>
      <DivinationFlow />
    </DivinationProvider>
  )
}
