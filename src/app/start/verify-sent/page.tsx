'use client'

/**
 * View 5b — post-/api/start/complete splash.
 *
 * The funnel completed: tentative→real user, password set, signup-bonus
 * Karma granted, verification email sent. But emailVerified=false until
 * the user clicks the link, so they CAN'T log in yet. This page is the
 * honest "check your email" wall.
 *
 * Receives email + readingId via URL params (passed by View 5 on success).
 * The email is shown so the user knows where to look. The resend button
 * uses the existing /api/resend-verification endpoint (no auth needed).
 */

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MasterSageIcon, CheckSealIcon } from '@/components/DivinationIcons'

function VerifySentContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [resendError, setResendError] = useState<string | null>(null)

  const onResend = async () => {
    if (!email || resendState === 'sending') return
    setResendState('sending')
    setResendError(null)
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '發送失敗，請稍後再試')
      }
      setResendState('sent')
    } catch (e) {
      setResendState('error')
      setResendError(e instanceof Error ? e.message : '發送失敗')
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center oriental-sanctuary-card rounded-2xl p-7 sm:p-9 shadow-2xl"
      >
        {/* Breathing sage icon — gentle scale loop signals "waiting on you" */}
        <div
          className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 text-gold shadow-lg shadow-gold/5"
          style={{ animation: 'xjScrollBreathe 3.6s ease-in-out infinite' }}
        >
          <MasterSageIcon className="w-8 h-8 text-gold" />
        </div>
        <h2 className="font-serif text-xl sm:text-2xl mb-2 text-gold">
          已發出驗證信
        </h2>
        <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>
          您的帳號已建立，最後一步：請查收信箱。
        </p>
        {email && (
          <p className="font-mono text-xs mt-3 mb-1 px-3 py-1.5 rounded inline-block bg-surface/60 border border-gold/20 text-gold-light/90">
            {email}
          </p>
        )}
        <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          點擊信件中的「驗證」連結即可登入，
          <br />命盤與玄機大師對話皆已為您保留。
        </p>

        <div className="my-6 h-px bg-gold/15" />

        {/* Resend block */}
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            沒收到？檢查垃圾郵件，或：
          </p>
          {resendState === 'sent' ? (
            <p className="text-sm text-gold inline-flex items-center gap-1.5">
              <CheckSealIcon className="w-4 h-4 text-gold" />
              <span>已重新發送</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resendState === 'sending' || !email}
              className="text-sm px-4 py-2 min-h-[44px] rounded-lg transition-colors disabled:opacity-50 border border-gold/30 text-gold hover:bg-gold/10 inline-flex items-center justify-center"
            >
              {resendState === 'sending' ? '發送中…' : '重新發送驗證信'}
            </button>
          )}
          {resendError && (
            <p className="text-xs text-red-400 mt-2">{resendError}</p>
          )}
        </div>

        <div className="mt-7 pt-5" style={{ borderTop: '1px solid var(--card-border)' }}>
          <Link
            href="/login"
            className="text-sm font-medium"
            style={{ color: 'var(--gold)' }}
          >
            驗證後請至此登入 →
          </Link>
        </div>
      </motion.div>
      <style jsx global>{`
        @keyframes xjScrollBreathe {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default function StartVerifySentPage() {
  return (
    <Suspense fallback={null}>
      <VerifySentContent />
    </Suspense>
  )
}
