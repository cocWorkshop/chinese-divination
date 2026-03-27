'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}

function LoginInner() {
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Pre-validate via our API (logs auth events with IP/UA)
      const check = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const checkData = await check.json()

      if (!check.ok) {
        if (checkData.unverified) {
          setError(lang === 'zh-TW' ? '郵箱尚未驗證，請查收驗證郵件' : 'Email not verified. Please check your inbox.')
          setShowResend(true)
        } else {
          setError(lang === 'zh-TW' ? '郵箱或密碼錯誤' : 'Invalid email or password')
          setShowResend(false)
        }
        setLoading(false)
        return
      }

      // Credentials validated — establish session via NextAuth
      const res = await signIn('credentials', { email, password, redirect: false })
      setLoading(false)

      if (res?.error) {
        setError(lang === 'zh-TW' ? '登入失敗，請重試' : 'Login failed, please try again')
      } else {
        router.push(refCode ? `/share/${refCode}` : '/divination')
      }
    } catch {
      setLoading(false)
      setError(lang === 'zh-TW' ? '網路錯誤，請重試' : 'Network error, please try again')
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass-card rounded-2xl p-5 sm:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-brand mb-2" style={{ color: 'var(--gold)' }}>玄機</div>
          <h1 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {lang === 'zh-TW' ? '登入帳號' : 'Sign In'}
          </h1>
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
          <div>
            <label className="block text-white/70 text-sm mb-1">
              {lang === 'zh-TW' ? '密碼' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
            />
            <div className="mt-1 text-right">
              <Link href="/forgot-password" className="text-gold/60 text-xs hover:text-gold transition-colors">
                {lang === 'zh-TW' ? '忘記密碼？' : 'Forgot password?'}
              </Link>
            </div>
          </div>

          {error && (
            <div>
              <p className="text-red-400 text-sm">{error}</p>
              {showResend && (
                <button
                  type="button"
                  onClick={async () => {
                    setResending(true)
                    await fetch('/api/resend-verification', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    })
                    setResending(false)
                    setError(lang === 'zh-TW' ? '✉ 驗證郵件已重新發送，請查收' : '✉ Verification email resent, please check inbox')
                    setShowResend(false)
                  }}
                  disabled={resending}
                  className="mt-2 text-gold text-sm hover:text-gold-light transition-colors disabled:opacity-50"
                >
                  {resending ? '...' : (lang === 'zh-TW' ? '📧 重新發送驗證郵件' : '📧 Resend verification email')}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-navy-950 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? (lang === 'zh-TW' ? '登入中...' : 'Signing in...') : (lang === 'zh-TW' ? '登入' : 'Sign In')}
          </button>
        </form>

        <p className="text-center text-white/50 mt-6 text-sm">
          {lang === 'zh-TW' ? '還沒有帳號？' : "Don't have an account?"}{' '}
          <Link href="/register" className="text-gold hover:text-gold-light">
            {lang === 'zh-TW' ? '立即註冊' : 'Register'}
          </Link>
        </p>
      </div>
    </div>
  )
}
