'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import SectionDrawer from './SectionDrawer'
import StreamingSection from './StreamingSection'
import PersonInfoHeader from './PersonInfoHeader'
import type { DivinationResultProps, FengshuiData } from '@/types/divination'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

const energyColor: Record<string, string> = {
  '旺': 'bg-green-400', '平': 'bg-yellow-400', '衰': 'bg-orange-400', '煞': 'bg-red-500',
}

interface FengshuiPalace {
  position: string; positionZh: string; gua: string
  baseStar: number; mountainStar: number; waterStar: number; element: string
}
interface FengshuiChart {
  period: number; periodLabel: string; facing: string; sitting: string
  palaces: FengshuiPalace[]; grid: (FengshuiPalace | null)[][]
  analysis: { wangShan: boolean; wangXiang: boolean; shuangWang: boolean; shanShuiTong: boolean; fuYin: boolean; fanYin: boolean }
}

const starColor = (n: number, period: number): string => {
  if (n === period) return 'text-emerald-400 font-bold'
  if (n === period + 1 || (period === 9 && n === 1)) return 'text-cyan-400'
  if (n === 5) return 'text-red-500'
  if (n === 2) return 'text-orange-400'
  if ([1, 4, 6, 8, 9].includes(n)) return 'text-gold/80'
  return 'text-[var(--text-muted)]'
}

