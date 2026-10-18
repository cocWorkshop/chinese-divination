'use client'

/**
 * Controlled feedback modal — star rating + comment textarea, posts to
 * /api/site-feedback. Mounted from the Navbar (inside the user dropdown);
 * the floating bottom-right button is gone, replaced by a menu item that
 * toggles `open`.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

export default function FeedbackModal({ open, onClose }: Props) {
  const { lang } = useLang()
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)

  // Guard SSR: the modal only renders after a client-side click (open starts
  // false), but check anyway so createPortal never sees an undefined document.
  if (!open || typeof document === 'undefined') return null

  const handleSubmit = async () => {
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
        onClose()
      }
    } catch {
      toast.error(T(lang, '提交失敗', 'Submission failed'))
    }
    setSending(false)
  }

  // Render into <body> via a portal so the modal escapes the Navbar's
  // containing block. The Navbar is `position: fixed` with `backdrop-blur`,
  // which makes it a containing block for fixed-position descendants — without
  // the portal the modal would anchor to the ~64px navbar box and its title
  // would be clipped above the viewport instead of centering on screen.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-scrim backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto card-quiet rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif" style={{ color: 'var(--gold)' }}>
            {T(lang, '意見反饋', 'Feedback')}
          </h3>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground/60 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            {T(lang, '整體評分', 'Overall Rating')}
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="text-2xl transition-all hover:scale-125"
                style={{ color: n <= rating ? '#d4a853' : 'rgba(255,255,255,0.15)' }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {T(lang, '建議或意見', 'Comments')}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={T(lang, '分享您的使用體驗...', 'Share your experience...')}
            className="w-full px-4 py-3 bg-surface border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 transition-colors resize-none"
          />
        </div>

        <button
          disabled={!text.trim() || sending}
          onClick={handleSubmit}
          className="w-full px-5 py-2.5 rounded-xl font-medium text-sm bg-gold text-navy-950 hover:bg-gold-light transition-colors disabled:opacity-40"
        >
          {sending ? '...' : T(lang, '提交回饋', 'Submit')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
