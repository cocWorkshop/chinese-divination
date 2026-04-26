'use client'

/**
 * Reusable accordion drawer for V2 result renderers.
 *
 * Default behavior: **all drawers open**. The user can collapse any
 * individual section but doesn't have to hunt for the open one — the
 * full reading is visible top-to-bottom on first paint, which matches
 * the streaming UX (sections fill in as they arrive).
 *
 * Each drawer owns its own `open` state — no parent coordination
 * required. Replaces the older "one-section-at-a-time" accordion that
 * lived inline in QimenResult / FengshuiResult / OtherResult.
 *
 * Used by Bazi V2, Ziwei V2, Liu Yao, Qi Men, Feng Shui, Mei Hua,
 * I Ching V2 — anywhere a result has multiple long-form prose sections.
 */

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SectionDrawerProps {
  /** Emoji or single character icon shown in the title row. */
  icon?: ReactNode
  /** Title text — translated by the caller before passing in. */
  title: ReactNode
  /** Optional decoration on the right of the title (e.g. typing-dot
   *  placeholder during streaming). Rendered before the chevron. */
  trailing?: ReactNode
  /** Drawer body. Caller provides whatever it wants — markdown, custom
   *  layout, etc. SectionDrawer only owns the chrome + animation. */
  children: ReactNode
  /** Override the initial open state. Defaults to true ("all open" UX). */
  defaultOpen?: boolean
  /**
   * Title alignment. Default `'left'` matches regular section drawers;
   * use `'center'` for the top-level chart drawer (paipan / 命盤 /
   * 卦象 / 格局) so it visually announces itself as a different category
   * from the prose sections beneath.
   */
  align?: 'left' | 'center'
  /**
   * Size variant. `'lg'` = larger header (used for the chart drawer to
   * give it presence — it's the centerpiece of the reading). Default
   * `'md'` for regular section drawers.
   */
  size?: 'md' | 'lg'
}

export default function SectionDrawer({
  icon,
  title,
  trailing,
  children,
  defaultOpen = true,
  align = 'left',
  size = 'md',
}: SectionDrawerProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isCenter = align === 'center'
  const isLg = size === 'lg'

  return (
    <div className={`glass-card rounded-xl border ${isLg ? 'border-gold/40' : 'border-gold/20'} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${isLg ? 'px-4 sm:px-5 py-4 sm:py-5' : 'px-4 sm:px-5 py-3 sm:py-4'} flex items-center gap-2 ${isCenter ? 'justify-center' : 'text-left'}`}
      >
        {/* When centered, title block sits in the middle and chevron
            absolutely-positions to the right. When left-aligned, chevron
            shares the row at the right end. */}
        {isCenter ? (
          <>
            <span className="flex-1" />
            <span className={`text-gold font-serif flex items-center gap-2 ${isLg ? 'text-base sm:text-lg' : ''}`}>
              {icon != null && <span aria-hidden>{icon}</span>}
              <span>{title}</span>
            </span>
            {trailing != null && <span className="flex-shrink-0">{trailing}</span>}
            <span className="flex-1 flex justify-end">
              <span
                className="text-white/40 transition-transform"
                style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden
              >
                ▼
              </span>
            </span>
          </>
        ) : (
          <>
            <span className={`text-gold font-serif flex items-center gap-2 flex-1 min-w-0 ${isLg ? 'text-base sm:text-lg' : ''}`}>
              {icon != null && <span aria-hidden>{icon}</span>}
              <span className="truncate">{title}</span>
            </span>
            {trailing != null && <span className="flex-shrink-0">{trailing}</span>}
            <span
              className="text-white/40 flex-shrink-0 transition-transform"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden
            >
              ▼
            </span>
          </>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-gold/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
