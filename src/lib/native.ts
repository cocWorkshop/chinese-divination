/**
 * Native app utilities — Capacitor bridge helpers
 * Only loads Capacitor APIs when running inside the native app shell.
 */

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor
}

/**
 * Trigger haptic feedback (light impact)
 * Uses Capacitor Haptics in native app, with Web Vibration API fallback on supported mobile browsers.
 */
export async function hapticLight() {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Light })
      return
    } catch { /* fallback to web */ }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(12) } catch {}
  }
}

/**
 * Trigger haptic feedback (medium impact) — for divination results
 */
export async function hapticMedium() {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Medium })
      return
    } catch { /* fallback to web */ }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(28) } catch {}
  }
}

/**
 * Trigger haptic feedback (heavy impact) — for coin tossing & dice rolling
 */
export async function hapticHeavy() {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Heavy })
      return
    } catch { /* fallback to web */ }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate([40, 30, 25]) } catch {}
  }
}

export const haptics = {
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  diceToss: hapticHeavy,
}

/**
 * Native share — falls back to web clipboard copy
 */
export async function nativeShare(opts: { title: string; text: string; url: string }) {
  if (!isNativeApp()) return false
  const { Share } = await import('@capacitor/share')
  await Share.share(opts)
  return true
}

/**
 * Hide splash screen — call after page is loaded
 */
export async function hideSplash() {
  if (!isNativeApp()) return
  const { SplashScreen } = await import('@capacitor/splash-screen')
  await SplashScreen.hide()
}

/**
 * Register for push notifications and return the device token
 */
export async function registerPushNotifications(): Promise<string | null> {
  if (!isNativeApp()) return null
  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return null

  await PushNotifications.register()

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      resolve(token.value)
    })
    PushNotifications.addListener('registrationError', () => {
      resolve(null)
    })
    // Timeout after 10s
    setTimeout(() => resolve(null), 10000)
  })
}

/**
 * Biometric authentication
 */
export async function biometricLogin(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric')
    const result = await NativeBiometric.isAvailable()
    if (!result.isAvailable) return false
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock Chinese Divination',
      title: 'Authentication',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Save credentials to biometric secure storage
 */
export async function saveCredentials(server: string, username: string, password: string) {
  if (!isNativeApp()) return
  const { NativeBiometric } = await import('capacitor-native-biometric')
  await NativeBiometric.setCredentials({ server, username, password })
}

/**
 * Get saved credentials from biometric secure storage
 */
export async function getCredentials(server: string) {
  if (!isNativeApp()) return null
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric')
    return await NativeBiometric.getCredentials({ server })
  } catch {
    return null
  }
}
