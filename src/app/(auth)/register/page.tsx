'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'

export default function RegisterPage() {
  return <Suspense><RegisterInner /></Suspense>
}

function RegisterInner() {
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref') || ''
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error(lang === 'zh-TW' ? '兩次密碼不一致' : 'Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error(lang === 'zh-TW' ? '密碼至少6位' : 'Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, ...(referralCode && { referralCode }) }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      if (data.bonusModel1) {
        toast.success(lang === 'zh-TW' ? `🎁 註冊成功！獲得 ⚡×${data.bonusModel1} 額外次數` : `🎁 Registered! Got ⚡×${data.bonusModel1} bonus`, { duration: 4000 })
      } else {
        toast.success(lang === 'zh-TW' ? '註冊成功，請登入' : 'Registered! Please sign in.')
      }
      router.push('/login')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Error')
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-white/70 text-sm mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={key !== 'name'}
        className="w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
      />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-serif mb-2" style={{ color: 'var(--gold)' }}>玄機</div>
          <h1 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {lang === 'zh-TW' ? '建立帳號' : 'Create Account'}
          </h1>
        </div>

        {referralCode && (
          <div className="mb-4 py-2 px-4 rounded-lg text-center text-sm" style={{ backgroundColor: 'rgba(45, 212, 137, 0.1)', border: '1px solid rgba(45, 212, 137, 0.3)', color: '#2dd489' }}>
            🎁 {lang === 'zh-TW' ? '透過分享連結註冊，您將獲得額外占卜次數！' : 'Register via referral to earn bonus credits!'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('name', lang === 'zh-TW' ? '姓名（可選）' : 'Name (optional)')}
          {field('email', lang === 'zh-TW' ? '郵箱' : 'Email', 'email')}
          {field('password', lang === 'zh-TW' ? '密碼' : 'Password', 'password')}
          {field('confirm', lang === 'zh-TW' ? '確認密碼' : 'Confirm Password', 'password')}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-navy-950 rounded-lg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? (lang === 'zh-TW' ? '註冊中...' : 'Registering...') : (lang === 'zh-TW' ? '註冊' : 'Register')}
          </button>
        </form>

        <p className="text-center text-white/50 mt-6 text-sm">
          {lang === 'zh-TW' ? '已有帳號？' : 'Already have an account?'}{' '}
          <Link href="/login" className="text-gold hover:text-gold-light">
            {lang === 'zh-TW' ? '立即登入' : 'Sign In'}
          </Link>
        </p>
      </div>
    </div>
  )
}
