'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/errorReporter'
import { useLang } from '@/components/LanguageContext'

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
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-serif text-gold mb-3">
          {isEn ? 'Something went wrong' : '出了點問題'}
        </h2>
        <p className="text-white/60 mb-6 text-sm">
          {isEn ? 'An error occurred while loading the page. Please try again later.' : '頁面載入時發生錯誤，請稍後重試。'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-gold text-navy-950 rounded-lg font-medium hover:bg-gold-light transition-colors"
        >
          {isEn ? 'Reload' : '重新載入'}
        </button>
      </div>
    </div>
  )
}
