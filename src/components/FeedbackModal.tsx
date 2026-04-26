'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

export default function FeedbackButton() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)

  if (!session) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-lg transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, rgba(212,168,83,0.9), rgba(212,168,83,0.7))',
          border: '1px solid rgba(212,168,83,0.5)',
          color: '#0a1628',
        }}
        title={T(lang, '意見反饋', 'Feedback')}
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm glass-card rounded-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif" style={{ color: 'var(--gold)' }}>
                {T(lang, '意見反饋', 'Feedback')}
              </h3>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/60 transition-colors text-lg">✕</button>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{T(lang, '整體評分', 'Overall Rating')}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)}
                    className="text-2xl transition-all hover:scale-125"
                    style={{ color: n <= rating ? '#d4a853' : 'rgba(255,255,255,0.15)' }}
                  >★</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{T(lang, '建議或意見', 'Comments')}</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={T(lang, '分享您的使用體驗...', 'Share your experience...')}
                className="w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors resize-none"
              />
            </div>

            <button
              disabled={!text.trim() || sending}
              onClick={async () => {
                setSending(true)
                try {
                  const res = await fetch('/api/site-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: rating || null, feedback: text }),
                  })
                  if (res.ok) {
                    toast.success(T(lang, '感謝回饋！', 'Thanks for your feedback!'))
                    setText('')
                    setRating(0)
                    setOpen(false)
                  }
                } catch {
                  toast.error('Error')
                }
                setSending(false)
              }}
              className="w-full px-5 py-2.5 rounded-xl font-medium text-sm bg-gold text-navy-950 hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              {sending ? '...' : T(lang, '提交回饋', 'Submit')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
