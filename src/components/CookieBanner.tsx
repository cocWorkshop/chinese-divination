'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'
import { ScrollIcon } from '@/components/DivinationIcons'

export default function CookieBanner() {
  const { lang } = useLang()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-3xl mx-auto card-quiet rounded-xl p-4 border flex flex-col sm:flex-row items-center gap-3"
        style={{ borderColor: 'var(--card-border)' }}>
        <p className="text-xs flex-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <ScrollIcon size={15} className="text-gold flex-shrink-0" />
          <span>
            {T(lang,
              '本網站僅使用必要的身份驗證 Cookie。繼續使用即表示您同意我們的',
              'This site uses essential authentication cookies only. By continuing, you agree to our'
            )}{' '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--gold)' }}>
              {T(lang, '隱私政策', 'Privacy Policy')}
            </Link>。
          </span>
        </p>
        <button
          onClick={() => { localStorage.setItem('cookie-consent', 'true'); setShow(false) }}
          className="px-5 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors"
          style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
        >
          {T(lang, '接受', 'Accept')}
        </button>
      </div>
    </div>
  )
}
