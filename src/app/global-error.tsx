'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to backend — can't use errorReporter here since it may not be loaded
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: typeof window !== 'undefined' ? window.location.pathname : 'global',
          error: error.message || 'Unknown global error',
          context: `global-error|${error.digest || ''}|${error.stack?.slice(0, 500) || ''}`,
        }),
      }).catch(() => {})
    } catch { /* never throw in error boundary */ }
  }, [error])

  return (
    <html>
      <body style={{ backgroundColor: '#0a0e1a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.5rem', color: '#d4a855', marginBottom: '0.75rem' }}>出了點問題</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              頁面載入時發生異常，請重試或返回首頁。
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#d4a855', color: '#0a0e1a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
              >
                重新載入
              </button>
              <a
                href="/"
                style={{ padding: '0.5rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500 }}
              >
                返回首頁
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
