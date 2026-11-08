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
import remarkCjkFriendly from '@/lib/remarkCjkFriendly'
import type { MasterMsg } from '../MasterChatContext'
import { formatTime } from './formatTime'

import MasterFeedbackPrompt from './MasterFeedbackPrompt'
import { DivinationIcon } from '@/components/DivinationIcons'
import { TEN } from '@/lib/i18n'

interface Props {
  msg: MasterMsg
  isLastMessage: boolean
  loading: boolean
  isEn: boolean
  onCtaClick: (msg: MasterMsg) => void
  onReadingCardClick: (url: string) => void
  isSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
  onStartNewSession?: () => void
  currentOracleType?: string | null
}

export default function MessageBubble({
  msg,
  isLastMessage,
  loading,
  isEn,
  onCtaClick,
  onReadingCardClick,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onStartNewSession,
  currentOracleType,
}: Props) {
  const isUser = msg.role === 'user'

  const renderSelectionIndicator = () => {
    if (!isSelectMode) return null
    return (
      <div
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect?.()
        }}
        className="flex-shrink-0 self-center mr-2.5 sm:mr-3 cursor-pointer select-none"
        aria-hidden
      >
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-[var(--gold)] text-[#080c17] shadow-sm'
              : 'border border-[var(--gold)]/40 hover:border-[var(--gold)] bg-transparent'
          }`}
          role="checkbox"
          aria-checked={isSelected}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  // Hide empty assistant text bubbles that aren't the in-flight last message.
  if (
    !isUser &&
    (msg.kind === 'text' || !msg.kind) &&
    !msg.content &&
    !(loading && isLastMessage)
  ) {
    return null
  }

  // System note — a centered, low-emphasis status line woven into the flow
  // (e.g. "六爻占卜已完成"). Not a chat bubble; never attributed to user/master.
  if (msg.kind === 'system_note') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center my-1"
      >
        <span
          className="text-[11px] px-3 py-1 rounded-full"
          style={{
            color: 'var(--text-muted)',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          ✓ {msg.content}
        </span>
      </motion.div>
    )
  }

  // Hard-limit notice — system-level, visually distinct from the Master's
  // voice so it never reads like an abrupt in-character goodbye.
  if (msg.kind === 'limit_notice') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center my-3"
        role="status"
      >
        <div
          className="max-w-[90%] w-full rounded-lg px-4 py-3 text-center"
          style={{
            background: 'var(--card-bg)',
            border: '1px dashed var(--card-border)',
          }}
        >
          <div className="text-[11px] tracking-widest mb-1" style={{ color: 'var(--gold)' }}>
            {TEN(isEn, '對話已達上限', 'CONVERSATION LIMIT REACHED')}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {msg.content}
          </p>
          {onStartNewSession && (
            <button
              type="button"
              onClick={onStartNewSession}
              className="mt-2.5 text-xs px-3 py-1 rounded-full border transition-colors hover:bg-[var(--gold)]/10"
              style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}
            >
              {TEN(isEn, '開啟新對話', 'Start a new chat')}
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  if (msg.kind === 'feedback_prompt') {
    return (
      <MasterFeedbackPrompt
        reason={msg.feedbackPromptReason}
        durationMs={msg.turnDurationMs}
        isEn={isEn}
      />
    )
  }

  if (msg.kind === 'cta_card' && msg.ctaPayload) {
    const cx = msg.ctaPayload.ctaContext
    // Build info lines from structured context with classical tags
    const infoLines: string[] = []
    if (cx?.target) infoLines.push(`${TEN(isEn, '問測對象：', 'Target: ')}${cx.target}`)
    if (cx?.birthDate || cx?.birthTime || cx?.gender) {
      const parts = [cx.birthDate, cx.birthTime, cx.gender].filter(Boolean)
      infoLines.push(`${TEN(isEn, '生辰資訊：', 'Birth: ')}${parts.join(' · ')}`)
    }
    if (cx?.birthPlace) infoLines.push(`${TEN(isEn, '出生地點：', 'Place: ')}${cx.birthPlace}`)
    if (cx?.question) infoLines.push(`${TEN(isEn, '所問之事：', 'Question: ')}${cx.question.length > 40 ? cx.question.slice(0, 40) + '…' : cx.question}`)

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex justify-start items-center ${isSelectMode ? 'cursor-pointer' : ''}`}
        onClick={isSelectMode ? onToggleSelect : undefined}
      >
        {renderSelectionIndicator()}
        <div
          className={`max-w-[90%] sm:max-w-[80%] rounded-xl p-4 transition-all ${
            isSelected ? 'ring-2 ring-[var(--gold)] shadow-md' : ''
          }`}
          style={{
            background: 'var(--accent-bg, rgba(212,175,55,0.08))',
            border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border-gold, rgba(212,175,55,0.35))'}`,
            borderLeft: '3px solid var(--gold, #d4a853)',
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
          {currentOracleType && msg.ctaPayload.divinationType === currentOracleType ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/15 text-gold-dark dark:text-gold-light border border-gold/30 text-xs font-serif font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{TEN(isEn, '正在左側起盤中...', 'Casting on the left...')}</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                if (isSelectMode) {
                  e.stopPropagation()
                  onToggleSelect?.()
                } else {
                  onCtaClick(msg)
                }
              }}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.3)] active:scale-98"
              style={{ backgroundColor: 'var(--gold)', color: '#000' }}
            >
              {msg.ctaPayload.ctaLabel}
            </button>
          )}
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
        className={`flex justify-start items-center ${isSelectMode ? 'cursor-pointer' : ''}`}
        onClick={isSelectMode ? onToggleSelect : undefined}
      >
        {renderSelectionIndicator()}
        <button
          onClick={(e) => {
            if (isSelectMode) {
              e.stopPropagation()
              onToggleSelect?.()
            } else {
              onReadingCardClick(card.url)
            }
          }}
          className={`max-w-[90%] sm:max-w-[80%] rounded-xl p-3.5 text-left transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.2)] ${
            isSelected ? 'ring-2 ring-[var(--gold)] bg-[rgba(212,175,55,0.08)]' : ''
          }`}
          style={{
            background: 'transparent',
            border: `1px dashed ${isSelected ? 'var(--gold)' : 'var(--border-gold, rgba(212,175,55,0.4))'}`,
          }}
        >
          <div className="flex items-start gap-2.5">
            <span className="flex-shrink-0 mt-0.5" aria-hidden>
              <DivinationIcon type={card.divinationType} size={18} />
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
                {TEN(isEn, '點擊查看 →', 'Click to open →')}
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
      className={`flex items-center w-full ${isUser && !isSelectMode ? 'justify-end' : 'justify-start'} ${
        isSelectMode ? 'cursor-pointer' : ''
      }`}
      onClick={isSelectMode ? onToggleSelect : undefined}
    >
      {renderSelectionIndicator()}
      <div
        className={`${isUser && isSelectMode ? 'ml-auto ' : ''}max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 transition-all ${
          isSelected ? 'ring-2 ring-[var(--gold)] shadow-sm' : ''
        }`}
        style={{
          background: isSelected
            ? 'rgba(212,175,55,0.12)'
            : isUser
              ? 'var(--accent-bg)'
              : 'var(--card-bg)',
          border: `1px solid ${isSelected ? 'var(--gold)' : isUser ? 'var(--border-gold)' : 'var(--card-border)'}`,
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
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly]}>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          loading && (
            <span
              className="inline-flex gap-1"
              role="status"
              aria-label={TEN(isEn, '大師正在輸入', 'Master is typing')}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.2s_infinite]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.4s_infinite]" />
            </span>
          )
        )}
      </div>
    </motion.div>
  )
}
