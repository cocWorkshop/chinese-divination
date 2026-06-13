'use client'

import { motion } from 'framer-motion'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import ShareResultButton from '@/components/ShareResultButton'
import FlameBorderStyle from '@/components/FlameBorderStyle'
import { T } from '@/lib/i18n'

const typeLabels: Record<string, { 'zh-TW': string; en: string }> = {
  bazi: { 'zh-TW': '八字命理', en: 'BaZi' },
  iching: { 'zh-TW': '易經占卜', en: 'I Ching' },
  liuyao: { 'zh-TW': '六爻占卜', en: 'Liu Yao' },
  ziwei: { 'zh-TW': '紫微斗數', en: 'Zi Wei' },
  qimen: { 'zh-TW': '奇門遁甲', en: 'Qi Men' },
  meihua: { 'zh-TW': '梅花易數', en: 'Mei Hua' },
  fengshui: { 'zh-TW': '風水佈局', en: 'Feng Shui' },
  other: { 'zh-TW': '其他', en: 'Others' },
}

const typeIcons: Record<string, string> = {
  bazi: '🏛️', ziwei: '⭐', iching: '☯', qimen: '🧭',
  liuyao: '🪙', meihua: '🌸', fengshui: '🏯', other: '📖',
}

const relationLabels: Record<string, { zh: string; en: string }> = {
  spouse: { zh: '配偶', en: 'Spouse' }, father: { zh: '父親', en: 'Father' },
  mother: { zh: '母親', en: 'Mother' }, son: { zh: '兒子', en: 'Son' },
  daughter: { zh: '女兒', en: 'Daughter' }, brother: { zh: '兄弟', en: 'Brother' },
  sister: { zh: '姐妹', en: 'Sister' }, friend: { zh: '朋友', en: 'Friend' },
  other: { zh: '其他', en: 'Other' },
}

export interface ReadingResultCardProps {
  type: string
  result: string
  readingId: string | null
  lang: string
  question?: string | null
  subjectName?: string | null
  birthInfo?: {
    birthDate?: string
    birthTime?: string
    gender?: string
    calendarType?: string
    birthPlace?: string
    exactTime?: string
  } | null
  createdAt?: string
  targetType?: string
  familyMember?: { relation: string; name: string | null } | null
  shareToken?: string | null
  rating?: number | null
  /** Live SSE streaming — adds the flame border and forwards `streaming` to the renderer. */
  streaming?: boolean
}

/**
 * The single source of truth for presenting a reading result. Shared by the
 * divination flow (live, streaming) and the saved-reading page (history).
 * The ONLY behavioral difference between those two is the `streaming` flag —
 * everything else (header chip, share, feedback, rendering) is identical.
 *
 * Surrounding chrome (back / new-reading buttons, pending & failed states)
 * lives in the wrapping pages, not here.
 */
export default function ReadingResultCard({
  type, result, readingId, lang, question, subjectName, birthInfo, createdAt,
  targetType, familyMember, shareToken, rating, streaming = false,
}: ReadingResultCardProps) {
  const isEn = lang === 'en'
  const canShare = !!readingId && !streaming

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-4 sm:p-8 w-full max-w-full transition-all duration-1000 ${streaming ? 'flame-border-active overflow-visible' : 'overflow-x-auto'}`}
    >
      {streaming && <FlameBorderStyle />}
      {/* Spark particles — small glowing dots that orbit the card edge */}
      {streaming && (
        <div className="flame-sparks" aria-hidden>
          <span className="flame-spark flame-spark-1" />
          <span className="flame-spark flame-spark-2" />
          <span className="flame-spark flame-spark-3" />
          <span className="flame-spark flame-spark-4" />
          <span className="flame-spark flame-spark-5" />
          <span className="flame-spark flame-spark-6" />
          <span className="flame-spark flame-spark-7" />
          <span className="flame-spark flame-spark-8" />
          <span className="flame-spark flame-spark-9" />
          <span className="flame-spark flame-spark-10" />
          <span className="flame-spark flame-spark-11" />
          <span className="flame-spark flame-spark-12" />
          <span className="flame-spark flame-spark-13" />
          <span className="flame-spark flame-spark-14" />
          <span className="flame-spark flame-spark-15" />
          <span className="flame-spark flame-spark-16" />
        </div>
      )}

      {/* Header — type chip + target chip (left), share (right). No date here:
          the reading's title section already shows it. */}
      <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full inline-flex items-center gap-1">
            <span>{typeIcons[type] ?? '📖'}</span>
            {typeLabels[type]?.[isEn ? 'en' : 'zh-TW'] || type}
          </span>
          {targetType === 'family' && familyMember && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
              {isEn
                ? `For ${relationLabels[familyMember.relation]?.en || familyMember.relation}${familyMember.name ? ` (${familyMember.name})` : ''}`
                : `為${relationLabels[familyMember.relation]?.zh || familyMember.relation}${familyMember.name ? `（${familyMember.name}）` : ''}`}
            </span>
          )}
        </div>
        {canShare && (
          <ShareResultButton readingId={readingId!} shareToken={shareToken} lang={lang} variant="inline" />
        )}
      </div>

      {question && (
        <p className="text-white/70 text-sm mb-4 sm:mb-5">{question}</p>
      )}

      <ResultRenderer
        result={result}
        type={type}
        readingId={readingId}
        streaming={streaming}
        subjectName={subjectName}
        birthInfo={birthInfo}
        createdAt={createdAt}
      />

      {/* Feedback widget — only once a saved reading exists (not mid-stream) */}
      {canShare && (
        <div className="mt-6">
          <ReadingFeedback readingId={readingId!} initialRating={rating} />
        </div>
      )}
    </motion.div>
  )
}
