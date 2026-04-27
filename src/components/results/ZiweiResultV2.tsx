'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import PersonInfoHeader from './PersonInfoHeader'
import SectionDrawer from './SectionDrawer'
import { useDragScroll } from '@/hooks/useDragScroll'
import type { DivinationResultProps } from '@/types/divination'

// Reuse color maps from V1
const STEM_ELEMENT_MAP: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}
const charElement = (ch: string): string => STEM_ELEMENT_MAP[ch] || ''
const elClr: Record<string, string> = {
  金: 'text-amber-200', 木: 'text-emerald-400', 水: 'text-sky-400',
  火: 'text-rose-400', 土: 'text-yellow-600',
}

const mutagenColor: Record<string, string> = {
  '禄': 'text-green-400', '权': 'text-blue-400', '科': 'text-yellow-400', '忌': 'text-red-400',
}

const brightnessColor: Record<string, string> = {
  '庙': 'text-yellow-300', '旺': 'text-green-300', '得': 'text-blue-300',
  '利': 'text-cyan-300', '平': 'text-white/60', '不': 'text-white/40',
  '不得地': 'text-white/30', '闲': 'text-white/40', '陷': 'text-red-300',
}

const sectionsList = [
  { key: 'overview', label: '總覽', en: 'Overview', icon: '☰' },
  { key: 'personality', label: '性格', en: 'Personality', icon: '🪞' },
  { key: 'career', label: '事業', en: 'Career', icon: '💼' },
  { key: 'marriage', label: '婚姻', en: 'Marriage', icon: '💕' },
  { key: 'wealth', label: '財運', en: 'Wealth', icon: '💰' },
  { key: 'health', label: '健康', en: 'Health', icon: '🌿' },
  { key: 'family', label: '六親', en: 'Family', icon: '👨‍👩‍👧‍👦' },
]

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>

