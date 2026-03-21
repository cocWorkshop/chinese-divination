'use client'

import { useEffect, useState } from 'react'
import YinYangIcon from '@/components/YinYangIcon'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

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

  const content: Record<string, { icon: string; title: string; titleEn: string; desc: string; descEn: string }> = {
    loading: { icon: '⏳', title: '驗證中...', titleEn: 'Verifying...', desc: '請稍候', descEn: 'Please wait' },
    verified: { icon: '✅', title: '驗證成功！', titleEn: 'Email Verified!', desc: '您的郵件已驗證成功，現在可以登入了。', descEn: 'Your email has been verified. You can now log in.' },
    already_verified: { icon: '✅', title: '已驗證', titleEn: 'Already Verified', desc: '此郵件已經驗證過了。', descEn: 'This email is already verified.' },
    expired: { icon: '⏰', title: '連結已過期', titleEn: 'Link Expired', desc: '驗證連結已過期，請重新發送驗證郵件。', descEn: 'The verification link has expired. Please request a new one.' },
    invalid: { icon: '❌', title: '無效連結', titleEn: 'Invalid Link', desc: '此驗證連結無效。', descEn: 'This verification link is invalid.' },
  }

  const c = content[status]

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl border-2 border-gold/30 pointer-events-none" />

          <div className="text-5xl mb-4">{c.icon}</div>
          <h1 className="text-2xl font-serif text-gold mb-2">{c.title}</h1>
          <p className="text-white/50 text-sm mb-1">{c.titleEn}</p>
          
          <div className="my-6 h-px bg-gold/20" />
          
          <p className="text-white/70 text-sm mb-2">{c.desc}</p>
          <p className="text-white/40 text-xs mb-6">{c.descEn}</p>

          {(status === 'verified' || status === 'already_verified') && (
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors"
            >
              🔑 登入 / Login
            </Link>
          )}

          {status === 'expired' && (
            <ResendButton />
          )}

          {status === 'invalid' && (
            <Link
              href="/"
              className="inline-block px-6 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors"
            >
              返回首頁 / Home
            </Link>
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
      <p className="text-jade text-sm">✉ 驗證郵件已重新發送 / Verification email resent</p>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="輸入您的郵箱 / Enter your email"
        className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
      />
      <button
        onClick={resend}
        disabled={sending || !email}
        className="px-6 py-2 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        {sending ? '發送中...' : '📧 重新發送 / Resend'}
      </button>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse"><YinYangIcon size={30} /></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
