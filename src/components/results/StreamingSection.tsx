'use client'

/**
 * Reusable streaming-aware section for V2 result renderers.
 *
 * Combines SectionDrawer chrome with the streaming UX: when `streaming`
 * is true and the section has no content, the body shows a gaussian-blur
 * placeholder with typing dots in the header. When content arrives, the
 * blur dissolves and markdown renders normally.
 *
 * Used by all divination result renderers (bazi, ziwei, liuyao, qimen,
 * fengshui, iching, meihua) to avoid duplicating the streaming logic.
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from '@/lib/remarkCjkFriendly'
import SectionDrawer from './SectionDrawer'
import { useLang } from '../LanguageContext'
import { T } from '@/lib/i18n'

interface StreamingSectionProps {
  /** Section icon (vector icon or node). */
  icon?: React.ReactNode
  /** Section title (already translated by caller). */
  title: string
  /** Section content text (from LLM). */
  content?: string | null
  /** Whether the parent is in streaming mode. */
  streaming?: boolean
  /** Animation keyframe name — each renderer should define its own to avoid collisions. */
  dotAnimName?: string
}

export default function StreamingSection({
  icon,
  title,
  content,
  streaming,
  dotAnimName = 'dotPulseSection',
}: StreamingSectionProps) {
  const { lang } = useLang()
  const hasContent = typeof content === 'string' && content.trim().length > 0

  return (
    <SectionDrawer
      icon={icon}
      title={title}
      trailing={streaming && !hasContent ? (
        <span className="inline-flex gap-0.5">
          <span className={`w-1.5 h-1.5 rounded-full bg-gold/60 animate-[${dotAnimName}_1.4s_ease_infinite]`} />
          <span className={`w-1.5 h-1.5 rounded-full bg-gold/60 animate-[${dotAnimName}_1.4s_ease_0.2s_infinite]`} />
          <span className={`w-1.5 h-1.5 rounded-full bg-gold/60 animate-[${dotAnimName}_1.4s_ease_0.4s_infinite]`} />
        </span>
      ) : undefined}
    >
      <div className={`text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown overflow-x-auto break-words transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
        {hasContent ? (
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly]}>{content!}</ReactMarkdown>
        ) : streaming ? (
          <p className="text-[var(--text-muted)] leading-relaxed">
            {T(lang,
              '此段正在由玄機大師撰寫，將根據命盤結構性數據進行深度分析，請稍候片刻…',
              'This section is being composed by Master Xuanji based on your chart data…')}
          </p>
        ) : (
          <span className="text-[var(--text-muted)] text-sm">
            {T(lang, '暫無內容', 'No content')}
          </span>
        )}
      </div>
    </SectionDrawer>
  )
}
