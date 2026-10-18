'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/errorReporter'
import { useLang } from '@/components/LanguageContext'
import { AlertIcon, RefreshIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { lang } = useLang()
  const isEn = lang === 'en'

  useEffect(() => {
    reportError({ endpoint: typeof window !== 'undefined' ? window.location.pathname : 'unknown', error: error.message || 'Unknown error', context: error.digest })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="oriental-sanctuary-card rounded-2xl p-8 sm:p-10 max-w-md w-full text-center border border-gold/30">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <AlertIcon size={28} />
        </div>
        <h2 className="text-2xl font-serif text-gold mb-3">
          {T(lang, '出了點問題', 'Something went wrong')}
        </h2>
        <p className="text-foreground/60 mb-6 text-sm leading-relaxed">
          {T(lang, '頁面載入時發生錯誤，請稍後重試。', 'An error occurred while loading the page. Please try again later.')}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-gold hover:bg-gold-light text-navy-950 rounded-lg font-serif font-semibold transition-colors shadow-md"
        >
          <RefreshIcon size={16} />
          <span>{T(lang, '重新載入', 'Reload')}</span>
        </button>
      </div>
    </div>
  )
}
