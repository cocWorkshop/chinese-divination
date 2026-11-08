'use client'

import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'

export default function Footer() {
  const { lang } = useLang()
  const pathname = usePathname()

  // On /divination, MasterEntryCard is fixed to the bottom of the viewport; suppress Footer to prevent unwanted scrollbars
  if (pathname === '/divination') return null

  return (
    <footer className="py-6 text-center text-xs border-t border-gold/10" style={{ color: 'var(--text-muted)' }}>
      <div className="flex items-center justify-center gap-2 mb-2 font-serif text-[11px] tracking-widest text-gold/70">
        <span>✧</span>
        <span>{T(lang, '古法智慧 · 當代精算', 'Ancient Wisdom, Contemporary Calculation')}</span>
        <span>✧</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <a href="/privacy" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>
          {T(lang, '隱私政策', 'Privacy Policy')}
        </a>
        <span className="opacity-40">·</span>
        <a href="/terms" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>
          {T(lang, '用戶協議', 'Terms of Service')}
        </a>
        <span className="opacity-40">·</span>
        <span>© {new Date().getFullYear()} {T(lang, '玄機 XuanJi', 'XuanJi')}</span>
      </div>
    </footer>
  )
}
