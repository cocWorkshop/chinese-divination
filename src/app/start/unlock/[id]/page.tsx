'use client'

/**
 * View 5 of the /start ad funnel — convert tentative user → real user.
 *
 * Two inputs (password + optional name) and one button. POST to
 * /api/start/complete which:
 *   - validates the funnel cookie
 *   - hashes + stores the password
 *   - sets `tentative=false`, `signupCompletedAt=now()`
 *   - grants the registerBonus Karma (existing /api/register logic)
 *   - auto-verifies email (deliberate — see /api/start/complete header)
 *
 * On success, the page calls NextAuth `signIn()` with email + password
 * to establish a real session, then redirects to /dashboard?reading={id}.
 * The dashboard's deep-link logic auto-expands and scrolls to the reading;
 * the master widget will fire a State-2 greeting referencing it.
 */

import { useState, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'

export default function StartUnlockPage() {
  const router = useRouter()
  const params = useParams()
  const readingId = params?.id as string

  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passOk = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  }
  const passValid = passOk.length && passOk.upper && passOk.lower && passOk.digit

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
    if (!passValid) {
      setError('密碼需 8 位以上，含大小寫字母與數字')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/start/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '完成註冊失敗，請稍後再試')
        setSubmitting(false)
        return
      }
      // Email-verification gate: /api/start/complete sent a verification
      // link, set emailVerified=false, and cleared the funnel cookie.
      // The user can't log in until they click the link in their inbox,
      // so we land them on the "check email" splash. Their reading and
      // master conversation are persisted; they'll see them after they
      // verify + log in.
      router.push(`/start/verify-sent?email=${encodeURIComponent(data.email)}&reading=${readingId}`)
    } catch {
      setError('連線失敗')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-8">
      <div className="relative w-full max-w-md">
        {/* Gold halo behind the conversion card — subtle visual emphasis on
            the moment that actually moves money / commitment. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'var(--gold)',
            filter: 'blur(40px)',
            opacity: 0.08,
            transform: 'scale(0.95)',
          }}
        />
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full space-y-5 glass-card rounded-2xl p-6 sm:p-8"
          style={{ border: '1px solid var(--border-gold, rgba(212,175,55,0.4))' }}
        >
          <header className="text-center">
            <h2 className="font-serif text-xl sm:text-2xl mb-1" style={{ color: 'var(--gold)' }}>
              領取 50 機緣 · 解鎖完整命盤
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              設個密碼，這份命盤就是您的了
            </p>
          </header>

        <div>
          <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
            密碼
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            placeholder="8 位以上，含大小寫與數字"
            className={inputCls}
            style={inputStyle}
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
            {([
              { ok: passOk.length, label: '8 位' },
              { ok: passOk.upper, label: '大寫' },
              { ok: passOk.lower, label: '小寫' },
              { ok: passOk.digit, label: '數字' },
            ] as const).map((c) => (
              <span key={c.label} style={{ color: c.ok ? 'var(--gold)' : 'var(--text-muted)' }}>
                {c.ok ? '✓' : '○'} {c.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
            稱呼（選填）
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="玄機大師可以這樣稱呼您"
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 leading-relaxed">{error}</p>
        )}

          <button
            type="submit"
            disabled={submitting || !passValid}
            className="w-full px-5 py-3 rounded-xl font-medium text-base transition-all disabled:opacity-50 hover:shadow-[0_0_24px_rgba(212,175,55,0.5)]"
            style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
          >
            {submitting ? '完成註冊中…' : '解鎖完整命盤 →'}
          </button>

          <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            完成註冊即享 <span style={{ color: 'var(--gold)' }}>50 機緣</span>，
            可解讀完整命盤與多次玄機大師對話
          </p>
        </motion.form>
      </div>
    </main>
  )
}
