'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/errorReporter'

export default function DivinationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError({ endpoint: typeof window !== 'undefined' ? window.location.pathname : 'unknown', error: error.message || 'Unknown error', context: error.digest })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🔮</div>
        <h2 className="text-2xl font-serif text-gold mb-3">占卜服務暫時不可用</h2>
        <p className="text-white/60 mb-6 text-sm">
          請稍後再試，或返回首頁重新開始。
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-gold text-navy-950 rounded-lg font-medium hover:bg-gold-light transition-colors"
          >
            重試
          </button>
          <a
            href="/"
            className="px-6 py-2 border border-gold/50 text-gold rounded-lg hover:border-gold hover:bg-gold/10 transition-colors"
          >
            返回首頁
          </a>
        </div>
      </div>
    </div>
  )
}
