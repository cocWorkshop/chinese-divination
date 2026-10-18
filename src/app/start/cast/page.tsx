'use client'

/**
 * View 2 of the /start ad funnel — the only friction point.
 *
 * Collects birth info + email. Submits to /api/start/init which creates
 * (or resumes) a tentative user, provisions a pending Reading, and sets
 * the funnel session cookie. On success → /start/reading/[id].
 *
 * Form choices favor low friction:
 *   - Shichen (fuzzy) only — no precise hour:minute on the funnel
 *   - No birth place input (defaults to 中国 server-side)
 *   - Email is framed as "we'll save your reading" not "register an account"
 */

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const SHICHEN: { value: string; label: string }[] = [
  { value: 'zi_early', label: '早子時 (00:00-01:00)' },
  { value: 'chou', label: '丑時 (01:00-03:00)' },
  { value: 'yin', label: '寅時 (03:00-05:00)' },
  { value: 'mao', label: '卯時 (05:00-07:00)' },
  { value: 'chen', label: '辰時 (07:00-09:00)' },
  { value: 'si', label: '巳時 (09:00-11:00)' },
  { value: 'wu', label: '午時 (11:00-13:00)' },
  { value: 'wei', label: '未時 (13:00-15:00)' },
  { value: 'shen', label: '申時 (15:00-17:00)' },
  { value: 'you', label: '酉時 (17:00-19:00)' },
  { value: 'xu', label: '戌時 (19:00-21:00)' },
  { value: 'hai', label: '亥時 (21:00-23:00)' },
  { value: 'zi_late', label: '晚子時 (23:00-00:00)' },
]

export default function StartCastPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('wu')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const labelCls = 'block text-xs mb-1.5 font-medium'
  const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 transition-all'
  const inputStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('請輸入有效的信箱地址')
      return
    }
    if (!birthDate) {
      setError('請選擇出生日期')
      return
    }

    setSubmitting(true)
    let utm: Record<string, string> | null = null
    try {
      const raw = sessionStorage.getItem('xj_utm')
      if (raw) utm = JSON.parse(raw)
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/start/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          birthDate,
          birthTime,
          gender,
          utm,
        }),
      })
      const data = await res.json()

      if (res.status === 409 && data.error === 'ALREADY_REGISTERED') {
        // User already has a real account — guide them to login.
        setError('此信箱已註冊。請改用登入。')
        setSubmitting(false)
        setTimeout(() => router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`), 1500)
        return
      }

      if (!res.ok) {
        setError(data.error || '提交失敗，請稍後再試')
        setSubmitting(false)
        return
      }

      router.push(`/start/reading/${data.readingId}`)
    } catch {
      setError('連線失敗，請檢查網路')
      setSubmitting(false)
    }
  }

  // Animation orchestration: each row fades + slides in 80ms after the prior.
  // Index drives `transition.delay` so the staggered reveal feels deliberate
  // rather than all-at-once.
  const fieldAnim = (i: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: 0.15 + i * 0.08, ease: 'easeOut' as const },
  })

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-8">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-5 card-quiet rounded-2xl p-6 sm:p-8"
        style={{ border: '1px solid var(--card-border)' }}
      >
        <motion.header className="text-center mb-2" {...fieldAnim(0)}>
          <h2 className="font-serif text-xl sm:text-2xl mb-1" style={{ color: 'var(--gold)' }}>
            為您起八字命盤
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            填四欄即可，命盤秒生成
          </p>
        </motion.header>

        <motion.div {...fieldAnim(1)}>
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>
            出生日期
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            className={inputCls}
            style={inputStyle}
          />
        </motion.div>

        <motion.div {...fieldAnim(2)}>
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>
            出生時辰
          </label>
          <select
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            {SHICHEN.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </motion.div>

        <motion.div {...fieldAnim(3)}>
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>
            性別
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${gender === g ? 'font-medium' : ''}`}
                style={{
                  backgroundColor: gender === g ? 'var(--gold)' : 'var(--card-bg)',
                  color: gender === g ? '#0a0f1e' : 'var(--text-primary)',
                  border: `1px solid ${gender === g ? 'var(--gold)' : 'var(--card-border)'}`,
                }}
              >
                {g === 'male' ? '男' : '女'}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...fieldAnim(4)}>
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>
            信箱
            <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
              · 命盤生成後可隨時回來查看
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className={inputCls}
            style={inputStyle}
          />
        </motion.div>

        {error && (
          <p className="text-xs text-red-400 leading-relaxed">{error}</p>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          {...fieldAnim(5)}
          className="w-full px-5 py-3 rounded-xl font-medium text-base transition-all disabled:opacity-50 hover:shadow-[0_0_18px_rgba(212,175,55,0.4)]"
          style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
        >
          {submitting ? '排盤中…' : '為我排盤 →'}
        </motion.button>

        <motion.p {...fieldAnim(6)} className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          資料僅用於這次排盤。如想保存命盤，最後一步可選擇註冊。
        </motion.p>
      </motion.form>
    </main>
  )
}
