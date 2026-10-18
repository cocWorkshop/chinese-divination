'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { isNativeApp, hideSplash, registerPushNotifications } from '@/lib/native'
import { closeTopmostOverlay } from '@/lib/overlayStack'

/**
 * Initializes native app features on mount.
 * Place in root layout — no-op on web.
 */
export default function NativeInitializer() {
  const { data: session } = useSession()

  // Hide splash screen after page loads
  useEffect(() => {
    if (isNativeApp()) {
      // Small delay to ensure UI is painted
      setTimeout(() => hideSplash(), 300)
    }
  }, [])

  // Android hardware back: dismiss the topmost overlay first (expanded
  // master chat, poster modal, dialogs — anything registered on the overlay
  // stack), then fall through to web history, then exit the app at the root.
  // Without this the back gesture inside overlays navigates WebView history
  // instead of closing them (store-review rejection trigger; AUD-12).
  useEffect(() => {
    if (!isNativeApp()) return
    let cleanup: (() => void) | undefined
    let disposed = false
    void (async () => {
      try {
        const { App } = await import('@capacitor/app')
        const listener = await App.addListener('backButton', () => {
          if (closeTopmostOverlay()) return
          const state = window.history.state as { idx?: number } | null
          if (typeof state?.idx === 'number' && state.idx > 0) {
            window.history.back()
          } else {
            void App.exitApp()
          }
        })
        if (disposed) {
          void listener.remove()
          return
        }
        cleanup = () => void listener.remove()
      } catch {
        // Plugin unavailable (e.g. web build) — no-op
      }
    })()
    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  // Register push notifications when user is logged in
  useEffect(() => {
    if (!isNativeApp() || !session?.user?.id) return

    registerPushNotifications().then(async (token) => {
      if (!token) return
      // Send device token to backend
      try {
        await fetch('/api/notifications/register-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform: getPlatform() }),
        })
      } catch {
        // Non-critical — will retry on next launch
      }
    })
  }, [session?.user?.id])

  return null
}

function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor as Record<string, unknown> | undefined
  const platform = cap?.getPlatform as (() => string) | undefined
  if (platform) {
    const p = platform()
    if (p === 'ios') return 'ios'
    if (p === 'android') return 'android'
  }
  return 'web'
}
