'use client'

import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'

export default function Footer() {
  const { lang } = useLang()

  return (
    <footer className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
      <a href="/privacy" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
        {T(lang, '隱私政策', 'Privacy Policy')}
      </a>
      <span className="mx-2">·</span>
      <a href="/terms" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
        {T(lang, '用戶協議', 'Terms of Service')}
      </a>
      <span className="mx-2">·</span>
      <span>© {new Date().getFullYear()} {T(lang, '玄機', 'Chinese-divination')}</span>
    </footer>
  )
}
