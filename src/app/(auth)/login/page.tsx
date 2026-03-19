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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (res?.error) {
      setError(lang === 'zh-TW' ? '郵箱或密碼錯誤' : 'Invalid email or password')
    } else {
      router.push(refCode ? `/share/${refCode}` : '/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-serif mb-2" style={{ color: 'var(--gold)' }}>玄機</div>
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
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

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
