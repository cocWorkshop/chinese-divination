'use client'

import { motion } from 'framer-motion'
import { KeyPredictionIcon } from '@/components/DivinationIcons'
import { useLang } from '../LanguageContext'
import { T } from '@/lib/i18n'

export interface PredictionItem {
  age?: string
  ageRange?: string
  event: string
  basis?: string
  reason?: string
}

interface StreamingKeyPredictionsProps {
  predictions?: PredictionItem[] | null
  streaming?: boolean
  delay?: number
}

const SKELETON_PREDICTIONS: Record<string, PredictionItem[]> = {
  zh: [
    {
      age: '30-35歲 · 轉折之年',
      event: '大運更迭，歲次引動格局樞機，事業與財帛宮現吉兆，宜把握機遇推進重要決策…',
      basis: '推演依據：大運干支與命局五行生剋制化之機',
    },
    {
      age: '42-45歲 · 穩進時期',
      event: '天月二德照臨，流年逢天乙貴人相助，家宅安泰，凡事順應天時可獲圓滿…',
      basis: '推演依據：流年神煞與宮位交互感應',
    },
  ],
  en: [
    {
      age: 'Age 30-35 · Pivotal Phase',
      event: 'Major decadal shift activating key pillars; favorable signs in career and wealth sectors indicate auspicious timing for expansion…',
      basis: 'Basis: Elemental interactions between decade pillar and natal stems',
    },
    {
      age: 'Age 42-45 · Harmonious Growth',
      event: 'Benefactor stars align with the annual transit, bringing steady support and tranquil household harmony…',
      basis: 'Basis: Auspicious stars and decadal harmony',
    },
  ],
}

export default function StreamingKeyPredictions({
  predictions,
  streaming = false,
  delay = 0.1,
}: StreamingKeyPredictionsProps) {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const hasContent = Array.isArray(predictions) && predictions.length > 0

  if (!hasContent && !streaming) {
    return null
  }

  const items = hasContent ? predictions : (isEn ? SKELETON_PREDICTIONS.en : SKELETON_PREDICTIONS.zh)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <h3 className="text-gold font-serif text-base mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyPredictionIcon size={16} className="text-gold" />
          <span>{T(lang, '關鍵預測', 'Key Predictions')}</span>
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
        {items.map((pred, i) => {
          const ageStr = pred.age || pred.ageRange || ''
          const basis = pred.basis || pred.reason || ''
          const isCurrent =
            ageStr.includes('當前') ||
            ageStr.includes('当前') ||
            ageStr.toLowerCase().includes('current')

          return (
            <div
              key={i}
              className={`glass-card rounded-xl p-3 border transition-colors ${
                isCurrent ? 'border-gold/50 ring-1 ring-gold/20' : 'border-gold/20'
              }`}
            >
              {ageStr && (
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isCurrent ? 'bg-gold/30 text-gold' : 'bg-gold/20 text-gold'
                    }`}
                  >
                    {ageStr}
                  </span>
                  {isCurrent && <span className="stamp-gold text-[9px] px-1 py-0.2">當前</span>}
                </div>
              )}
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{pred.event}</p>
              {basis && (
                <p className="text-[var(--text-muted)] text-xs mt-1 italic leading-relaxed">
                  {basis}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
