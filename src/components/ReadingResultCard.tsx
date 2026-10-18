'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import ShareResultButton from '@/components/ShareResultButton'
import InContextMasterPrompt from '@/components/reading/InContextMasterPrompt'
import GoldenRippleStyle from '@/components/GoldenRippleStyle'
import FullPageFlameEffect from '@/components/reading/FullPageFlameEffect'
import { DivinationIcon, ScrollIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'

const FatePosterModal = dynamic(() => import('@/components/reading/FatePosterModal'), { ssr: false })

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
  /** Live SSE streaming — adds the golden ripple aura and forwards `streaming` to the renderer. */
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
  const [showPoster, setShowPoster] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-4 sm:p-8 w-full max-w-full transition-all duration-1000 ${streaming ? 'golden-ripple-active overflow-visible' : 'overflow-x-auto'}`}
    >
      {streaming && <GoldenRippleStyle />}
      <FullPageFlameEffect streaming={streaming} lang={lang} />

      {/* Header — type chip + target chip (left), share (right). No date here:
          the reading's title section already shows it. */}
      <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 bg-gold/15 border border-gold/25 text-gold text-xs rounded-full inline-flex items-center gap-1.5 font-serif">
            <DivinationIcon type={type} size={14} className="text-gold" />
            <span>{typeLabels[type]?.[isEn ? 'en' : 'zh-TW'] || type}</span>
          </span>
          {targetType === 'family' && familyMember && (
            <span className="px-2.5 py-1 bg-gold/10 border border-gold/20 text-gold-light text-xs rounded-full font-serif">
              {isEn
                ? `For ${relationLabels[familyMember.relation]?.en || familyMember.relation}${familyMember.name ? ` (${familyMember.name})` : ''}`
                : `為${relationLabels[familyMember.relation]?.zh || familyMember.relation}${familyMember.name ? `（${familyMember.name}）` : ''}`}
            </span>
          )}
        </div>
        {canShare && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowPoster(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors flex-shrink-0 cursor-pointer font-serif"
              style={{
                backgroundColor: 'rgba(212, 168, 83, 0.12)',
                color: 'var(--gold)',
                border: '1px solid rgba(212, 168, 83, 0.3)',
              }}
              title={isEn ? 'Generate aesthetic fortune poster' : '生成東方典藏命理籤卡'}
            >
              <ScrollIcon size={13} className="text-gold" />
              <span>{isEn ? 'Fate Poster' : '命理籤卡'}</span>
            </button>
            <ShareResultButton readingId={readingId!} shareToken={shareToken} lang={lang} variant="inline" />
          </div>
        )}
      </div>

      {question && (
        <p className="text-[var(--text-secondary)] font-serif text-sm mb-4 sm:mb-5 leading-relaxed">{question}</p>
      )}

      {streaming && (
        <div className="mb-4 sm:mb-6 px-3.5 py-2.5 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent flex items-center justify-between gap-3 animate-pulse shadow-[0_0_15px_rgba(212,168,83,0.1)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
            </span>
            <span className="text-gold font-serif text-xs sm:text-sm font-medium tracking-wide truncate">
              {isEn ? 'Master Xuanji is channeling insights… Sections are revealing gradually' : '玄機大師正在推演卦象命盤，天機逐步顯現…'}
            </span>
          </div>
          <span className="text-[11px] text-gold/80 font-mono flex-shrink-0 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
            {isEn ? 'Live Channeling' : '實時演繹中'}
          </span>
        </div>
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

      {/* In-Context Master Consultation Prompts — once reading is complete */}
      {!streaming && (
        <InContextMasterPrompt divinationType={type} readingId={readingId} lang={lang} />
      )}

      {/* Feedback widget — only once a saved reading exists (not mid-stream) */}
      {canShare && (
        <div className="mt-6">
          <ReadingFeedback readingId={readingId!} initialRating={rating} />
        </div>
      )}

      {/* Aesthetic Oriental Fate Poster Modal */}
      {canShare && showPoster && (
        <FatePosterModal
          isOpen={showPoster}
          onClose={() => setShowPoster(false)}
          readingId={readingId!}
          shareToken={shareToken}
          divinationType={type}
          subjectName={subjectName}
          result={result}
          lang={lang}
        />
      )}
    </motion.div>
  )
}
