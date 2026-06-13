'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from './LanguageContext'
import { T } from '@/lib/i18n'

const DISMISS_KEY = 'pwa-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const { lang } = useLang()
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<'android' | 'ios' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).standalone) return
    // Don't show if dismissed
    if (localStorage.getItem(DISMISS_KEY)) return

    // Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setMode('android')
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: detect Safari on iOS
    const ua = navigator.userAgent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
    if (isSafari) {
      setMode('ios')
      setTimeout(() => setShow(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, 'true')
  }, [])

  // Register SW
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <AnimatePresence>
      {show && mode && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-50"
        >
          <div
            className="glass-card rounded-2xl p-4 flex items-start gap-3 shadow-2xl"
            style={{ borderColor: 'var(--border-gold)', borderWidth: '1px', backgroundColor: 'var(--bg-secondary, #1a1a2e)' }}
          >
            {/* App icon */}
            <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #d4a853, #b8860b)' }}>
              ☯
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--gold)' }}>
                {T(lang, '添加玄機到主畫面', 'Add Xuanji to Home Screen')}
              </p>
              {mode === 'android' ? (
                <>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {T(lang, '一鍵安裝，像App一樣快速訪問', 'Install for quick access like a native app')}
                  </p>
                  <button
                    onClick={handleInstall}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
                  >
                    {T(lang, '立即安裝', 'Install Now')}
                  </button>
                </>
              ) : (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {T(lang,
                    '點擊底部 ⬆ 分享按鈕，然後選擇「加入主畫面」',
                    'Tap the ⬆ Share button below, then "Add to Home Screen"'
                  )}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
