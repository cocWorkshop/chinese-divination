'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import SectionDrawer from './SectionDrawer'
import StreamingSection from './StreamingSection'
import PersonInfoHeader from './PersonInfoHeader'
import type { DivinationResultProps, IChingData } from '@/types/divination'
import { T } from '@/lib/i18n'

const outcomeColor: Record<string, string> = {
  '大吉': 'text-jade border-jade/40 bg-jade/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
  '小凶': 'text-orange-300 border-orange-300/40 bg-orange-300/10',
}

const yaoNamesZh = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const lineValueLabel: Record<number, { zh: string; en: string }> = {
  6: { zh: '老陰 ✕', en: 'Old Yin ✕' },
  7: { zh: '少陽', en: 'Young Yang' },
  8: { zh: '少陰', en: 'Young Yin' },
  9: { zh: '老陽 ✕', en: 'Old Yang ✕' },
}

interface MiniHexProps {
  hex: NonNullable<IChingData['hexagram']>
  changing?: number[]
  label?: string
  lang: string
}

function MiniHex({ hex, changing, label, lang }: MiniHexProps) {
  const lines = hex.lines || []
  const changingSet = new Set(changing || [])
  return (
    <div className="rounded-lg p-3 border border-gold/15 bg-gold/5 text-center">
      {label && <div className="text-[var(--text-muted)] text-xs mb-1">{label}</div>}
      <div className="text-[var(--text-muted)] text-xs">{T(lang, `第 ${hex.number} 卦`, `#${hex.number}`)}</div>
      <h4 className="text-gold font-serif text-lg leading-tight">{hex.name}</h4>
      <div className="text-[var(--text-secondary)] text-xs mb-2">{hex.chineseName}</div>
      <div className="flex flex-col items-center gap-1 my-2">
        {[...lines].reverse().map((line, ri) => {
          const position = lines.length - ri
          const isChanging = changingSet.has(position)
          return (
            <div key={ri} className="flex gap-1 items-center">
              {line === 1 ? (
                <div className={`w-14 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold'}`} />
              ) : (
                <>
                  <div className={`w-6 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/70'}`} />
                  <div className="w-1.5" />
                  <div className={`w-6 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/70'}`} />
                </>
              )}
              {isChanging && <span className="text-amber-400 text-[10px]">✕</span>}
            </div>
          )
        })}
      </div>
      <div className="flex justify-center gap-3 text-xs">
        {[hex.upperTrigram, hex.lowerTrigram].map((t, i) => t && (
          <div key={i}>
            <div className="text-base">{t.symbol}</div>
            <div className="text-gold text-[10px]">{t.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function IChingResult({ data, rawResult, isShared, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const { lang } = useLang()
  const d = data as unknown as IChingData
  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']

  return (
    <div className="space-y-4 sm:space-y-5">
      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ ① CHART — hexagram visual + outcome + 卦辭/象辭 ═══ */}
      <SectionDrawer icon="☰" title={T(lang, '卦象', 'Hexagram')} align="center" size="lg">
        <div className="space-y-4">
          {/* Hexagram visual — original always; variant shown side-by-side when changing lines exist */}
          <div className={`grid gap-3 ${d.variant ? 'grid-cols-2' : 'grid-cols-1 max-w-xs mx-auto'}`}>
            {d.hexagram && (
              <MiniHex
                hex={d.hexagram}
                changing={d.changingLineNumbers}
                label={d.variant ? T(lang, '本卦', 'Original') : undefined}
                lang={lang}
              />
            )}
            {d.variant && (
              <MiniHex hex={d.variant} label={T(lang, '之卦', 'Variant')} lang={lang} />
            )}
          </div>

          {/* Outcome badge */}
          <div className="text-center">
            <span className={`inline-block px-4 py-1.5 rounded-full border text-sm font-semibold ${ocClass}`}>
              {d.hexagram?.name}
              {d.variant && <span className="opacity-70"> → {d.variant.name}</span>}
              <span className="opacity-70"> · {oc}</span>
            </span>
          </div>

          {/* 卦辭 + 象辭 */}
          {(d.judgment || d.image) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.judgment && (
                <div className="rounded-lg p-3 border border-gold/15 bg-gold/5">
                  <h4 className="text-gold font-serif text-sm mb-1.5">{T(lang, '卦辭', 'Judgment')}</h4>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{d.judgment}</p>
                </div>
              )}
              {d.image && (
                <div className="rounded-lg p-3 border border-gold/15 bg-gold/5">
                  <h4 className="text-gold font-serif text-sm mb-1.5">{T(lang, '象辭', 'Image')}</h4>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{d.image}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionDrawer>

      {/* ═══ ② OVERVIEW — interpretation, always visible ═══ */}
      {(() => {
        const hasContent = typeof d.interpretation === 'string' && d.interpretation.trim().length > 0
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <span aria-hidden>📖</span>
              <span>{T(lang, '卦象解讀', 'Interpretation')}</span>
            </h3>
            <div className="text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown break-words">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.interpretation}</ReactMarkdown>
              ) : streaming ? (
                <p className="text-[var(--text-muted)] leading-relaxed">{T(lang, '此段正在由玄機大師撰寫，請稍候片刻…', 'Being composed by Master Xuanji…')}</p>
              ) : (
                <span className="text-[var(--text-muted)] text-sm">{T(lang, '暫無內容', 'No content')}</span>
              )}
            </div>
          </motion.div>
        )
      })()}

      {/* ═══ ③ ANALYSIS SECTIONS — drawers ═══ */}
      <div className="space-y-2">
        {d.changingLines && d.changingLines.length > 0 && (
          <SectionDrawer icon="✦" title={T(lang, '變爻', 'Changing Lines')}>
            <div className="space-y-3">
              {d.changingLines.map((cl, i) => {
                const idx = (cl.position ?? 1) - 1
                const lv = d.lineValues?.[idx]
                const labelZh = lv ? lineValueLabel[lv]?.zh : ''
                const labelEn = lv ? lineValueLabel[lv]?.en : ''
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gold text-sm font-serif">{T(lang, yaoNamesZh[idx] ?? `第${cl.position}爻`, `Line ${cl.position}`)}</span>
                      {lv && <span className="text-amber-400/80 text-xs">({T(lang, labelZh, labelEn)})</span>}
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{cl.text}</p>
                  </div>
                )
              })}
            </div>
          </SectionDrawer>
        )}

        {d.variant && d.variantInsight && (
          <SectionDrawer icon="🔄" title={T(lang, '之卦走向', 'Variant Direction')}>
            <div className="text-[var(--text-secondary)] text-sm leading-relaxed ziwei-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.variantInsight}</ReactMarkdown>
            </div>
          </SectionDrawer>
        )}

        {d.advice && (
          <StreamingSection icon="💡" title={T(lang, '指導建議', 'Guidance')} content={d.advice} streaming={streaming} dotAnimName="dotPulseIC" />
        )}
      </div>
      <style jsx global>{`
        @keyframes dotPulseIC {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ ④ FOOTER — key points + QA ═══ */}
      {d.keyPoints && d.keyPoints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-gold font-serif text-base mb-2">🔑 {T(lang, '要點', 'Key Points')}</h3>
          <div className="grid gap-2">
            {d.keyPoints.map((pt, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/20 flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] flex items-center justify-center flex-shrink-0 font-serif">{i + 1}</span>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{pt}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <XuanjiChatCard readingResult={rawResult || ''} readingType="iching" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />
    </div>
  )
}
