'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'

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
      toast.error(lang === 'zh-TW' ? '發送失敗，請稍後再試' : 'Failed to send, please try again')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
            {lang === 'zh-TW' ? '郵件已發送' : 'Email Sent'}
          </h1>
          <p className="text-white/60 text-sm mb-4">
            {lang === 'zh-TW'
              ? `如果 ${email} 對應的帳號存在，您將收到密碼重置郵件。`
              : `If an account exists for ${email}, you will receive a reset email.`}
          </p>
          <div className="py-3 px-4 rounded-lg bg-yellow-500/5 border border-yellow-500/15 mb-6">
            <p className="text-yellow-300/70 text-xs">
              ⚠️ {lang === 'zh-TW' ? '如果沒有看到郵件，請檢查垃圾郵件資料夾。連結 1 小時內有效。' : 'Check your spam folder if you don\'t see it. Link expires in 1 hour.'}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors"
          >
            {lang === 'zh-TW' ? '🔑 返回登入' : '🔑 Back to Login'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-serif mb-2" style={{ color: 'var(--gold)' }}>玄機</div>
          <h1 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {lang === 'zh-TW' ? '忘記密碼' : 'Forgot Password'}
          </h1>
          <p className="text-white/50 text-sm mt-2">
            {lang === 'zh-TW' ? '輸入您的註冊郵箱，我們將發送重置連結。' : 'Enter your email and we\'ll send a reset link.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">
              {lang === 'zh-TW' ? '郵箱' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-navy-950 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading
              ? (lang === 'zh-TW' ? '發送中...' : 'Sending...')
              : (lang === 'zh-TW' ? '📧 發送重置郵件' : '📧 Send Reset Email')}
          </button>
        </form>

        <p className="text-center text-white/50 mt-6 text-sm">
          <Link href="/login" className="text-gold hover:text-gold-light">
            {lang === 'zh-TW' ? '← 返回登入' : '← Back to Login'}
          </Link>
        </p>
      </div>
    </div>
  )
}
