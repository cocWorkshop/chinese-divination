'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import PersonInfoHeader from './PersonInfoHeader'
import SectionDrawer from './SectionDrawer'
import { useDragScroll } from '@/hooks/useDragScroll'
import type { DivinationResultProps, BaziDataV2, ShenShaEntry, LiuNianEntry } from '@/types/divination'
import { T } from '@/lib/i18n'

const STEM_ELEMENT_MAP: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}
const BRANCH_ELEMENT_MAP: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}
const charElement = (ch: string): string => STEM_ELEMENT_MAP[ch] || BRANCH_ELEMENT_MAP[ch] || ''

const ELEMENT_ICON: Record<string, string> = {
  木: '🪵', 火: '🔥', 土: '⛰️', 金: '🪙', 水: '💧',
}

const elClr: Record<string, string> = {
  金: 'text-amber-200', 木: 'text-emerald-400', 水: 'text-sky-400',
  火: 'text-rose-400', 土: 'text-yellow-600',
}
const elBar: Record<string, string> = {
  木: 'bg-emerald-400', 火: 'bg-rose-400', 土: 'bg-yellow-600', 金: 'bg-amber-200', 水: 'bg-sky-400',
}

const sectionsList = [
  { key: 'overview', label: '總覽', en: 'Overview', icon: '☰' },
  { key: 'career', label: '事業', en: 'Career', icon: '💼' },
  { key: 'marriage', label: '婚姻', en: 'Marriage', icon: '💕' },
  { key: 'wealth', label: '財運', en: 'Wealth', icon: '💰' },
  { key: 'health', label: '健康', en: 'Health', icon: '🌿' },
]

