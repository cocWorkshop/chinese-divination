'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

export default function ConsentPopup() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const pathname = usePathname()
  const [needsConsent, setNeedsConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Don't show on privacy/terms pages so user can read them
  const isLegalPage = pathname === '/privacy' || pathname === '/terms'
  const show = needsConsent && !isLegalPage

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/consent')
      .then(r => r.json())
      .then(d => { if (d.needsConsent) setNeedsConsent(true) })
      .catch(() => {})
  }, [session])

  const handleAgree = async () => {
    setLoading(true)
    await fetch('/api/consent', { method: 'POST' })
    setNeedsConsent(false)
    setLoading(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-card rounded-2xl p-6 md:p-8 max-w-lg w-full border" style={{ borderColor: 'var(--card-border)' }}>
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">📜</div>
          <h2 className="text-xl font-serif" style={{ color: 'var(--gold)' }}>
            {T(lang, '政策更新通知', 'Policy Update Notice')}
          </h2>
        </div>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
          {T(lang,
            '我們更新了隱私政策和用戶協議，請閱讀並同意以繼續使用本服務。',
            'We have updated our Privacy Policy and Terms of Service. Please review and agree to continue using our service.'
          )}
        </p>
        <div className="flex justify-center gap-4 mb-6">
          <Link href="/privacy"
            className="px-4 py-2 rounded-lg text-sm underline" style={{ color: 'var(--gold)' }}>
            {T(lang, '隱私政策', 'Privacy Policy')}
          </Link>
          <Link href="/terms"
            className="px-4 py-2 rounded-lg text-sm underline" style={{ color: 'var(--gold)' }}>
            {T(lang, '用戶協議', 'Terms of Service')}
          </Link>
        </div>
        <button
          onClick={handleAgree}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
        >
          {loading
            ? '...'
            : T(lang, '我已閱讀並同意', 'I have read and agree')
          }
        </button>
      </div>
    </div>
  )
}
