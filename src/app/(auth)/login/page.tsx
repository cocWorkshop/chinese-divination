'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import YinYangIcon from '@/components/YinYangIcon'
import { T } from '@/lib/i18n'

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}

function LoginInner() {
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  // `next` lets callers (e.g. the divination form's logged-out CTAs) bounce
  // the user back to where they came from after sign-in. Constrained to
  // same-origin relative paths to prevent an open-redirect — anything that
  // looks like a protocol or `//host` is dropped silently.
  const rawNext = searchParams.get('next')
  const safeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null
  const authError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (authError) {
      if (authError === 'OAuthAccountNotLinked') {
        setError(T(lang, '此郵箱已綁定其他登入方式，請使用原有方式登入', 'This email is already associated with another login method.'))
      } else if (authError === 'OAuthCallbackError' || authError === 'OAuthSignin') {
        setError(T(lang, '第三方授權登入失敗，請重試', 'Third-party sign in failed. Please try again.'))
      } else {
        setError(T(lang, '登入驗證失敗，請重試', 'Authentication failed. Please try again.'))
      }
    }
  }, [authError, lang])

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
          setError(T(lang, '郵箱尚未驗證，請查收驗證郵件', 'Email not verified. Please check your inbox.'))
          setShowResend(true)
        } else {
          setError(T(lang, '郵箱或密碼錯誤', 'Invalid email or password'))
          setShowResend(false)
        }
        setLoading(false)
        return
      }

      // Credentials validated — establish session via NextAuth
      const res = await signIn('credentials', { email, password, redirect: false })
      setLoading(false)

      if (res?.error) {
        setError(T(lang, '登入失敗，請重試', 'Login failed, please try again'))
      } else {
        // Priority: ref share-link > caller-supplied next > /divination default
        router.push(refCode ? `/share/${refCode}` : (safeNext ?? '/divination'))
      }
    } catch {
      setLoading(false)
      setError(T(lang, '網路錯誤，請重試', 'Network error, please try again'))
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <YinYangIcon size={48} className="mx-auto mb-4 text-gold" />
          <h1 className="text-2xl font-serif text-gold">
            {T(lang, '登入玄機', 'Sign in to Xuanji')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {T(lang, '探索東方命理哲學與運勢解讀', 'Explore oriental metaphysical wisdom')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              {T(lang, '電子郵箱', 'Email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {T(lang, '密碼', 'Password')}
              </label>
              <Link href="/forgot-password" className="text-xs text-gold hover:text-gold-light transition-colors">
                {T(lang, '忘記密碼？', 'Forgot password?')}
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-surface border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
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
                    setError(T(lang, '驗證郵件已重新發送，請查收信箱', 'Verification email resent, please check inbox'))
                    setShowResend(false)
                  }}
                  disabled={resending}
                  className="mt-2 text-gold text-sm hover:text-gold-light transition-colors disabled:opacity-50 min-h-[36px] flex items-center"
                >
                  {resending ? '...' : (T(lang, '重新發送驗證郵件', 'Resend verification email'))}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 min-h-[44px] bg-gradient-to-r from-gold via-gold-light to-gold text-navy-950 rounded-xl font-serif font-bold text-base hover:brightness-105 active:scale-[0.99] transition-all shadow-md shadow-gold/15 disabled:opacity-50"
          >
            {loading ? (T(lang, '登入中...', 'Signing in...')) : (T(lang, '登入', 'Sign In'))}
          </button>
        </form>

        <OAuthButtons
          mode="login"
          callbackUrl={refCode ? `/share/${refCode}` : (safeNext ?? '/divination')}
          onError={setError}
        />

        <p className="text-center text-foreground/50 mt-6 text-sm">
          {T(lang, '還沒有帳號？', "Don't have an account?")}{' '}
          <Link href="/register" className="text-gold hover:text-gold-light">
            {T(lang, '立即註冊', 'Register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
