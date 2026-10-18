'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TEN } from '@/lib/i18n'
import {
  getFeedbackPromptContent,
  buildFeedbackPayload,
  type FeedbackReason,
} from './masterFeedbackConfig'

interface Props {
  reason?: FeedbackReason
  durationMs?: number
  isEn: boolean
}

export default function MasterFeedbackPrompt({
  reason = 'slow_response',
  durationMs,
  isEn,
}: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const content = getFeedbackPromptContent(reason, isEn)

  const handleSelectOption = async (option: { label: string; rating: number }) => {
    if (submitting || submitted) return
    setSubmitting(true)
    try {
      const payload = buildFeedbackPayload({
        rating: option.rating,
        optionLabel: option.label,
        reason,
        durationMs,
      })
      await fetch('/api/site-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true) // optimistic graceful fallthrough
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start my-1.5"
    >
      <div
        className="max-w-[90%] sm:max-w-[80%] rounded-xl p-3 text-xs leading-relaxed relative"
        style={{
          background: 'rgba(212, 175, 55, 0.06)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2.5 text-text-muted hover:text-text-primary text-[11px] p-0.5"
          aria-label={TEN(isEn, '關閉', 'Dismiss')}
        >
          ✕
        </button>

        {submitted ? (
          <div className="flex items-center gap-1.5 text-gold py-1">
            <span>✓</span>
            <span>{content.thankYouMessage}</span>
          </div>
        ) : (
          <div>
            <div className="text-text-secondary mb-2 pr-5">
              {content.message}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {content.options.map((opt) => (
                <button
                  key={opt.id}
                  disabled={submitting}
                  onClick={() => handleSelectOption(opt)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    color: 'var(--gold)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)'
                  }}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
