'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'

function validatePassword(pwd: string, lang: string): string | null {
  if (pwd.length < 8) return lang === 'zh-TW' ? '密碼至少需要 8 個字符' : 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(pwd)) return lang === 'zh-TW' ? '密碼需包含至少一個大寫字母' : 'Must contain an uppercase letter'
  if (!/[a-z]/.test(pwd)) return lang === 'zh-TW' ? '密碼需包含至少一個小寫字母' : 'Must contain a lowercase letter'
  if (!/[0-9]/.test(pwd)) return lang === 'zh-TW' ? '密碼需包含至少一個數字' : 'Must contain a number'
  return null
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gold text-3xl animate-pulse">☯</div></div>}><ResetInner /></Suspense>
}

function ResetInner() {
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'form' | 'success' | 'expired' | 'invalid'>('form')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
            {lang === 'zh-TW' ? '無效連結' : 'Invalid Link'}
          </h1>
          <Link href="/forgot-password" className="text-gold text-sm hover:text-gold-light">
            {lang === 'zh-TW' ? '重新申請密碼重置' : 'Request a new reset link'}
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error(lang === 'zh-TW' ? '兩次密碼不一致' : 'Passwords do not match')
      return
    }
    const err = validatePassword(password, lang)
    if (err) { toast.error(err); return }

    setLoading(true)
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus(data.error === 'expired' ? 'expired' : 'invalid')
      }
    } catch {
      toast.error(lang === 'zh-TW' ? '發生錯誤' : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
            {lang === 'zh-TW' ? '密碼已重置' : 'Password Reset'}
          </h1>
          <p className="text-white/60 text-sm mb-6">
            {lang === 'zh-TW' ? '您的密碼已成功更新，請使用新密碼登入。' : 'Your password has been updated. Please log in with your new password.'}
          </p>
          <Link href="/login" className="inline-block px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors">
            🔑 {lang === 'zh-TW' ? '前往登入' : 'Go to Login'}
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'expired' || status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">{status === 'expired' ? '⏰' : '❌'}</div>
          <h1 className="text-xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
            {status === 'expired'
              ? (lang === 'zh-TW' ? '連結已過期' : 'Link Expired')
              : (lang === 'zh-TW' ? '無效連結' : 'Invalid Link')}
          </h1>
          <p className="text-white/50 text-sm mb-4">
            {lang === 'zh-TW' ? '請重新申請密碼重置。' : 'Please request a new reset link.'}
          </p>
          <Link href="/forgot-password" className="inline-block px-6 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors">
            {lang === 'zh-TW' ? '📧 重新申請' : '📧 Request Again'}
          </Link>
        </div>
      </div>
    )
  }

  const rules = [
    { ok: password.length >= 8, label: lang === 'zh-TW' ? '8+ 字符' : '8+ chars' },
    { ok: /[A-Z]/.test(password), label: lang === 'zh-TW' ? '大寫' : 'A-Z' },
    { ok: /[a-z]/.test(password), label: lang === 'zh-TW' ? '小寫' : 'a-z' },
    { ok: /[0-9]/.test(password), label: lang === 'zh-TW' ? '數字' : '0-9' },
  ]
  const passed = rules.filter(r => r.ok).length
  const allPassed = passed === rules.length

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-serif mb-2" style={{ color: 'var(--gold)' }}>玄機</div>
          <h1 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {lang === 'zh-TW' ? '設置新密碼' : 'Set New Password'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">
              {lang === 'zh-TW' ? '新密碼' : 'New Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>

          {password.length > 0 && (
            <div className="-mt-2">
              <div className="flex gap-1 mb-1.5">
                {rules.map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{
                    backgroundColor: i < passed
                      ? allPassed ? '#2dd489' : passed >= 3 ? '#d4a853' : '#f59e0b'
                      : 'rgba(255,255,255,0.08)'
                  }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {rules.map((r, i) => (
                  <span key={i} className={`text-[11px] transition-colors duration-200 ${r.ok ? 'text-jade' : 'text-white/25'}`}>
                    {r.ok ? '✓' : '·'} {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-white/70 text-sm mb-1">
              {lang === 'zh-TW' ? '確認新密碼' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !allPassed}
            className="w-full py-3 bg-gold text-navy-950 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading
              ? (lang === 'zh-TW' ? '重置中...' : 'Resetting...')
              : (lang === 'zh-TW' ? '🔑 重置密碼' : '🔑 Reset Password')}
          </button>
        </form>
      </div>
    </div>
  )
}