export default function FengshuiResult({ data, isShared, rawResult, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const { lang } = useLang()
  const d = data as unknown as FengshuiData & { fengshuiChart?: FengshuiChart }
  const fsChart = d.fengshuiChart
  const facing = d.flyingStar?.facing || fsChart?.facing || ''

  return (
    <div className="space-y-4 sm:space-y-5">
      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ ① CHART — flying star grid + compass + formations ═══ */}
      {fsChart && fsChart.palaces && fsChart.palaces.length > 0 ? (
        <SectionDrawer icon="🏯" title={T(lang, '玄空飛星盤', 'Flying Star Chart')} align="center" size="lg">
          <div className="space-y-4">
            {/* Period + facing/sitting */}
            <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
              <span className="px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold font-serif">{fsChart.periodLabel}</span>
              <span className="text-[var(--text-secondary)] font-serif">{T(lang, '坐', 'Sit ')} {fsChart.sitting} → {T(lang, '向', 'Face ')} {fsChart.facing}</span>
            </div>

            {/* Detected formations */}
            {(fsChart.analysis.shuangWang || fsChart.analysis.wangShan || fsChart.analysis.wangXiang || fsChart.analysis.shanShuiTong || fsChart.analysis.fuYin || fsChart.analysis.fanYin) && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {fsChart.analysis.shuangWang && <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-400/15 border border-emerald-400/40 text-emerald-300">{T(lang, '雙星到向 · 上格', 'Double Wang · Top')}</span>}
                {!fsChart.analysis.shuangWang && fsChart.analysis.wangShan && <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-400/15 border border-emerald-400/40 text-emerald-300">{T(lang, '旺山', 'Wang Shan')}</span>}
                {!fsChart.analysis.shuangWang && fsChart.analysis.wangXiang && <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-400/15 border border-emerald-400/40 text-emerald-300">{T(lang, '旺向', 'Wang Xiang')}</span>}
                {fsChart.analysis.shanShuiTong && <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-400/15 border border-red-400/40 text-red-300">{T(lang, '上山下水 · 凶', 'Reversed · Bad')}</span>}
                {fsChart.analysis.fuYin && <span className="px-2 py-0.5 rounded-full text-[11px] bg-orange-400/15 border border-orange-400/40 text-orange-300">{T(lang, '伏吟', 'Fu Yin')}</span>}
                {fsChart.analysis.fanYin && <span className="px-2 py-0.5 rounded-full text-[11px] bg-orange-400/15 border border-orange-400/40 text-orange-300">{T(lang, '反吟', 'Fan Yin')}</span>}
              </div>
            )}

            {/* 3×3 palace grid */}
            <div className="grid grid-cols-3 gap-1.5 max-w-md mx-auto">
              {fsChart.grid.flat().map((palace, i) => {
                if (!palace) return <div key={i} className="aspect-square" />
                const isCenter = palace.position === 'Center'
                return (
                  <div key={i} className={`relative aspect-square rounded-lg border ${isCenter ? 'border-gold/50 bg-gold/10' : 'border-gold/20 bg-white/5'} p-1.5 flex flex-col`}>
                    <div className="flex items-start justify-between text-[10px] sm:text-xs leading-none">
                      <span className={starColor(palace.mountainStar, fsChart.period)}>{palace.mountainStar}</span>
                      <span className={starColor(palace.waterStar, fsChart.period)}>{palace.waterStar}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-xs sm:text-sm font-serif">
                      {palace.positionZh}<span className="ml-1 text-[var(--text-muted)] text-[10px]">{palace.gua}</span>
                    </div>
                    <div className="flex items-end justify-center text-[10px] sm:text-xs leading-none">
                      <span className={starColor(palace.baseStar, fsChart.period)}>{palace.baseStar}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)]">
              <span><span className="text-gold/80">↖</span> {T(lang, '山星', 'Mountain')}</span>
              <span><span className="text-gold/80">↗</span> {T(lang, '向星', 'Water')}</span>
              <span><span className="text-gold/80">↓</span> {T(lang, '運星', 'Period')}</span>
              <span><span className="text-emerald-400">●</span> {T(lang, '當令旺星', 'In-period')}</span>
              <span><span className="text-red-500">●</span> {T(lang, '五黃', '5-Yellow')}</span>
            </div>
          </div>
        </SectionDrawer>
      ) : (
        /* Fallback: compass visual + LLM flying star summary */
        <SectionDrawer icon="🏯" title={T(lang, '飛星盤', 'Flying Star Chart')} align="center" size="lg">
          <div className="space-y-4">
            {/* Compass visual */}
            {(() => {
              const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
              const ZH: Record<string, string> = { N:'北', NE:'東北', E:'東', SE:'東南', S:'南', SW:'西南', W:'西', NW:'西北' }
              const highlight = DIRS.find(dir => facing.includes(ZH[dir] || dir)) || null
              return (
                <div className="flex justify-center">
                  <div className="relative w-36 h-36">
                    <div className="absolute inset-0 rounded-full border-2 border-gold/30 flex items-center justify-center">
                      <div className="text-gold/40 text-xs font-serif">{T(lang, '羅盤', 'Compass')}</div>
                    </div>
                    {DIRS.map((dir, i) => {
                      const angle = i * 45
                      const rad = (angle - 90) * Math.PI / 180
                      const r = 46
                      const x = 50 + r * Math.cos(rad)
                      const y = 50 + r * Math.sin(rad)
                      const isHl = dir === highlight
                      return (
                        <div key={dir} className={`absolute text-xs font-serif transform -translate-x-1/2 -translate-y-1/2 ${isHl ? 'text-gold font-bold text-sm' : 'text-[var(--text-muted)]'}`} style={{ left: `${x}%`, top: `${y}%` }}>
                          {ZH[dir]}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            {facing && <div className="text-center text-[var(--text-secondary)] text-sm font-serif">{facing}</div>}
            {/* Star summary — compact flex cards */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: T(lang, '運期', 'Period'), value: d.flyingStar?.period },
                { label: T(lang, '山星', 'Mountain'), value: d.flyingStar?.mountainStar },
                { label: T(lang, '向星', 'Facing'), value: d.flyingStar?.waterStar },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-center min-w-[60px]">
                  <div className="text-[var(--text-muted)] text-[10px] mb-0.5 whitespace-nowrap">{label}</div>
                  <div className="text-gold font-serif text-xs sm:text-sm whitespace-nowrap">{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionDrawer>
      )}

      {/* ═══ ② OVERVIEW — overall, always visible ═══ */}
      {(() => {
        const content = d.sections?.overall
        const hasContent = typeof content === 'string' && content.trim().length > 0
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <span aria-hidden>🏯</span>
              <span>{T(lang, '整體格局', 'Overall Layout')}</span>
            </h3>
            <div className="text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown break-words">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
        <StreamingSection icon="💰" title={T(lang, '財位分析', 'Wealth Position')} content={d.sections?.wealth} streaming={streaming} dotAnimName="dotPulseFS" />
        <StreamingSection icon="🌿" title={T(lang, '健康能量', 'Health Energy')} content={d.sections?.health} streaming={streaming} dotAnimName="dotPulseFS" />
        <StreamingSection icon="💕" title={T(lang, '人際感情', 'Relationships')} content={d.sections?.relationships} streaming={streaming} dotAnimName="dotPulseFS" />
      </div>
      <style jsx global>{`
        @keyframes dotPulseFS {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ ④ ROOMS + REMEDIES — drawers ═══ */}
      {d.rooms && d.rooms.length > 0 && (
        <SectionDrawer icon="🏠" title={T(lang, '各室能量', 'Room Energy')}>
          <div className="space-y-3">
            {d.rooms.map((room, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex items-center gap-2 w-20 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${energyColor[room.energy] || 'bg-gray-400'}`} />
                  <span className="text-[var(--text-secondary)] text-sm">{room.room}</span>
                </div>
                <p className="text-[var(--text-muted)] text-xs leading-relaxed">{room.suggestion}</p>
              </div>
            ))}
          </div>
        </SectionDrawer>
      )}

      {d.remedies && d.remedies.length > 0 && (
        <SectionDrawer icon="⚡" title={T(lang, '化解方案', 'Remedies')}>
          <div className="space-y-2">
            {d.remedies.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-yellow-400 flex-shrink-0">⚡</span>
                <span className="text-[var(--text-muted)]">{r.issue}{T(lang, '：', ': ')}</span>
                <span className="text-[var(--text-secondary)]">{r.solution}</span>
              </div>
            ))}
          </div>
        </SectionDrawer>
      )}

      {/* ═══ ⑤ FOOTER — advice + QA ═══ */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif text-base mb-2">{T(lang, '核心建議', 'Key Advice')}</h3>
          <div className="grid gap-2">
            {d.keyAdvice.map((advice, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/20 flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] flex items-center justify-center flex-shrink-0 font-serif">{i + 1}</span>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <XuanjiChatCard readingResult={rawResult || ''} readingType="fengshui" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />
    </div>
  )
}
