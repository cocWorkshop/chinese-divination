'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

type Status = 'loading' | 'valid' | 'invalid' | 'expired' | 'confirming' | 'deleted' | 'error'

export default function DeleteAccountPage() {
  const { token } = useParams<{ token: string }>()
  const { lang } = useLang()
  const router = useRouter()

  const [status, setStatus] = useState<Status>('loading')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/profile/delete/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setStatus('valid')
          setEmail(data.email)
          setCreatedAt(data.createdAt)
        } else {
          setStatus('invalid')
        }
      })
      .catch(() => setStatus('error'))
  }, [token])

  const handleConfirmDelete = async () => {
    setStatus('confirming')
    try {
      const res = await fetch('/api/profile/delete/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating: rating || null,
          feedback: feedback.trim() || null,
        }),
      })

      if (res.ok) {
        setStatus('deleted')
        await signOut({ redirect: false })
        setTimeout(() => { window.location.href = '/' }, 3000)
      } else {
        const data = await res.json()
        if (res.status === 410) {
          setStatus('expired')
        } else {
          setError(data.error || 'Unknown error')
          setStatus('error')
        }
      }
    } catch {
      setError('Network error')
      setStatus('error')
    }
  }

  const cardStyle = "max-w-lg mx-auto rounded-2xl p-6 sm:p-8 border"

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cardStyle + " glass-card text-center"}
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="text-4xl mb-4 animate-pulse">☯</div>
          <p style={{ color: 'var(--text-muted)' }}>{T(lang, '驗證中...', 'Verifying...')}</p>
        </motion.div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardStyle + " glass-card text-center"}
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}
        >
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-serif mb-2" style={{ color: '#ef4444' }}>
            {T(lang, '無效的連結', 'Invalid Link')}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {T(lang, '此刪除連結無效或已過期。請重新從個人資料頁面發起刪除請求。', 'This deletion link is invalid or has expired. Please initiate a new delete request from your profile page.')}
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
          >
            {T(lang, '返回個人資料', 'Go to Profile')}
          </button>
        </motion.div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardStyle + " glass-card text-center"}
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}
        >
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-serif mb-2" style={{ color: '#ef4444' }}>
            {T(lang, '連結已過期', 'Link Expired')}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {T(lang, '此刪除連結已過期（24小時有效）。請重新從個人資料頁面發起刪除請求。', 'This deletion link has expired (valid for 24 hours). Please initiate a new delete request from your profile page.')}
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
          >
            {T(lang, '返回個人資料', 'Go to Profile')}
          </button>
        </motion.div>
      </div>
    )
  }

  if (status === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cardStyle + " glass-card text-center"}
          style={{ borderColor: 'rgba(45,212,137,0.3)' }}
        >
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-serif mb-2" style={{ color: '#2dd489' }}>
            {T(lang, '帳號已刪除', 'Account Deleted')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {T(lang, '您的帳號和所有數據已被永久刪除。3 秒後將跳轉至首頁...', 'Your account and all data have been permanently deleted. Redirecting to homepage in 3 seconds...')}
          </p>
        </motion.div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardStyle + " glass-card text-center"}
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}
        >
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-serif mb-2" style={{ color: '#ef4444' }}>
            {T(lang, '發生錯誤', 'Error Occurred')}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {error || T(lang, '請稍後再試。', 'Please try again later.')}
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
          >
            {T(lang, '返回個人資料', 'Go to Profile')}
          </button>
        </motion.div>
      </div>
    )
  }

  // status === 'valid' or 'confirming'
  return (
    <div className="min-h-screen py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cardStyle + " glass-card"}
        style={{ borderColor: 'rgba(239,68,68,0.3)' }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🗑️</div>
          <h1 className="text-2xl font-serif" style={{ color: '#ef4444' }}>
            {T(lang, '確認刪除帳號', 'Confirm Account Deletion')}
          </h1>
        </div>

        {/* Account Info */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--gold)' }}>
            {T(lang, '帳號資訊', 'Account Info')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>{T(lang, '電子郵件', 'Email')}</span>
              <span style={{ color: 'var(--text-primary)' }}>{email}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>{T(lang, '註冊日期', 'Registered')}</span>
              <span style={{ color: 'var(--text-primary)' }}>{new Date(createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            ⚠️ {T(lang,
              '此操作不可撤銷！您的帳號和所有數據（占卜記錄、個人資料、家庭成員、回饋等）將被永久刪除。',
              'This action is irreversible! Your account and all data (readings, profile, family members, feedback, etc.) will be permanently deleted.'
            )}
          </p>
        </div>

        {/* Feedback Section */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--gold)' }}>
            {T(lang, '離開前的回饋（選填）', 'Feedback before you go (optional)')}
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {T(lang, '您的意見能幫助我們改進服務。', 'Your feedback helps us improve our service.')}
          </p>

          {/* Star Rating */}
          <div className="mb-3">
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              {T(lang, '整體評分', 'Overall Rating')}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="text-2xl transition-transform hover:scale-110"
                  style={{ color: n <= rating ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              {T(lang, '建議或意見', 'Comments or Suggestions')}
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={T(lang, '告訴我們您離開的原因或任何建議...', 'Tell us why you are leaving or any suggestions...')}
              className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleConfirmDelete}
            disabled={status === 'confirming'}
            className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#dc2626' }}
          >
            {status === 'confirming'
              ? T(lang, '刪除中...', 'Deleting...')
              : T(lang, '確認刪除帳號', 'Confirm Delete Account')
            }
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="flex-1 py-3 rounded-xl font-medium text-sm transition-colors"
            style={{ border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
          >
            {T(lang, '取消，保留帳號', 'Cancel, Keep Account')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
