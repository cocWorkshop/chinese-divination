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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'radial-gradient(ellipse at 50% 30%, #151d30 0%, #080c16 100%)' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', padding: '2.5rem 2rem', background: 'linear-gradient(180deg, rgba(16, 24, 40, 0.9) 0%, rgba(10, 15, 26, 0.95) 100%)', border: '1px solid rgba(212, 168, 83, 0.3)', borderRadius: '1.25rem', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(212, 168, 83, 0.12)', border: '1px solid rgba(212, 168, 83, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#d4a853' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#d4a853', marginBottom: '0.75rem', fontFamily: 'serif', letterSpacing: '0.05em' }}>出了點問題</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '1.75rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
              頁面載入時發生異常，請重試或返回首頁。
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{ minHeight: '44px', padding: '0.625rem 1.75rem', backgroundColor: '#d4a853', color: '#0a0e1a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                重新載入
              </button>
              <a
                href="/"
                style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', padding: '0.625rem 1.75rem', backgroundColor: 'rgba(255,255,255,0.06)', color: '#d4a853', border: '1px solid rgba(212, 168, 83, 0.3)', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}
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
