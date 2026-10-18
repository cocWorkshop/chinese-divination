'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { registerOverlay } from '@/lib/overlayStack'

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  /** Accessible name announced by screen readers (localized). */
  label: string
  children: ReactNode
  /** Extra classes on the scrollable backdrop layer (layout tweaks). */
  overlayClassName?: string
  /** Click on the backdrop area closes the modal (default: off — poster
   *  generation etc. are easy to lose to an accidental tap). */
  dismissOnBackdrop?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * ModalShell — the ONE sanctioned modal primitive (ui-restyle-2026-10
 * AUD-11 / UX-4 / UX-10).
 *
 * Provides everything every overlay needs so consumers stop hand-rolling it:
 *  - role="dialog" + aria-modal + localized aria-label
 *  - Escape closes
 *  - focus trap while open + focus restored to the trigger on close
 *  - global overlayStack registration (Android hardware-back + popstate)
 *  - history sentinel so the browser back button dismisses instead of
 *    navigating away
 *  - theme-aware scrim via the bg-scrim token (玄夜/宣紙 both covered)
 *
 * Consumers keep their own inner card layout (sanctuary / mystic classes).
 */
export default function ModalShell({
  isOpen,
  onClose,
  label,
  children,
  overlayClassName = '',
  dismissOnBackdrop = false,
}: ModalShellProps) {
  const shellId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    // Remember the trigger so focus returns there on close.
    restoreFocusRef.current = document.activeElement as HTMLElement | null

    // History sentinel: browser/Android "back" dismisses the overlay
    // instead of leaving the page.
    window.history.pushState({ __xjOverlay: shellId }, '')
    const onPopState = () => {
      // popstate fired while we are (still) the topmost overlay → close.
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPopState)

    // Global registry for the native hardware-back handler.
    const unregister = registerOverlay(shellId, () => onCloseRef.current())

    // Focus the dialog; trap Tab cycles inside it.
    const dialog = dialogRef.current
    dialog?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('popstate', onPopState)
      unregister()
      // Consume our own sentinel if it is still the current history entry
      // (i.e. the modal closed via button/Escape rather than back).
      if ((window.history.state as { __xjOverlay?: string } | null)?.__xjOverlay === shellId) {
        window.history.back()
      }
      restoreFocusRef.current?.focus?.()
    }
  }, [isOpen, shellId])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim backdrop-blur-sm overflow-y-auto ${overlayClassName}`}
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="outline-none w-full flex items-center justify-center"
      >
        {children}
      </div>
    </div>
  )
}
