'use client'

import type { ReactNode } from 'react'

/**
 * Unified bordered section card used by every per-type form, so all
 * divination forms share the same visual structure (titled section →
 * labeled fields) regardless of type.
 */
export default function FormSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="oriental-sanctuary-card rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="text-gold-light/90 text-sm font-serif font-medium tracking-wide flex items-center gap-2 border-b border-gold/10 pb-2.5">
        {title}
      </div>
      {children}
    </div>
  )
}
