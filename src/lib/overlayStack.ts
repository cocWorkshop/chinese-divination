'use client'

/**
 * Global overlay registry (LIFO stack).
 *
 * Powers two behaviors that need to know "what overlays are open right now":
 * 1. Android hardware back (NativeInitializer) — dismiss the topmost overlay
 *    before falling through to history navigation / app exit.
 * 2. Web popstate — an overlay pushes a history sentinel on open so the
 *    browser back button closes it instead of navigating away.
 *
 * Overlays register via ModalShell automatically; fullscreen overlays that
 * don't use ModalShell (e.g. the expanded master chat) register manually.
 */

interface OverlayEntry {
  id: string
  close: () => void
}

const stack: OverlayEntry[] = []

/** Register an open overlay. Returns an unregister function. */
export function registerOverlay(id: string, close: () => void): () => void {
  const entry = { id, close }
  stack.push(entry)
  return () => {
    const i = stack.lastIndexOf(entry)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** Close the topmost overlay. Returns false when none is open. */
export function closeTopmostOverlay(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.close()
  return true
}

/** How many overlays are currently open. */
export function overlayCount(): number {
  return stack.length
}
