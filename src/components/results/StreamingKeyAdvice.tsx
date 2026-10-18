'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SparkleIcon } from '@/components/DivinationIcons'
import { useLang } from '../LanguageContext'
import { T } from '@/lib/i18n'

interface StreamingKeyAdviceProps {
  title?: string
  icon?: React.ReactNode
  items?: string[] | null
  streaming?: boolean
  delay?: number
  variant?: 'glass' | 'oriental'
}

const SKELETON_ADVICE: Record<string, string[]> = {
  zh: [
    '順應五行生剋平衡，凡事審時度勢，戒急用忍，靜待天時地利顯現。',
    '善用貴人吉方助力，廣結善緣，在重要轉折點保持沉著並果斷抉擇。',
    '修身養德以厚載福祿，知命順命而不惑於當下起伏，行穩方能致遠。',
  ],
  en: [
    'Harmonize with the balance of the elements; evaluate timing with patience, composure, and mindful observation.',
    'Leverage auspicious directions and benefactor support; maintain clarity and decisive action at key transitions.',
    'Cultivate virtue to anchor enduring blessings; navigate life rhythms gracefully without unnecessary haste.',
  ],
}

export default function StreamingKeyAdvice({
  title,
  icon,
  items,
  streaming = false,
  delay = 0.1,
  variant = 'glass',
}: StreamingKeyAdviceProps) {
  const { lang } = useLang()
  const hasContent = Array.isArray(items) && items.length > 0

  if (!hasContent && !streaming) {
    return null
  }

  const effectiveTitle = title || T(lang, '核心建議', 'Key Advice')
  const effectiveIcon = icon || <SparkleIcon size={16} className="text-gold" />
  const adviceList = hasContent ? items : T(lang, SKELETON_ADVICE.zh, SKELETON_ADVICE.en)

  const cardBaseClass =
    variant === 'oriental'
      ? 'oriental-sanctuary-card rounded-xl p-3 shadow-sm border border-gold/20 flex gap-2.5 items-start'
      : 'card-quiet rounded-xl p-3 border border-gold/20 flex gap-2.5 items-start'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <h3 className="text-gold font-serif text-base mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {effectiveIcon}
          <span>{effectiveTitle}</span>
        </div>
        {streaming && !hasContent && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/70 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/70 animate-pulse [animation-delay:200ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/70 animate-pulse [animation-delay:400ms]" />
          </span>
        )}
      </h3>

      <div
        className={`grid gap-2 transition-all duration-700 ${
          streaming && !hasContent ? 'blur-[6px] opacity-60 select-none pointer-events-none' : ''
        }`}
      >
        {adviceList.map((advice, i) => (
          <div key={i} className={cardBaseClass}>
            <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] flex items-center justify-center flex-shrink-0 font-serif font-bold mt-0.5">
              {i + 1}
            </span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{advice}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
