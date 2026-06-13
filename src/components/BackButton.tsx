'use client'

import { useRouter } from 'next/navigation'
import { useLang } from './LanguageContext'

interface BackButtonProps {
  /**
   * Custom handler. When provided it fully replaces navigation — used where
   * "back" means an in-page state change (e.g. resetting the divination form)
   * rather than a route change.
   */
  onClick?: () => void
  /**
   * Where to go. If omitted, falls back to browser history (router.back()),
   * and to `fallbackHref` when there is no history to go back to.
   */
  href?: string
  /** Used only when `href` is omitted and history navigation isn't possible. */
  fallbackHref?: string
  /** Override the default localized "Back" label. */
  label?: string
  /**
   * Pin to the top-left corner of the viewport instead of rendering inline.
   * Useful on pages that don't already have a top-left slot for it.
   */
  fixed?: boolean
  className?: string
}

/**
 * Universal back button. Drop it at the top-left of any page that needs a
 * "go back" affordance. By default it navigates through browser history;
 * pass `href` to force a specific destination.
 */
export default function BackButton({ onClick, href, fallbackHref = '/', label, fixed = false, className = '' }: BackButtonProps) {
  const router = useRouter()
  const { lang } = useLang()

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    if (href) {
      router.push(href)
      return
    }
    // Prefer real history; fall back to a safe destination on a fresh load
    // (e.g. the page was opened directly via a shared link or new tab).
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  const text = label ?? (lang === 'en' ? 'Back' : '返回')

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={text}
      className={`inline-flex items-center gap-1 text-sm transition-colors hover:text-gold ${fixed ? 'fixed top-20 left-3 sm:left-4 z-40' : ''} ${className}`}
      style={{ color: 'var(--text-muted)' }}
    >
      <span aria-hidden>←</span>
      <span>{text}</span>
    </button>
  )
}
