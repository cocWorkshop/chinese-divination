'use client'

/**
 * MasterChatWidget — global two-shape Xuanji Master chat.
 *
 *   Shape 1 (collapsed):  thin bar pinned to the bottom of every page with
 *                         just an input + send button. Tapping it expands.
 *                         Shows a "waiting for your reading..." status when
 *                         a pendingReading is active.
 *
 *   Shape 2 (expanded):   fullscreen overlay (z-50) with transcript, input,
 *                         and a collapse button.
 *
 * This file is the thin shell: it picks the shape, owns the cross-shape
 * memory-gate state, and renders the gate modal as an overlay above either
 * shape. Per-shape concerns live in widget/CollapsedBar.tsx and
 * widget/ExpandedView.tsx; bubble rendering and the modals are their own
 * files.
 *
 * Driven entirely by MasterChatContext. Not mounted for anonymous users
 * (the provider's `enabled` flag gates the render).
 */

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useMasterChat } from './MasterChatContext'
import { useLang } from '@/components/LanguageContext'
import CollapsedBar, { type GateIntent } from './widget/CollapsedBar'
import MasterFab from './widget/MasterFab'
import ExpandedView from './widget/ExpandedView'
import MemoryGateModal from './widget/MemoryGateModal'

export default function MasterChatWidget() {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const {
    enabled,
    shape,
    setShape,
    pendingReading,
    disclosureSeen,
    portraitEnabled,
    sendMessage,
    markDisclosureSeen,
    setPortraitEnabled,
  } = useMasterChat()

  // Memory-gate state: the Master widget requires memory to be enabled. Any
  // attempt to open/send while memory is off (or the disclosure hasn't been
  // seen) pops this gate. `gateIntent` captures what the user was trying to
  // do so the Enable branch can resume it (expand the widget, or send a
  // pending message).
  const needsMemoryGate = !portraitEnabled || !disclosureSeen
  const [gateIntent, setGateIntent] = useState<GateIntent | null>(null)
  const gateVisible = needsMemoryGate && gateIntent !== null

  // Hide the widget entirely on auth pages — the collapsed bar's input field
  // creates false affordance on pages whose single job is "log in".
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  if (!enabled || isAuthPage) return null

  const resolveGate = async (action: 'enable' | 'decline') => {
    const intent = gateIntent
    if (action === 'enable') {
      await setPortraitEnabled(true)
      await markDisclosureSeen()
      setGateIntent(null)
      if (intent?.kind === 'open') {
        setShape('expanded')
      } else if (intent?.kind === 'send') {
        setShape('expanded')
        sendMessage(intent.message)
      }
    } else {
      await setPortraitEnabled(false)
      await markDisclosureSeen()
      setGateIntent(null)
      // Collapse so the UI reflects the gated state — the expanded chat is
      // unusable while memory is off.
      setShape('collapsed')
    }
  }

  return (
    <>
      {shape === 'collapsed' ? (
        // Default collapsed entry is a compact bottom-right FAB. The
        // informative full-width bar is reserved for the active-reading
        // handoff (pendingReading), where its return-to-form text matters.
        pendingReading ? (
          <CollapsedBar needsMemoryGate={needsMemoryGate} onRequestGate={setGateIntent} />
        ) : (
          <MasterFab needsMemoryGate={needsMemoryGate} onRequestGate={setGateIntent} />
        )
      ) : (
        <ExpandedView needsMemoryGate={needsMemoryGate} onRequestGate={setGateIntent} />
      )}
      <MemoryGateModal
        visible={gateVisible}
        isEn={isEn}
        onResolve={(action) => { void resolveGate(action) }}
      />
    </>
  )
}
