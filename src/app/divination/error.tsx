'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/errorReporter'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'

export default function DivinationError({
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
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card-quiet rounded-2xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4 font-serif text-vermillion">卦</div>
        <h2 className="text-2xl font-serif text-gold mb-3">
          {T(lang, '占卜服務暫時不可用', 'Divination service temporarily unavailable')}
        </h2>
        <p className="text-foreground/60 mb-6 text-sm">
          {T(lang, '請稍後再試，或返回首頁重新開始。', 'Please try again later, or return to the home page to start over.')}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-gold text-navy-950 rounded-lg font-medium hover:bg-gold-light transition-colors"
          >
            {T(lang, '重試', 'Retry')}
          </button>
          <a
            href="/"
            className="px-6 py-2 border border-gold/50 text-gold rounded-lg hover:border-gold hover:bg-gold/10 transition-colors"
          >
            {T(lang, '返回首頁', 'Back to Home')}
          </a>
        </div>
      </div>
    </div>
  )
}
