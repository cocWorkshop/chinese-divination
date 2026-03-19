'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from './LanguageContext'
import toast from 'react-hot-toast'

const T = (lang: string, zhTW: string, en: string) => lang === 'en' ? en : zhTW

const ratingLabels: Record<number, { zh: string; en: string; emoji: string }> = {
  1: { zh: '不太準確', en: 'Inaccurate', emoji: '😕' },
  2: { zh: '有些偏差', en: 'Somewhat off', emoji: '🤔' },
  3: { zh: '基本準確', en: 'Mostly accurate', emoji: '😐' },
  4: { zh: '比較準確', en: 'Quite accurate', emoji: '😊' },
  5: { zh: '非常精準', en: 'Very accurate', emoji: '🎯' },
}

const feedbackPrompts: Record<number, { zh: string; en: string }> = {
  1: { zh: '哪些方面不太準確？', en: 'What felt inaccurate?' },
  2: { zh: '哪些地方有偏差？', en: 'What seemed off?' },
  3: { zh: '有什麼可以改進的？', en: 'Any suggestions for improvement?' },
  4: { zh: '哪些分析讓您印象深刻？', en: 'What stood out to you?' },
  5: { zh: '哪些預測最讓您驚訝？', en: 'What surprised you most?' },
}

interface Props {
  readingId: string
  initialRating?: number | null
}

export default function ReadingFeedback({ readingId, initialRating }: Props) {
  const { lang } = useLang()
  const [rating, setRating] = useState<number | null>(initialRating ?? null)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!initialRating)
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [feedbackLoaded, setFeedbackLoaded] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load existing feedback from API
  useEffect(() => {
    if (initialRating && !feedbackLoaded) {
      fetch(`/api/readings/${readingId}/feedback`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            if (data.rating) { setRating(data.rating); setSaved(true) }
            if (data.feedback) { setFeedback(data.feedback); setShowFeedback(true); setFeedbackSaved(true) }
          }
          setFeedbackLoaded(true)
        })
        .catch(() => setFeedbackLoaded(true))
    }
  }, [readingId, initialRating, feedbackLoaded])

  // Auto-save rating on click
  const handleRate = async (star: number) => {
    const newRating = star === rating ? null : star
    setRating(newRating)
    setSaved(false)

    if (newRating !== null) {
      setShowFeedback(true)
      // Focus textarea after animation
      setTimeout(() => textareaRef.current?.focus(), 300)
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/readings/${readingId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      })
      if (res.ok) {
        setSaved(true)
        if (newRating !== null) {
          toast.success(T(lang, '感謝評分！', 'Thanks for rating!'), { icon: ratingLabels[newRating].emoji, duration: 1500 })
        }
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  // Debounced auto-save for feedback text
  const handleFeedbackChange = (text: string) => {
    setFeedback(text)
    setFeedbackSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/readings/${readingId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: text }),
        })
        if (res.ok) setFeedbackSaved(true)
      } catch { /* silent */ }
    }, 1000)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const displayStar = hoveredStar ?? rating ?? 0
  const activeLabel = hoveredStar ? ratingLabels[hoveredStar] : (rating ? ratingLabels[rating] : null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card rounded-xl p-4 sm:p-5 border"
      style={{ borderColor: 'var(--card-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <h3 className="font-serif text-sm" style={{ color: 'var(--gold)' }}>
            {T(lang, '您的評價', 'Your Feedback')}
          </h3>
        </div>
        {saved && rating && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(45, 212, 137, 0.1)', color: '#2dd489', border: '1px solid rgba(45, 212, 137, 0.3)' }}
          >
            ✓ {T(lang, '已保存', 'Saved')}
          </motion.span>
        )}
      </div>

      {/* Rating Stars */}
      <div className="flex flex-col items-center gap-2 mb-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {T(lang, '這次解卦對您的幫助如何？', 'How helpful was this reading?')}
        </p>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              disabled={saving}
              className="p-1 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
              aria-label={`${star} ${lang === 'en' ? 'stars' : '星'}`}
            >
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-150"
                viewBox="0 0 24 24"
                fill={star <= displayStar ? 'var(--gold)' : 'none'}
                stroke={star <= displayStar ? 'var(--gold)' : 'var(--text-muted)'}
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Rating label with smooth transition */}
        <AnimatePresence mode="wait">
          {activeLabel && (
            <motion.div
              key={displayStar}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-base">{activeLabel.emoji}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--gold)' }}>
                {lang === 'en' ? activeLabel.en : activeLabel.zh}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feedback text - progressive disclosure */}
      <AnimatePresence>
        {showFeedback && rating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {lang === 'en' ? feedbackPrompts[rating].en : feedbackPrompts[rating].zh}
                <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                  ({T(lang, '選填', 'optional')})
                </span>
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={e => handleFeedbackChange(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-gold)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder={T(lang, '分享您的感受...', 'Share your thoughts...')}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {feedback.length}/500
                  </span>
                  {feedbackSaved && feedback && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px]"
                      style={{ color: '#2dd489' }}
                    >
                      ✓ {T(lang, '已自動保存', 'Auto-saved')}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed hint when no rating yet */}
      {!rating && (
        <p className="text-center text-[10px] sm:text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {T(lang, '點擊星星評分，幫助我們提升準確度', 'Rate to help us improve accuracy')}
        </p>
      )}
    </motion.div>
  )
}
