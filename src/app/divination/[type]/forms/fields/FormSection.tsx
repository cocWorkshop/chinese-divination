'use client'

import type { ReactNode } from 'react'

/**
 * Unified bordered section card used by every per-type form, so all
 * divination forms share the same visual structure (titled section →
 * labeled fields) regardless of type.
 */
export default function FormSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-4">
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
        {title}
      </p>
      {children}
    </div>
  )
}
