'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import { AlertIcon, SunMoonIcon, LockSealIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const { lang } = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      toast.error(T(lang, '發送失敗，請稍後再試', 'Failed to send, please try again'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 w-full max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 text-gold shadow-lg shadow-gold/5">
            <SunMoonIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif mb-2 text-gold">
            {T(lang, '郵件已發送', 'Email Sent')}
          </h1>
          <p className="text-foreground/60 text-sm mb-4 leading-relaxed">
            {T(
              lang,
              `如果 ${email} 對應的帳號存在，您將收到密碼重置郵件。`,
              `If an account exists for ${email}, you will receive a reset email.`
            )}
          </p>
          <div className="py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-6 flex items-start gap-2 text-left">
            <AlertIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              {T(lang, '如果沒有看到郵件，請檢查垃圾郵件資料夾。連結 1 小時內有效。', 'Check your spam folder if you don\'t see it. Link expires in 1 hour.')}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-gold text-navy-950 rounded-xl font-serif font-bold hover:bg-gold-light transition-colors shadow-md shadow-gold/10 text-sm"
          >
            {T(lang, '返回登入', 'Back to Login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3 text-gold">
            <LockSealIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif text-gold">
            {T(lang, '忘記密碼', 'Forgot Password')}
          </h1>
          <p className="text-foreground/60 text-sm mt-2 font-serif">
            {T(lang, '輸入您的註冊郵箱，我們將發送重置連結。', 'Enter your email and we\'ll send a reset link.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-foreground/70 text-sm mb-1">
              {T(lang, '郵箱', 'Email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 min-h-[44px] bg-gradient-to-r from-gold via-gold-light to-gold text-navy-950 rounded-xl font-serif font-bold text-base hover:brightness-105 active:scale-[0.99] transition-all shadow-md shadow-gold/15 disabled:opacity-50"
          >
            {loading
              ? (T(lang, '發送中...', 'Sending...'))
              : (T(lang, '發送重置郵件', 'Send Reset Email'))}
          </button>
        </form>

        <p className="text-center text-foreground/50 mt-6 text-sm">
          <Link href="/login" className="text-gold hover:text-gold-light font-serif">
            {T(lang, '← 返回登入', '← Back to Login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
