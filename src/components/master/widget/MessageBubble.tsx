'use client'

/**
 * One transcript message. Branches on `kind`:
 *   - 'cta_card'      → gold filled card linking to a new-reading prefill form
 *   - 'reading_card'  → outlined card linking to an existing reading
 *   - text (default)  → user or assistant chat bubble (markdown for assistant)
 *
 * Returns `null` for empty assistant text bubbles that aren't the in-flight
 * last message — empty bubbles arise when the model only emitted tool calls
 * with no surrounding prose.
 */

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MasterMsg } from '../MasterChatContext'
import { formatTime } from './formatTime'

const READING_CARD_ICONS: Record<string, string> = {
  bazi: '🏛️',
  ziwei: '⭐',
  iching: '☯',
  qimen: '🧭',
  liuyao: '🪙',
  meihua: '🌸',
  fengshui: '🏯',
}

interface Props {
  msg: MasterMsg
  isLastMessage: boolean
  loading: boolean
  isEn: boolean
  onCtaClick: (msg: MasterMsg) => void
  onReadingCardClick: (url: string) => void
}

export default function MessageBubble({
  msg,
  isLastMessage,
  loading,
  isEn,
  onCtaClick,
  onReadingCardClick,
}: Props) {
  const isUser = msg.role === 'user'

  // Hide empty assistant text bubbles that aren't the in-flight last message.
  if (
    !isUser &&
    (msg.kind === 'text' || !msg.kind) &&
    !msg.content &&
    !(loading && isLastMessage)
  ) {
    return null
  }

  if (msg.kind === 'cta_card' && msg.ctaPayload) {
    const cx = msg.ctaPayload.ctaContext
    // Build info lines from structured context
    const infoLines: string[] = []
    if (cx?.target) infoLines.push(`👤 ${cx.target}`)
    if (cx?.birthDate || cx?.birthTime || cx?.gender) {
      const parts = [cx.birthDate, cx.birthTime, cx.gender].filter(Boolean)
      infoLines.push(`📅 ${parts.join(' · ')}`)
    }
    if (cx?.birthPlace) infoLines.push(`📍 ${cx.birthPlace}`)
    if (cx?.question) infoLines.push(`❓ ${cx.question.length > 40 ? cx.question.slice(0, 40) + '…' : cx.question}`)

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start"
      >
        <div
          className="max-w-[90%] sm:max-w-[80%] rounded-xl p-4"
          style={{
            background: 'var(--accent-bg, rgba(212,175,55,0.08))',
            border: '1px solid var(--border-gold, rgba(212,175,55,0.35))',
          }}
        >
          <div className="font-serif text-base mb-2" style={{ color: 'var(--gold)' }}>
            {msg.ctaPayload.ctaTitle}
          </div>
          {infoLines.length > 0 && (
            <div className="space-y-0.5 mb-2.5">
              {infoLines.map((line, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                  {line}
                </p>
              ))}
            </div>
          )}
          <p className="text-[10px] leading-relaxed mb-3" style={{ color: 'var(--text-muted, #888)' }}>
            {msg.ctaPayload.ctaDescription}
          </p>
          <button
            onClick={() => onCtaClick(msg)}
            className="text-sm px-4 py-2 rounded-lg font-medium transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
            style={{ backgroundColor: 'var(--gold)', color: '#000' }}
          >
            {msg.ctaPayload.ctaLabel}
          </button>
        </div>
      </motion.div>
    )
  }

  if (msg.kind === 'reading_card' && msg.readingCardPayload) {
    const card = msg.readingCardPayload
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start"
      >
        <button
          onClick={() => onReadingCardClick(card.url)}
          className="max-w-[90%] sm:max-w-[80%] rounded-xl p-3.5 text-left transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.2)]"
          style={{
            background: 'transparent',
            border: '1px dashed var(--border-gold, rgba(212,175,55,0.4))',
          }}
        >
          <div className="flex items-start gap-2.5">
            <span className="text-base flex-shrink-0 mt-0.5" aria-hidden>
              {READING_CARD_ICONS[card.divinationType] ?? '📜'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-sm" style={{ color: 'var(--gold)' }}>
                {card.title}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {card.subtitle}
              </div>
              {card.note && (
                <div className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                  {card.note}
                </div>
              )}
              <div className="text-[10px] mt-1.5" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                {isEn ? 'Click to open →' : '點擊查看 →'}
              </div>
            </div>
          </div>
        </button>
      </motion.div>
    )
  }

  // Plain text bubble (user or assistant).
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3"
        style={{
          background: isUser ? 'var(--accent-bg)' : 'var(--card-bg)',
          border: `1px solid ${isUser ? 'var(--border-gold)' : 'var(--card-border)'}`,
        }}
      >
        {isUser ? (
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--text-primary, #e0e0e0)' }}
          >
            {msg.content}
          </p>
        ) : msg.content ? (
          <div
            className="text-sm leading-relaxed font-serif prose-master"
            style={{ color: 'var(--text-primary, #e0e0e0)' }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          loading && (
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.2s_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.4s_infinite]" />
            </span>
          )
        )}
        {/* Timestamp hidden — clutters the conversation flow */}
      </div>
    </motion.div>
  )
}
