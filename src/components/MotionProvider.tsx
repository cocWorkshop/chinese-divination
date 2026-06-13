'use client'

import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Global Framer Motion config — honors the OS-level "reduce motion"
 * accessibility setting for every motion.* component in the tree
 * (transform/layout animations are skipped; opacity/color still animate).
 * CSS keyframe animations are separately neutralized by the
 * prefers-reduced-motion block in globals.css.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