export default function ZiweiResultV2({ data, isShared, rawResult, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const d = data as AnyData
  const { lang } = useLang()
  const liuNianScroll = useDragScroll<HTMLDivElement>()

  const chart = d.ziweiChart || {}
  const formation = d.formation as { name: string; level: string; analysis: string } | undefined
  const daYunAnalysis = d.daYunAnalysis as AnyData[] | undefined
  const keyPredictions = d.keyPredictions as { age: string; event: string; basis: string }[] | undefined
  const liuNian = d.liuNian as { year: number; age: number; earthlyBranch: string; yearlyMutagen: string[]; huaLuPalace: string; huaJiPalace: string; isLucky: boolean | null }[] | undefined

  const levelColor = (level: string) => {
    if (level?.includes('上')) return { bg: 'rgba(234,179,8,0.2)', text: '#eab308', border: 'rgba(234,179,8,0.3)' }
    if (level?.includes('下') || level?.includes('凶')) return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }
    return { bg: 'rgba(59,130,246,0.2)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }
  }

  return (
    <div className="space-y-3 sm:space-y-4 overflow-hidden">

      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ FORMATION + BASIC INFO ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 sm:p-4 border border-gold/20">
        <div className="flex items-start gap-3">
          {/* Five Elements Class badge */}
          <div className="text-center flex-shrink-0">
            <div className="text-lg sm:text-xl font-serif font-bold text-gold">{chart.fiveElementsClass || ''}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{chart.zodiac || ''}</div>
            <div className="mt-1 text-[9px] text-[var(--text-muted)]">
              {T(lang, '命主', 'Soul')}: {chart.soul || ''}<br/>
              {T(lang, '身主', 'Body')}: {chart.body || ''}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {/* Formation badge */}
            {formation && (
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{
                  backgroundColor: levelColor(formation.level).bg,
                  border: `1px solid ${levelColor(formation.level).border}`,
                }}>
                  <span className="font-serif text-xs font-bold" style={{ color: levelColor(formation.level).text }}>
                    {formation.name}
                  </span>
                  <span className="text-[9px]" style={{ color: levelColor(formation.level).text }}>
                    （{formation.level}）
                  </span>
                </div>
                {formation.analysis && (
                  <p className="mt-1.5 text-[var(--text-secondary)] text-xs leading-relaxed">{formation.analysis}</p>
                )}
              </div>
            )}

            {/* Si Hua summary */}
            {chart.siHua && chart.siHua.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chart.siHua.map((sh: { star: string; type: string; palace: string }, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 rounded border border-gold/20 bg-white/5 text-[10px]">
                    <span className={mutagenColor[sh.type] || ''}>{sh.star}</span>
                    <span className={`font-bold ${mutagenColor[sh.type] || ''}`}>{T(lang, '化', '')}{sh.type}</span>
                    <span className="text-[var(--text-muted)]">→{sh.palace}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Patterns */}
            {d.patterns && d.patterns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {d.patterns.map((p: AnyData, i: number) => {
                  const lc = levelColor(p.level)
                  return (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}
                      title={p.description}>
                      {p.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══ CHART DATA — top-level drawer, defaults open, centered title ═══ */}
      {d.palaces && (
      <SectionDrawer
        icon="⭐"
        title={T(lang, '紫微命盤', 'Ziwei Chart')}
        align="center"
        size="lg"
      >
          <div className="text-[10px]">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-4 gap-0.5 min-w-[400px]">
                {Object.entries(d.palaces as Record<string, AnyData>).map(([name, palace]) => {
                  const majors = palace.majorStars || []
                  const minors = palace.minorStars || []
                  const isSoul = name === '命宫'
                  const isBody = palace.isBodyPalace
                  return (
                    <div key={name} className={`p-1.5 rounded border ${isSoul ? 'border-gold/50 bg-gold/5' : 'border-white/10 bg-white/5'}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-medium ${isSoul ? 'text-gold' : 'text-[var(--text-secondary)]'}`}>
                          {name}{isBody ? T(lang, '(身)', '(B)') : ''}
                        </span>
                        <span className="text-[var(--text-muted)] text-[8px]">{palace.earthlyBranch}</span>
                      </div>
                      <div className="space-y-0.5">
                        {majors.map((s: AnyData, i: number) => (
                          <div key={i} className="flex items-center gap-0.5">
                            <span className={`font-serif ${s.mutagen ? mutagenColor[s.mutagen] || '' : brightnessColor[s.brightness || ''] || 'text-white/80'}`}>
                              {s.name}
                            </span>
                            {s.brightness && <span className={`text-[8px] ${brightnessColor[s.brightness] || ''}`}>{s.brightness}</span>}
                            {s.mutagen && <span className={`text-[8px] font-bold ${mutagenColor[s.mutagen] || ''}`}>{s.mutagen}</span>}
                          </div>
                        ))}
                        {minors.slice(0, 3).map((s: AnyData, i: number) => (
                          <span key={i} className="text-[var(--text-muted)] text-[8px] mr-1">
                            {s.name}{s.mutagen ? `[${s.mutagen}]` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </SectionDrawer>
      )}

      {/* ═══ OVERVIEW — main text, NOT a drawer ═══ */}
      {(() => {
        const overview = d.sections?.overview
        const hasContent = typeof overview === 'string' && overview.trim().length > 0
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}
          >
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <span aria-hidden>☰</span>
              <span>{T(lang, '總覽', 'Overview')}</span>
              {streaming && !hasContent && (
                <span className="inline-flex gap-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_0.4s_infinite]" />
                </span>
              )}
            </h3>
            <div className="text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown break-words">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{overview}</ReactMarkdown>
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
          </motion.div>
        )
      })()}

      {/* ═══ OTHER SECTIONS — drawer style (all default-open) ═══ */}
      <div className="space-y-2">
        {sectionsList.filter(s => s.key !== 'overview').map((s) => {
          const content = d.sections?.[s.key]
          const hasContent = typeof content === 'string' && content.trim().length > 0
          return (
            <SectionDrawer
              key={s.key}
              icon={s.icon}
              title={lang === 'en' ? s.en : s.label}
              trailing={streaming && !hasContent ? (
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_0.4s_infinite]" />
                </span>
              ) : undefined}
            >
              <div className={`text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown overflow-x-auto break-words transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
                {hasContent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
        })}
      </div>
      <style jsx global>{`
        @keyframes dotPulseZW {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ STRUCTURED DA YUN ANALYSIS ═══ */}
      {daYunAnalysis && daYunAnalysis.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif text-base mb-2">🔮 {T(lang, '大限精批', 'Decade Fortune')}</h3>
          <div className="space-y-2">
            {daYunAnalysis.map((dy, i) => {
              const stemEl = charElement(dy.heavenlyStem || '')
              return (
                <details key={i} className="glass-card rounded-xl border border-gold/20 group" open={i === 0}>
                  <summary className="flex items-center gap-3 px-3 py-2.5 cursor-pointer list-none">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-lg font-serif font-bold ${elClr[stemEl] || ''}`}>{dy.heavenlyStem}{dy.earthlyBranch}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-muted)] text-[11px]">{dy.ageRange}{T(lang, '歲', '')}</div>
                    </div>
                    <motion.span className="text-gold text-xs flex-shrink-0 group-open:rotate-180 transition-transform">▼</motion.span>
                  </summary>
                  <div className="px-3 pb-3 space-y-2 border-t border-gold/10 pt-2.5">
                    {dy.theme && (
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-serif">{dy.theme}</p>
                    )}
                    {dy.siHuaOverlay && (
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                        <span className="text-gold">四化疊加：</span>{dy.siHuaOverlay}
                      </p>
                    )}
                    {dy.keyEvents && dy.keyEvents.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[var(--text-muted)] text-xs font-medium">{T(lang, '關鍵事件', 'Key Events')}:</div>
                        {dy.keyEvents.map((ke: AnyData, j: number) => (
                          <div key={j} className="flex gap-2 items-start">
                            <span className="text-gold text-xs font-mono flex-shrink-0">{ke.age}</span>
                            <span className="text-[var(--text-secondary)] text-xs">{ke.event}</span>
                            <span className="text-[var(--text-muted)] text-[11px] italic">({ke.basis})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {dy.advice && (
                      <div className="mt-1 px-2.5 py-2 rounded-lg bg-gold/5 border border-gold/20">
                        <span className="text-gold text-xs">💡 </span>
                        <span className="text-[var(--text-secondary)] text-sm leading-relaxed">{dy.advice}</span>
                      </div>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ LIU NIAN TIMELINE ═══ */}
      {liuNian && liuNian.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <h3 className="text-gold font-serif text-base mb-2">{T(lang, '流年一覽', 'Annual Fortune')}</h3>
          <div className="glass-card rounded-xl p-3 border border-gold/20 overflow-hidden">
            <div ref={liuNianScroll.ref} onMouseDown={liuNianScroll.onMouseDown}
              className="overflow-x-auto scrollbar-hide cursor-grab">
              <div className="flex gap-0.5 min-w-max">
                {liuNian.map((ln, i) => {
                  const currentYear = new Date().getFullYear()
                  const isCurrent = ln.year === currentYear
                  const dotColor = ln.isLucky === true ? 'bg-emerald-400' : ln.isLucky === false ? 'bg-rose-400' : 'bg-gray-500'
                  const borderStyle = isCurrent ? 'border-gold ring-1 ring-gold/50' : 'border-transparent'
                  return (
                    <div key={i} {...(isCurrent ? { 'data-scroll-target': true } : {})}
                      className={`group relative flex flex-col items-center px-1 py-1 rounded ${isCurrent ? 'bg-gold/10' : ''}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} border ${borderStyle}`} />
                      {(ln.year % 5 === 0 || isCurrent) ? (
                        <div className={`text-[8px] mt-0.5 ${isCurrent ? 'text-gold font-bold' : 'text-[var(--text-muted)]'}`}>
                          {ln.year}
                        </div>
                      ) : <div className="h-[12px]" />}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-navy-800 border border-gold/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                        <div className="text-[10px] text-gold font-bold">{ln.year} ({ln.age}{T(lang, '歲', '')})</div>
                        <div className="text-[9px] text-[var(--text-muted)]">
                          {T(lang, '流年命宮', 'Annual')}: {ln.earthlyBranch} |
                          {ln.isLucky === true ? ' ✓ 化禄入关键宫' : ln.isLucky === false ? ' ✗ 化忌入关键宫' : ' — 中性'}
                        </div>
                        <div className="text-[9px] text-[var(--text-muted)]">
                          {T(lang, '禄', 'Lu')}: {ln.huaLuPalace} | {T(lang, '忌', 'Ji')}: {ln.huaJiPalace}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gold/10">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '化禄入命/財/官', 'Lucky')}</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '化忌入命/財/官/夫妻', 'Caution')}</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '中性', 'Neutral')}</span></div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ KEY PREDICTIONS ═══ */}
      {keyPredictions && keyPredictions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-gold font-serif text-base mb-2">🎯 {T(lang, '關鍵預測', 'Key Predictions')}</h3>
          <div className="grid gap-2">
            {keyPredictions.map((pred, i) => {
              const isCurrent = pred.age.includes('當前') || pred.age.includes('当前') || pred.age.toLowerCase().includes('current')
              return (
                <div key={i} className={`glass-card rounded-xl p-3 border ${isCurrent ? 'border-gold/50 ring-1 ring-gold/20' : 'border-gold/20'}`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isCurrent ? 'bg-gold/30 text-gold' : 'bg-gold/20 text-gold'}`}>{pred.age}</span>
                    {isCurrent && <span className="text-[10px] text-gold/80">📍</span>}
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{pred.event}</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1 italic leading-relaxed">{pred.basis}</p>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ KEY ADVICE ═══ */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <h3 className="text-gold font-serif text-base mb-2">{T(lang, '核心建議', 'Key Advice')}</h3>
          <div className="grid gap-2">
            {d.keyAdvice.map((advice: string, i: number) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/20 flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] flex items-center justify-center flex-shrink-0 font-serif">{i + 1}</span>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ XUANJI Q&A ═══ */}
      <XuanjiChatCard readingResult={rawResult || ''} readingType="ziwei" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.14} />

      {/* ═══ LUCKY INFO ═══ */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="glass-card rounded-xl p-3 border border-gold/20">
          <div className="flex flex-wrap gap-4 text-xs">
            {d.luckyInfo.colors?.length > 0 && (
              <div><span className="text-[var(--text-muted)]">{T(lang, '幸運色:', 'Lucky Colors:')}</span> <span className="text-gold">{d.luckyInfo.colors.join(', ')}</span></div>
            )}
            {d.luckyInfo.directions?.length > 0 && (
              <div><span className="text-[var(--text-muted)]">{T(lang, '吉方位:', 'Directions:')}</span> <span className="text-gold">{d.luckyInfo.directions.join(', ')}</span></div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
