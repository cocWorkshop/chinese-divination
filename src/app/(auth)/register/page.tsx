'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { GiftVesselIcon, AlertIcon, SunMoonIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'

export default function RegisterPage() {
  return <Suspense><RegisterInner /></Suspense>
}

function validatePassword(pwd: string, lang: string): string | null {
  if (pwd.length < 8) return T(lang, '密碼至少需要 8 個字符', 'Password must be at least 8 characters')
  if (!/[A-Z]/.test(pwd)) return T(lang, '密碼需包含至少一個大寫字母', 'Password must contain an uppercase letter')
  if (!/[a-z]/.test(pwd)) return T(lang, '密碼需包含至少一個小寫字母', 'Password must contain a lowercase letter')
  if (!/[0-9]/.test(pwd)) return T(lang, '密碼需包含至少一個數字', 'Password must contain a number')
  return null
}

function RegisterInner() {
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref') || ''
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [registerBonus, setRegisterBonus] = useState(6)

  useEffect(() => {
    fetch('/api/share/bonus')
      .then(r => r.json())
      .then(data => {
        if (data.registerBonus !== undefined) setRegisterBonus(data.registerBonus)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error(T(lang, '兩次密碼不一致', 'Passwords do not match'))
      return
    }
    const pwdErrors = validatePassword(form.password, lang)
    if (pwdErrors) {
      toast.error(pwdErrors)
      return
    }
    if (!consent) {
      toast.error(T(lang, '請先同意隱私政策和用戶協議', 'Please agree to Privacy Policy and Terms'))
      return
    }
    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, language: T(lang, 'zh-TW', 'en'), ...(referralCode && { referralCode }) }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      if (data.needsVerification) {
        setVerificationSent(true)
        const totalBonus = (data.registerBonus || 0) + (data.shareBonus || 0)
        toast.success(T(lang, `註冊成功！已獲得 ${totalBonus} 點機緣`, `Registered! You got ${totalBonus} Karma`), { duration: 5000 })
        return
      }
      router.push('/login')
    } else {
      const data = await res.json()
      const errorMap: Record<string, string> = T(lang, {
        'Email already registered': '此郵箱已被註冊，請直接登入或使用其他郵箱',
        'Email and password required': '請輸入郵箱和密碼',
      }, {
        'Email already registered': 'This email is already registered. Please log in or use a different email.',
        'Email and password required': 'Email and password are required',
      })
      toast.error(errorMap[data.error] || (T(lang, '註冊失敗，請稍後重試', 'Registration failed, please try again')))
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-foreground/70 text-sm mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={key !== 'name'}
        className="w-full px-4 py-3 bg-surface border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 transition-colors"
      />
    </div>
  )

  const handleResend = async () => {
    setResending(true)
    try {
      await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      toast.success(T(lang, '驗證郵件已重新發送', 'Verification email resent'))
    } catch {
      toast.error(T(lang, '發送失敗', 'Failed to resend'))
    } finally {
      setResending(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="flex-1 flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 w-full max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 text-gold shadow-lg shadow-gold/5">
            <SunMoonIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif mb-2 text-gold">
            {T(lang, '請驗證您的郵箱', 'Check Your Email')}
          </h1>
          <p className="text-foreground/60 text-sm mb-6 leading-relaxed">
            {T(
              lang,
              `我們已發送驗證郵件至 ${form.email}，請點擊郵件中的連結完成驗證。`,
              `We've sent a verification email to ${form.email}. Click the link to verify.`
            )}
          </p>
          <div className="my-5 py-3 px-4 rounded-xl text-left text-xs bg-gold/5 border border-gold/20">
            <p className="font-serif font-medium mb-1.5 text-gold flex items-center gap-1.5">
              <GiftVesselIcon className="w-4 h-4 text-gold" />
              <span>{T(lang, '您的免費機緣', 'Your free Karma')}</span>
            </p>
            <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <p>✦ {T(lang, `${registerBonus} 點機緣已到帳`, `${registerBonus} Karma granted`)}</p>
              <p>✦ {T(lang, '每日登入再送機緣', 'Daily login Karma bonus')}</p>
            </div>
          </div>
          <div className="my-6 h-px bg-gold/15" />
          <div className="py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-4 flex items-start gap-2 text-left">
            <AlertIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              {T(lang, '如果沒有看到郵件，請檢查是否被自動歸入「垃圾郵件」或「促銷」資料夾。', 'If you don\'t see the email, check your Spam or Promotions folder.')}
            </p>
          </div>
          <p className="text-foreground/40 text-xs mb-4">
            {T(lang, '仍然沒有收到？嘗試重新發送。', "Still didn't receive it? Try resending.")}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className="px-5 py-2.5 min-h-[44px] border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors text-sm disabled:opacity-50 inline-flex items-center justify-center font-serif"
            >
              {resending ? '...' : (T(lang, '重新發送驗證郵件', 'Resend Email'))}
            </button>
            <Link
              href="/login"
              className="px-5 py-2.5 min-h-[44px] bg-gold text-navy-950 rounded-xl font-serif font-bold hover:bg-gold-light transition-colors text-sm inline-flex items-center justify-center shadow-md shadow-gold/10"
            >
              {T(lang, '前往登入', 'Go to Login')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-4xl font-serif mb-2" style={{ color: 'var(--gold)' }}>玄機</div>
          <h1 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {T(lang, '建立帳號', 'Create Account')}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('name', T(lang, '姓名（可選）', 'Name (optional)'))}
          {field('email', T(lang, '郵箱', 'Email'), 'email')}
          {field('password', T(lang, '密碼', 'Password'), 'password')}
          {form.password.length > 0 && (() => {
            const rules = [
              { ok: form.password.length >= 8, label: T(lang, '8+ 字符', '8+ chars') },
              { ok: /[A-Z]/.test(form.password), label: T(lang, '大寫', 'A-Z') },
              { ok: /[a-z]/.test(form.password), label: T(lang, '小寫', 'a-z') },
              { ok: /[0-9]/.test(form.password), label: T(lang, '數字', '0-9') },
            ]
            const passed = rules.filter(r => r.ok).length
            const allPassed = passed === rules.length
            return (
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
                    <span key={i} className={`text-[11px] transition-colors duration-300 ${r.ok ? 'text-jade' : 'text-foreground/25'}`}>
                      {r.ok ? '✓' : '·'} {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
          {field('confirm', T(lang, '確認密碼', 'Confirm Password'), 'password')}

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-1 accent-gold w-4 h-4 flex-shrink-0"
            />
            <span className="text-foreground/60 text-xs leading-relaxed">
              {T(
                lang,
                <>我已閱讀並同意 <Link href="/privacy" target="_blank" className="text-gold underline">隱私政策</Link> 和 <Link href="/terms" target="_blank" className="text-gold underline">用戶協議</Link></>,
                <>I have read and agree to the <Link href="/privacy" target="_blank" className="text-gold underline">Privacy Policy</Link> and <Link href="/terms" target="_blank" className="text-gold underline">Terms of Service</Link></>
              )}
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !consent}
            className="w-full py-3.5 min-h-[44px] bg-gradient-to-r from-gold via-gold-light to-gold text-navy-950 rounded-xl font-serif font-bold text-base hover:brightness-105 active:scale-[0.99] transition-all shadow-md shadow-gold/15 disabled:opacity-50"
          >
            {loading ? (T(lang, '註冊中...', 'Registering...')) : (T(lang, '註冊', 'Register'))}
          </button>
        </form>

        <OAuthButtons
          mode="register"
          callbackUrl={referralCode ? `/share/${referralCode}` : '/divination'}
          onError={(msg) => toast.error(msg)}
        />

        <p className="text-center text-foreground/50 mt-6 text-sm">
          {T(lang, '已有帳號？', 'Already have an account?')}{' '}
          <Link href="/login" className="text-gold hover:text-gold-light">
            {T(lang, '立即登入', 'Sign In')}
          </Link>
        </p>
      </div>
    </div>
  )
}