export default function BaziResultV2({ data, isShared, rawResult, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const d = data as unknown as BaziDataV2
  const { lang } = useLang()
  // Chart-only (排盤) reading: the chart fields are present but there are no
  // LLM-written sections, so hide the section drawers and the Q&A card.
  const isPaipan = Boolean((data as { paipanOnly?: boolean }).paipanOnly)
  // Reveal the Xuanji Q&A only after streaming completes (the 3 auto-generated
  // suggested questions are ready by then); hide it during streaming.
  const qaReady = !streaming
  const liuNianScroll = useDragScroll<HTMLDivElement>()

  const pillars = [
    { label: '年柱', en: 'Year', data: d.pillars?.year },
    { label: '月柱', en: 'Month', data: d.pillars?.month },
    { label: '日柱', en: 'Day', data: d.pillars?.day },
    { label: '時柱', en: 'Hour', data: d.pillars?.hour },
  ]

  // 命宫/身宫/胎元 rendered as extra columns AHEAD of the four pillars (only
  // those with computed pillar data show). `palaceCount` marks where the
  // visual divider before 年柱 goes.
  const palaceColumns = [
    { label: '命宮', en: 'Life', data: d.ownSignPillar },
    { label: '身宮', en: 'Body', data: d.bodySignPillar },
    { label: '胎元', en: 'Fetal', data: d.fetalOriginPillar },
  ].filter(c => c.data)
  const palaceCount = palaceColumns.length
  const tableColumns = [...palaceColumns, ...pillars]

  const fe = d.fiveElements || {}
  const feEntries: [string, number][] = [
    ['木', fe.wood || 0], ['火', fe.fire || 0], ['土', fe.earth || 0], ['金', fe.metal || 0], ['水', fe.water || 0],
  ]
  const feMax = Math.max(...feEntries.map(([, v]) => v), 1)
  const tst = d.trueSolarTime
  const allPillarShenSha = pillars.some(p => (p.data?.shenSha?.length || 0) > 0)
  const br = d.branchRelationships

  return (
    <div className="space-y-3 sm:space-y-4 overflow-x-auto">

      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ FORMATION BADGE + DAY MASTER ═══
          Mobile-first layout: stacked sections (day master row, formation,
          five-elements bars, lucky/avoid + extras). On sm+ the day master
          badge floats left and the rest stacks alongside it. The previous
          3-column flex squashed badly on phones. */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 sm:p-4 border border-gold/20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4">
          {/* Day Master badge — full row on mobile, fixed col on sm+ */}
          <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-start gap-3 sm:gap-1 sm:flex-shrink-0 sm:w-16">
            <div className="flex flex-col items-center">
              <div className={`text-3xl font-serif font-bold ${elClr[d.dayMaster?.element || '']}`}>
                {d.dayMaster?.stem}
              </div>
              <div className={`text-[10px] ${elClr[d.dayMaster?.element || '']}`}>
                {d.dayMaster?.yinYang || ''}{d.dayMaster?.element}
              </div>
              <div className="mt-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-[10px] whitespace-nowrap">
                {d.dayMaster?.strengthLabel || d.dayMaster?.strength}
              </div>
            </div>

            {/* Mobile-only: Lucky/Avoid inline next to day master */}
            <div className="sm:hidden flex flex-col items-end text-right space-y-0.5 flex-1 min-w-0">
              <div>
                <span className="text-[var(--text-muted)] text-[10px]">{T(lang, '喜', 'Lucky')}: </span>
                {(d.luckyElements || []).map(el => (
                  <span key={el} className={`text-xs font-bold ${elClr[el] || ''}`}>{el}</span>
                ))}
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-[10px]">{T(lang, '忌', 'Avoid')}: </span>
                {(d.avoidElements || []).map(el => (
                  <span key={el} className="text-red-400 text-xs font-bold">{el}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Formation + Five Elements */}
          <div className="flex-1 space-y-2 min-w-0">
            {d.formation && (
              <div className="group relative">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/30">
                  <span className="text-gold font-serif text-xs font-bold">{d.formation.name}</span>
                </div>
                {d.formation.analysis && (
                  <div className="mt-1.5 text-[var(--text-secondary)] text-xs leading-relaxed break-words">
                    {d.formation.analysis}
                  </div>
                )}
              </div>
            )}

            {d.seasonalNote && (
              <div className="text-[var(--text-muted)] text-xs italic leading-relaxed break-words">
                {d.seasonalNote}
              </div>
            )}

            <div className="space-y-1">
              {feEntries.map(([el, count]) => (
                <div key={el} className="flex items-center gap-1.5">
                  <span className={`w-4 text-[10px] ${elClr[el]}`}>{el}</span>
                  <div className="flex-1 bg-navy-900 rounded-full h-1.5 min-w-0">
                    <div className={`h-1.5 rounded-full ${elBar[el]}`} style={{ width: `${(count / feMax) * 100}%` }} />
                  </div>
                  <span className="text-[var(--text-muted)] text-[10px] w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lucky/Avoid + Extras — sm+ only (mobile shows lucky/avoid inline above) */}
          <div className="hidden sm:block flex-shrink-0 text-right space-y-1">
            <div>
              <span className="text-[var(--text-muted)] text-[10px]">{T(lang, '喜', 'Lucky')}: </span>
              {(d.luckyElements || []).map(el => (
                <span key={el} className={`text-xs font-bold ${elClr[el] || ''}`}>{el}</span>
              ))}
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-[10px]">{T(lang, '忌', 'Avoid')}: </span>
              {(d.avoidElements || []).map(el => (
                <span key={el} className="text-red-400 text-xs font-bold">{el}</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ BRANCH RELATIONSHIPS (if any) ═══ */}
      {br && (br.clashes.length > 0 || br.combines.length > 0 || br.harms.length > 0 || br.punishments.length > 0 || (br.triCombines?.length ?? 0) > 0 || (br.threeWayMeets?.length ?? 0) > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
          className="glass-card rounded-xl p-3 border border-gold/20">
          <h3 className="text-gold font-serif text-xs mb-2">{T(lang, '地支關係', 'Branch Relationships')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {br.clashes.map((c, i) => (
              <span key={`clash-${i}`} className="px-2 py-0.5 rounded border border-red-400/30 bg-red-400/10 text-red-400 text-[10px]">
                {c.branch1}{c.branch2} {T(lang, '冲', 'Clash')} ({T(lang, c.pillar1 === 'year' ? '年' : c.pillar1 === 'month' ? '月' : c.pillar1 === 'day' ? '日' : '時', c.pillar1)}-{T(lang, c.pillar2 === 'year' ? '年' : c.pillar2 === 'month' ? '月' : c.pillar2 === 'day' ? '日' : '時', c.pillar2)})
              </span>
            ))}
            {br.combines.map((c, i) => (
              <span key={`combine-${i}`} className="px-2 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[10px]">
                {c.branch1}{c.branch2} {T(lang, '合', 'Combine')} → {c.result}
              </span>
            ))}
            {br.harms.map((h, i) => (
              <span key={`harm-${i}`} className="px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-400 text-[10px]">
                {h.branch1}{h.branch2} {T(lang, '害', 'Harm')}
              </span>
            ))}
            {br.punishments.map((p, i) => (
              <span key={`punish-${i}`} className="px-2 py-0.5 rounded border border-rose-400/30 bg-rose-400/10 text-rose-400 text-[10px]">
                {p.branches.join('')} {T(lang, '刑', 'Punish')} ({p.type})
              </span>
            ))}
            {br.triCombines?.map((t, i) => (
              <span key={`tricombine-${i}`} className="px-2 py-0.5 rounded border border-teal-400/30 bg-teal-400/10 text-teal-400 text-[10px]">
                {t.branches.join('')} {T(lang, t.kind === 'full' ? '三合' : t.kind === 'half' ? '半三合' : '拱合', t.kind === 'full' ? 'Tri-Combine' : t.kind === 'half' ? 'Half Tri' : 'Gong')} → {t.element}
              </span>
            ))}
            {br.threeWayMeets?.map((t, i) => (
              <span key={`trimeet-${i}`} className="px-2 py-0.5 rounded border border-sky-400/30 bg-sky-400/10 text-sky-400 text-[10px]">
                {t.branches.join('')} {T(lang, t.kind === 'full' ? '三會' : '半會', t.kind === 'full' ? 'Tri-Meet' : 'Half Meet')} → {t.direction}{t.element}
              </span>
            ))}
          </div>
          {d.branchAnalysis && (
            <p className="mt-2 text-[var(--text-secondary)] text-xs leading-relaxed">{d.branchAnalysis}</p>
          )}
        </motion.div>
      )}

      {/* ═══ CHART DATA — top-level drawer, defaults open, centered title ═══
          The chart is the centerpiece of a bazi reading; rendering it open
          on first paint makes the four pillars / shensha / xiao yun
          immediately visible without an extra tap. The centered title
          announces this drawer as the chart category, distinct from the
          left-aligned analysis section drawers below. */}
      <SectionDrawer
        icon="🏛️"
        title={T(lang, '八字命盤', 'BaZi Chart')}
        align="center"
        size="lg"
      >
        <div className="space-y-3">
          {/* Four Pillars Table */}
          <motion.div className="glass-card rounded-xl p-2 sm:p-4 border border-gold/20">
            {tst && (
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-blue-400 text-[10px]">🕐</span>
                <span className="text-[var(--text-muted)] text-[10px]">
                  {tst.originalTime} → {tst.correctedTime} ({tst.correctionMinutes >= 0 ? '+' : ''}{tst.correctionMinutes.toFixed(0)}min)
                </span>
                {tst.shichenChanged && <span className="text-amber-400 text-[10px]">{T(lang, '⚠️時辰已變', '⚠️ Hour shifted')}</span>}
              </div>
            )}
            <div className="overflow-x-auto">
            <table className={`w-full text-center border-collapse ${palaceCount > 0 ? 'min-w-[520px]' : ''}`}>
              <thead>
                <tr>
                  <td className="text-[var(--text-muted)] text-[10px] sm:text-xs py-1 w-12 sm:w-16"></td>
                  {tableColumns.map((p, ci) => (
                    <td key={p.label} className={`text-[10px] sm:text-xs py-1 font-medium ${ci < palaceCount ? 'text-gold/80' : 'text-[var(--text-secondary)]'}${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                      {T(lang, p.label, p.en)}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '主星', 'God')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => {
                    const god = label === '日柱' ? T(lang, '日主', 'Self') : p?.tenGods?.[0]?.god || ''
                    return <td key={label} className={`text-[var(--text-secondary)] text-[10px] sm:text-xs py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{god}</td>
                  })}
                </tr>
                <tr className="border-t border-[var(--text-muted)]/10">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '天干', 'Stem')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => {
                    const el = charElement(p?.stem || '')
                    return (
                      <td key={label} className={`py-1.5${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                        <span className={`text-lg sm:text-xl font-serif font-bold ${elClr[el]}`}>{p?.stem || '?'}</span>
                        {el && <span className="text-[10px] ml-0.5 opacity-70" aria-label={el}>{ELEMENT_ICON[el]}</span>}
                      </td>
                    )
                  })}
                </tr>
                <tr className="border-t border-[var(--text-muted)]/10">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '地支', 'Branch')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => {
                    const el = charElement(p?.branch || '')
                    return (
                      <td key={label} className={`py-1.5${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                        <span className={`text-lg sm:text-xl font-serif font-bold ${elClr[el]}`}>{p?.branch || '?'}</span>
                        {el && <span className="text-[10px] ml-0.5 opacity-70" aria-label={el}>{ELEMENT_ICON[el]}</span>}
                      </td>
                    )
                  })}
                </tr>
                <tr className="border-t border-white/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '藏干', 'Hidden')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[10px] py-1 leading-tight${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                      {(p?.hiddenStems || []).map((hs, i) => (
                        <span key={i} className={elClr[STEM_ELEMENT_MAP[hs] || ''] || 'text-[var(--text-muted)]'}>{hs} </span>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-white/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '副星', 'Sub')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1 leading-tight${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                      {(p?.tenGods || []).slice(1).map((tg, i) => <div key={i}>{tg.god}</div>)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-white/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '長生', 'Stage')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{p?.changSheng || ''}</td>
                  ))}
                </tr>
                <tr className="border-t border-white/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '納音', 'Nayin')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{p?.nayin || ''}</td>
                  ))}
                </tr>
                <tr className="border-t border-white/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '空亡', 'Void')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{(p?.kongWang || []).join('')}</td>
                  ))}
                </tr>
                {allPillarShenSha && (
                  <tr className="border-t border-white/5">
                    <td className="text-[var(--text-muted)] text-[10px] py-1 align-top">{T(lang, '神煞', 'Spirits')}</td>
                    {tableColumns.map(({ label, data: p }, ci) => {
                      const ss = p?.shenSha || []
                      return (
                        <td key={label} className={`py-1 align-top${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                          <div className="flex flex-col items-center gap-0.5">
                            {ss.length > 0 ? ss.map((s: ShenShaEntry, i: number) => (
                              <span key={i} className="group relative px-1 py-0.5 rounded border border-gold/20 bg-gold/5 text-gold text-[9px] cursor-default leading-none whitespace-nowrap">
                                {s.name}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-navy-800 border border-gold/30 rounded text-white/70 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  {s.description}
                                </span>
                              </span>
                            )) : <span className="text-[var(--text-muted)] text-[10px]">—</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </motion.div>

          {/* Da Yun + Xiao Yun — shown directly (no collapse) */}
          <div className="space-y-3">
              {d.daYun && d.daYun.length > 0 && (
                <div className="glass-card rounded-xl p-3 border border-gold/20">
                  <h3 className="text-gold font-serif text-xs mb-2 flex items-center gap-2">
                    {T(lang, '大運', 'Da Yun')}
                    {d.qiYun && (
                      <span className="text-[var(--text-muted)] text-[10px] font-normal">
                        {d.qiYun.direction} · {lang === 'en'
                          ? `starts 虛歲 ${d.daYun?.[0]?.startAge} (≈${d.qiYun.startAgeLabel})`
                          : `虛歲${d.daYun?.[0]?.startAge}起運（實歲${d.qiYun.startAgeLabel}）`}
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                    {d.daYun.map((dy, i) => {
                      const currentYear = new Date().getFullYear()
                      const isCurrent = currentYear >= dy.startYear && currentYear <= dy.endYear
                      return (
                        <div key={i} className={`flex-shrink-0 px-2 py-1.5 rounded border text-center min-w-[3rem] ${isCurrent ? 'border-gold ring-1 ring-gold/40 bg-gold/10' : 'border-gold/20 bg-white/5'}`}>
                          <div className="text-[var(--text-muted)] text-[10px]">{dy.startAge}-{dy.endAge}{T(lang, '歲', '')}</div>
                          <div className="text-sm font-serif">
                            <span className={elClr[charElement(dy.stem)] || ''}>{dy.stem}</span>
                            <span className={elClr[charElement(dy.branch)] || ''}>{dy.branch}</span>
                          </div>
                          <div className="text-[var(--text-muted)] text-[9px]">{dy.startYear}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {d.xiaoYun && d.xiaoYun.length > 0 && (
                <div className="glass-card rounded-xl p-3 border border-gold/20">
                  <h3 className="text-gold font-serif text-xs mb-2">{T(lang, '小運（起運前）', 'Xiao Yun')}</h3>
                  <div className="flex flex-wrap gap-1">
                    {d.xiaoYun.map((xy, i) => (
                      <div key={i} className="px-2 py-1.5 rounded border border-gold/20 bg-white/5 text-center">
                        <div className="text-[var(--text-muted)] text-[10px]">{xy.age}{T(lang, '歲', '')}</div>
                        <div className="text-sm font-serif">
                          <span className={elClr[charElement(xy.stem)] || ''}>{xy.stem}</span>
                          <span className={elClr[charElement(xy.branch)] || ''}>{xy.branch}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </SectionDrawer>

      {/* ═══ OVERVIEW — main text, NOT a drawer ═══
          Overview is the lede of the reading; it's always-visible main
          prose, not collapsible. Other sections (career/marriage/...) are
          drawers below. During streaming this block also shows the
          typing-dot + blur placeholder. */}
      {!isPaipan && (() => {
        const overview = d.sections?.overview
        const hasContent = typeof overview === 'string' && overview.trim().length > 0
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 pt-2 border-t border-gold/10 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}
          >
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <span aria-hidden>☰</span>
              <span>{T(lang, '總覽', 'Overview')}</span>
              {streaming && !hasContent && (
                <span className="inline-flex gap-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseV2_1.4s_ease_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseV2_1.4s_ease_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseV2_1.4s_ease_0.4s_infinite]" />
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

      {/* ═══ OTHER SECTIONS — drawer style (all default-open) ═══
          Each remaining section is its own collapsible drawer. Default
          is open so the full reading is visible top-to-bottom on first
          paint; users can collapse individually. During streaming the
          drawer header shows a typing-dot indicator and the body has a
          gaussian blur placeholder until content starts arriving. */}
      {!isPaipan && (
      <div className="space-y-2">
        {sectionsList.filter(s => s.key !== 'overview').map((s) => {
          const content = d.sections?.[s.key as keyof typeof d.sections]
          const hasContent = typeof content === 'string' && content.trim().length > 0
          return (
            <SectionDrawer
              key={s.key}
              icon={s.icon}
              title={lang === 'en' ? s.en : s.label}
              trailing={streaming && !hasContent ? (
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseV2_1.4s_ease_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseV2_1.4s_ease_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseV2_1.4s_ease_0.4s_infinite]" />
                </span>
              ) : undefined}
            >
              <div className={`text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown overflow-x-auto break-words transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
                {/* TL;DR summary badge */}
                {d.sectionSummaries?.[s.key as keyof (typeof d.sectionSummaries & object)] && (
                  <p className="text-xs mb-2 px-2 py-1 rounded-lg inline-block" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--gold)' }}>
                    {d.sectionSummaries[s.key as keyof typeof d.sectionSummaries]}
                  </p>
                )}
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
      )}
      <style jsx global>{`
        @keyframes dotPulseV2 {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ STRUCTURED DA YUN ANALYSIS ═══ */}
      {d.daYunAnalysis && d.daYunAnalysis.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif text-base mb-2 flex items-center gap-2">
            🔮 {T(lang, '大運精批', 'Da Yun Analysis')}
            {d.qiYun && (
              <span className="text-[var(--text-muted)] text-[9px] font-normal">
                {d.qiYun.direction} · {d.qiYun.startAgeLabel}{T(lang, '起運', ' start')}
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {d.daYunAnalysis.map((dy, i) => {
              const stemEl = charElement(dy.stem)
              const branchEl = charElement(dy.branch)
              return (
                <details key={i} className="glass-card rounded-xl border border-gold/20 group" open>
                  <summary className="flex items-center gap-3 px-3 py-2.5 cursor-pointer list-none">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-lg font-serif font-bold ${elClr[stemEl]}`}>{dy.stem}</span>
                      <span className={`text-lg font-serif font-bold ${elClr[branchEl]}`}>{dy.branch}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-muted)] text-xs">
                        {dy.startAge}-{dy.endAge}{T(lang, '歲', '')} ({dy.startYear}-{dy.endYear})
                      </div>
                    </div>
                    <motion.span className="text-gold text-xs flex-shrink-0 group-open:rotate-180 transition-transform">▼</motion.span>
                  </summary>
                  <div className="px-3 pb-3 space-y-2 border-t border-gold/10 pt-2.5">
                    {dy.theme && (
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-serif">{dy.theme}</p>
                    )}
                    {dy.interactions && (
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed">{dy.interactions}</p>
                    )}
                    {dy.keyYears && dy.keyYears.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[var(--text-muted)] text-xs font-medium">{T(lang, '關鍵流年', 'Key Years')}:</div>
                        {dy.keyYears.map((ky, j) => (
                          <div key={j} className="flex gap-2 items-start">
                            <span className="text-gold text-xs font-mono flex-shrink-0">{ky.year}</span>
                            <span className="text-[var(--text-secondary)] text-xs font-serif">{ky.ganZhi}</span>
                            <span className="text-[var(--text-muted)] text-xs">{ky.event}</span>
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
      {d.liuNian && d.liuNian.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <h3 className="text-gold font-serif text-base mb-2">{T(lang, '流年一覽', 'Annual Fortune')}</h3>
          <div className="glass-card rounded-xl p-3 border border-gold/20 overflow-hidden">
            <div ref={liuNianScroll.ref} onMouseDown={liuNianScroll.onMouseDown}
              className="overflow-x-auto scrollbar-hide cursor-grab">
              <div className="flex gap-0.5 min-w-max">
                {d.liuNian.map((ln: LiuNianEntry, i: number) => {
                  const currentYear = new Date().getFullYear()
                  const isCurrent = ln.year === currentYear
                  const dotColor = ln.isLucky === true ? 'bg-emerald-400' : ln.isLucky === false ? 'bg-rose-400' : 'bg-gray-500'
                  const borderStyle = isCurrent ? 'border-gold ring-1 ring-gold/50' : 'border-transparent'
                  return (
                    <div key={i} {...(isCurrent ? { 'data-scroll-target': true } : {})}
                      className={`group relative flex flex-col items-center px-1 py-1 rounded ${isCurrent ? 'bg-gold/10' : ''}`}>
                      {/* Dot */}
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} border ${borderStyle}`} />
                      {/* Year label (show every 5 years + current) */}
                      {(ln.year % 5 === 0 || isCurrent) ? (
                        <div className={`text-[8px] mt-0.5 ${isCurrent ? 'text-gold font-bold' : 'text-[var(--text-muted)]'}`}>
                          {ln.year}
                        </div>
                      ) : (
                        <div className="h-[12px]" />
                      )}
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-navy-800 border border-gold/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                        <div className="text-[10px] text-gold font-bold">{ln.year} ({ln.age}{T(lang, '歲', '')})</div>
                        <div className="text-[10px] font-serif">
                          <span className={elClr[charElement(ln.stem)] || ''}>{ln.stem}</span>
                          <span className={elClr[charElement(ln.branch)] || ''}>{ln.branch}</span>
                          <span className="text-[var(--text-muted)] ml-1">{ln.nayin}</span>
                        </div>
                        <div className="text-[9px] text-[var(--text-muted)]">
                          {ln.tenGod} · {ln.isLucky === true ? '✓ 喜用' : ln.isLucky === false ? '✗ 忌神' : '— 中性'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gold/10">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '喜用年', 'Lucky')}</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '忌神年', 'Avoid')}</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '中性', 'Neutral')}</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full border border-gold ring-1 ring-gold/50" /><span className="text-[9px] text-[var(--text-muted)]">{T(lang, '今年', 'This year')}</span></div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ KEY PREDICTIONS ═══ */}
      {d.keyPredictions && d.keyPredictions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-gold font-serif text-base mb-2">🎯 {T(lang, '關鍵預測', 'Key Predictions')}</h3>
          <div className="grid gap-2">
            {d.keyPredictions.map((pred: { age?: string; ageRange?: string; event: string; basis?: string; reason?: string }, i: number) => {
              // LLM output varies: age/basis (schema) vs ageRange/reason (observed). Accept both.
              const ageStr = pred.age || pred.ageRange || ''
              const basis = pred.basis || pred.reason || ''
              const isCurrent = ageStr.includes('當前') || ageStr.includes('当前') || ageStr.toLowerCase().includes('current')
              return (
                <div key={i} className={`glass-card rounded-xl p-3 border ${isCurrent ? 'border-gold/50 ring-1 ring-gold/20' : 'border-gold/20'}`}>
                  {ageStr && (
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isCurrent ? 'bg-gold/30 text-gold' : 'bg-gold/20 text-gold'}`}>{ageStr}</span>
                      {isCurrent && <span className="text-[10px] text-gold/80">📍</span>}
                    </div>
                  )}
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{pred.event}</p>
                  {basis && <p className="text-[var(--text-muted)] text-xs mt-1 italic leading-relaxed">{basis}</p>}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ KEY ADVICE ═══ */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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

      {/* ═══ XUANJI Q&A ═══ (only once streaming done + 3 auto questions ready) */}
      {!isPaipan && qaReady && <XuanjiChatCard readingResult={rawResult || ''} readingType="bazi" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />}

      {/* ═══ LUCKY INFO ═══ */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card rounded-xl p-3 border border-gold/20">
          <div className="flex flex-wrap gap-4 text-xs">
            {d.luckyInfo.colors?.length > 0 && (
              <div><span className="text-[var(--text-muted)]">{T(lang, '幸運色:', 'Lucky Colors:')}</span> <span className="text-gold">{d.luckyInfo.colors.join(', ')}</span></div>
            )}
            {d.luckyInfo.directions?.length > 0 && (
              <div><span className="text-[var(--text-muted)]">{T(lang, '吉方位:', 'Auspicious Directions:')}</span> <span className="text-gold">{d.luckyInfo.directions.join(', ')}</span></div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
