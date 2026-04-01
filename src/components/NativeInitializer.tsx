'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { isNativeApp, hideSplash, registerPushNotifications } from '@/lib/native'

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
