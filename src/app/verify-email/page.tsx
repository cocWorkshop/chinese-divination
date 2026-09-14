'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import MysticalLoader from '@/components/MysticalLoader'
import { CheckSealIcon, CloseIcon, SunMoonIcon, LockSealIcon, NoticeIcon } from '@/components/DivinationIcons'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'verified' | 'already_verified' | 'expired' | 'invalid'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    fetch(`/api/verify-email?token=${token}`)
      .then(async r => {
        const data = await r.json()
        if (r.ok) {
          setStatus(data.status === 'already_verified' ? 'already_verified' : 'verified')
        } else {
          setStatus(data.error === 'expired' ? 'expired' : 'invalid')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  const content = {
    loading: { title: '驗證中...', titleEn: 'Verifying...', desc: '請稍候', descEn: 'Please wait' },
    verified: { title: '驗證成功！', titleEn: 'Email Verified!', desc: '您的郵件已驗證成功，現在可以登入了。', descEn: 'Your email has been verified. You can now log in.' },
    already_verified: { title: '已驗證', titleEn: 'Already Verified', desc: '此郵件已經驗證過了。', descEn: 'This email is already verified.' },
    expired: { title: '連結已過期', titleEn: 'Link Expired', desc: '驗證連結已過期，請重新發送驗證郵件。', descEn: 'The verification link has expired. Please request a new one.' },
    invalid: { title: '無效連結', titleEn: 'Invalid Link', desc: '此驗證連結無效或已失效。', descEn: 'This verification link is invalid.' },
  }

  const c = content[status]

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full">
        <div className="oriental-sanctuary-card rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden border border-gold/30 shadow-2xl">
          {status === 'loading' && (
            <div className="py-6">
              <MysticalLoader size="md" message="正在驗證郵箱 / Verifying..." />
            </div>
          )}

          {status !== 'loading' && (
            <>
              {/* Icon */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border">
                {(status === 'verified' || status === 'already_verified') && (
                  <div className="w-full h-full rounded-full bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <CheckSealIcon size={36} />
                  </div>
                )}
                {status === 'expired' && (
                  <div className="w-full h-full rounded-full bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <SunMoonIcon size={32} />
                  </div>
                )}
                {status === 'invalid' && (
                  <div className="w-full h-full rounded-full bg-red-500/10 border-red-500/30 text-red-400 flex items-center justify-center">
                    <CloseIcon size={32} />
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-serif text-gold mb-1">{c.title}</h1>
              <p className="text-white/50 text-xs mb-1 font-serif">{c.titleEn}</p>
              
              <div className="my-5 h-px bg-gold/20" />
              
              <p className="text-white/70 text-sm mb-1 font-serif">{c.desc}</p>
              <p className="text-white/40 text-xs mb-6 font-serif">{c.descEn}</p>

              {(status === 'verified' || status === 'already_verified') && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto flex-1 min-h-[44px] px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-serif font-bold hover:bg-gold-light transition-colors shadow-md inline-flex items-center justify-center gap-2"
                  >
                    <LockSealIcon size={16} />
                    <span>登入 / Login</span>
                  </Link>
                  <Link
                    href="/"
                    className="w-full sm:w-auto flex-1 min-h-[44px] px-5 py-2.5 border border-white/10 text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-colors font-serif inline-flex items-center justify-center"
                  >
                    首頁 / Home
                  </Link>
                </div>
              )}

              {status === 'expired' && (
                <div className="space-y-4">
                  <ResendButton />
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                      href="/login"
                      className="w-full sm:w-auto flex-1 min-h-[44px] px-5 py-2.5 border border-gold/30 text-gold hover:bg-gold/10 rounded-xl transition-colors font-serif inline-flex items-center justify-center gap-1.5 text-xs"
                    >
                      <LockSealIcon size={14} />
                      <span>前往登入 / Login</span>
                    </Link>
                    <Link
                      href="/"
                      className="w-full sm:w-auto flex-1 min-h-[44px] px-5 py-2.5 border border-white/10 text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-colors font-serif inline-flex items-center justify-center text-xs"
                    >
                      返回首頁 / Home
                    </Link>
                  </div>
                </div>
              )}

              {status === 'invalid' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto flex-1 min-h-[44px] px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-serif font-bold hover:bg-gold-light transition-colors shadow-md inline-flex items-center justify-center"
                  >
                    前往登入 / Login
                  </Link>
                  <Link
                    href="/"
                    className="w-full sm:w-auto flex-1 min-h-[44px] px-5 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors font-serif inline-flex items-center justify-center"
                  >
                    返回首頁 / Home
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResendButton() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const resend = async () => {
    if (!email) return
    setSending(true)
    try {
      await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-serif inline-flex items-center gap-1.5">
        <CheckSealIcon size={16} />
        <span>驗證郵件已重新發送 / Verification email resent</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="輸入您的郵箱 / Enter your email"
        className="w-full px-4 py-2.5 bg-navy-800/80 border border-gold/20 rounded-xl text-white text-sm focus:outline-none focus:border-gold/50 font-serif"
      />
      <button
        onClick={resend}
        disabled={sending || !email}
        className="w-full min-h-[44px] px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-serif font-bold hover:bg-gold-light transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-md"
      >
        <NoticeIcon size={16} />
        <span>{sending ? '發送中... / Sending...' : '重新發送驗證信 / Resend'}</span>
      </button>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center py-16">
        <MysticalLoader size="md" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
