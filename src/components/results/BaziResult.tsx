'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'

interface TenGodEntry { stem: string; god: string }
interface Pillar {
  stem: string; branch: string; element: string; nayin: string
  hiddenStems?: string[]
  tenGods?: TenGodEntry[]
  changSheng?: string
  kongWang?: string[]
  shenSha?: ShenShaEntry[]
}
interface TrueSolarTimeInfo {
  originalTime: string; correctedTime: string; correctionMinutes: number
  longitude: number; shichen: string; shichenChanged: boolean
}
interface ShenShaEntry { name: string; description: string }
interface DaYunEntry {
  stem: string; branch: string; nayin: string
  startAge: number; startYear: number; endAge: number; endYear: number
}
interface XiaoYunEntry { stem: string; branch: string; age: number; year: number }
interface QiYunInfo {
  direction: string; startAge: number; startAgeLabel: string
  startYear: number; startMonth: number
  nearestJieQi: string; nearestJieQiDate: string; daysDiff: number
}
interface BaziData {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: { stem: string; element: string; yinYang?: string; strength: string; strengthLabel: string }
  fiveElements: { metal: number; wood: number; water: number; fire: number; earth: number }
  luckyElements: string[]
  avoidElements: string[]
  sections: { overview: string; career: string; marriage: string; wealth: string; health: string; periods: string }
  keyAdvice: string[]
  luckyInfo: { numbers: number[]; colors: string[]; directions: string[] }
  shenSha?: ShenShaEntry[]
  trueSolarTime?: TrueSolarTimeInfo
  daYun?: DaYunEntry[]
  xiaoYun?: XiaoYunEntry[]
  qiYun?: QiYunInfo
}

const STEM_ELEMENT_MAP: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}
const BRANCH_ELEMENT_MAP: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}
// Get element for any Chinese character (stem or branch)
const charElement = (ch: string): string => STEM_ELEMENT_MAP[ch] || BRANCH_ELEMENT_MAP[ch] || ''

// Refined five-element colors — inspired by traditional Chinese aesthetics
const elClr: Record<string, string> = {
  金: 'text-amber-200',     木: 'text-emerald-400',  水: 'text-sky-400',
  火: 'text-rose-400',      土: 'text-yellow-600',
  metal: 'text-amber-200',  wood: 'text-emerald-400', water: 'text-sky-400',
  fire: 'text-rose-400',    earth: 'text-yellow-600',
}
const elBg: Record<string, string> = {
  金: 'bg-amber-200/10 border-amber-200/30',   木: 'bg-emerald-400/10 border-emerald-400/30',
  水: 'bg-sky-400/10 border-sky-400/30',        火: 'bg-rose-400/10 border-rose-400/30',
  土: 'bg-yellow-600/10 border-yellow-600/30',
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
  { key: 'daYunDetail', label: '大運精批', en: 'Life Phases', icon: '🔮' },
]

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

export default function BaziResult({ data, isShared, rawResult, readingId, chatMessages }: { data: Record<string, unknown>; isShared?: boolean; rawResult?: string; readingId?: string | null; chatMessages?: { role: 'user' | 'assistant'; content: string }[] }) {
  const d = data as unknown as BaziData
  const { lang } = useLang()
  const [activeSection, setActiveSection] = useState('overview')
  const [showChart, setShowChart] = useState(false)
  const [showExtra, setShowExtra] = useState(false)

  const pillars = [
    { label: '年柱', en: 'Year', data: d.pillars?.year },
    { label: '月柱', en: 'Month', data: d.pillars?.month },
    { label: '日柱', en: 'Day', data: d.pillars?.day },
    { label: '時柱', en: 'Hour', data: d.pillars?.hour },
  ]

  const fe = d.fiveElements || {}
  const feEntries: [string, number][] = [
    ['木', fe.wood || 0], ['火', fe.fire || 0], ['土', fe.earth || 0], ['金', fe.metal || 0], ['水', fe.water || 0],
  ]
  const feMax = Math.max(...feEntries.map(([, v]) => v), 1)
  const tst = d.trueSolarTime

  // Collect all shenSha
  const allPillarShenSha = pillars.some(p => (p.data?.shenSha?.length || 0) > 0)

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ═══ CHART DATA (Collapsible, default collapsed) ═══ */}
      <button onClick={() => setShowChart(!showChart)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm"
        style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)', color: 'var(--gold)' }}>
        <span className="font-serif flex items-center gap-2">☰ {T(lang, '八字排盤', 'BaZi Chart')}</span>
        <motion.span animate={{ rotate: showChart ? 180 : 0 }} transition={{ duration: 0.2 }}>▼</motion.span>
      </button>

      <AnimatePresence initial={false}>
      {showChart && (
        <motion.div
          initial={lang === 'en' ? { height: 0, opacity: 0 } : false}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3 overflow-hidden max-w-[calc(100vw-2rem)]"
        >

      {/* ═══ COMPACT FOUR PILLARS TABLE ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-2 sm:p-4 border border-gold/20">

        {/* True Solar Time — tiny indicator */}
        {tst && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <span className="text-blue-400 text-[10px]">🕐</span>
            <span className="text-white/40 text-[10px]">
              {tst.originalTime} → {tst.correctedTime} ({tst.correctionMinutes >= 0 ? '+' : ''}{tst.correctionMinutes.toFixed(0)}min)
            </span>
            {tst.shichenChanged && <span className="text-amber-400 text-[10px]">{T(lang, '⚠️時辰已變', '⚠️ Hour shifted')}</span>}
          </div>
        )}

        {/* Table-style pillars */}
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <td className="text-white/30 text-[10px] sm:text-xs py-1 w-12 sm:w-16"></td>
              {pillars.map(p => (
                <td key={p.label} className="text-white/50 text-[10px] sm:text-xs py-1 font-medium">
                  {T(lang, p.label, p.en)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Row: 主星 (Ten God of stem) */}
            <tr className="border-t border-white/5">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '主星', 'God')}</td>
              {pillars.map(({ label, data: p }) => {
                const god = label === '日柱' ? T(lang, '日主', 'Self') : p?.tenGods?.[0]?.god || ''
                return <td key={label} className="text-white/60 text-[10px] sm:text-xs py-1">{god}</td>
              })}
            </tr>
            {/* Row: 天干 */}
            <tr className="border-t border-white/10">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '天干', 'Stem')}</td>
              {pillars.map(({ label, data: p }) => {
                const stemEl = charElement(p?.stem || '')
                return (
                  <td key={label} className="py-1.5">
                    <span className={`text-lg sm:text-xl font-serif font-bold ${elClr[stemEl] || 'text-white'}`}>
                      {p?.stem || '?'}
                    </span>
                  </td>
                )
              })}
            </tr>
            {/* Row: 地支 */}
            <tr className="border-t border-white/10">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '地支', 'Branch')}</td>
              {pillars.map(({ label, data: p }) => {
                const branchEl = charElement(p?.branch || '')
                return (
                  <td key={label} className="py-1.5">
                    <span className={`text-lg sm:text-xl font-serif font-bold ${elClr[branchEl] || 'text-white'}`}>
                      {p?.branch || '?'}
                    </span>
                  </td>
                )
              })}
            </tr>
            {/* Row: 藏干 */}
            <tr className="border-t border-white/5">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '藏干', 'Hidden')}</td>
              {pillars.map(({ label, data: p }) => (
                <td key={label} className="text-white/40 text-[10px] py-1 leading-tight">
                  {(p?.hiddenStems || []).map((hs, i) => {
                    const hEl = STEM_ELEMENT_MAP[hs] || ''
                    return <span key={i} className={`${elClr[hEl] || 'text-white/40'}`}>{hs}{hEl} </span>
                  })}
                </td>
              ))}
            </tr>
            {/* Row: 副星 (hidden stem gods) */}
            <tr className="border-t border-white/5">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '副星', 'Sub')}</td>
              {pillars.map(({ label, data: p }) => (
                <td key={label} className="text-white/30 text-[10px] py-1 leading-tight">
                  {(p?.tenGods || []).slice(1).map((tg, i) => (
                    <div key={i}>{tg.god}</div>
                  ))}
                </td>
              ))}
            </tr>
            {/* Row: 十二长生 */}
            <tr className="border-t border-white/5">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '長生', 'Stage')}</td>
              {pillars.map(({ label, data: p }) => (
                <td key={label} className="text-white/40 text-[10px] py-1">{p?.changSheng || ''}</td>
              ))}
            </tr>
            {/* Row: 纳音 */}
            <tr className="border-t border-white/5">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '納音', 'Nayin')}</td>
              {pillars.map(({ label, data: p }) => (
                <td key={label} className="text-white/30 text-[10px] py-1">{p?.nayin || ''}</td>
              ))}
            </tr>
            {/* Row: 空亡 */}
            <tr className="border-t border-white/5">
              <td className="text-white/30 text-[10px] py-1">{T(lang, '空亡', 'Void')}</td>
              {pillars.map(({ label, data: p }) => (
                <td key={label} className="text-white/30 text-[10px] py-1">{(p?.kongWang || []).join('')}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </motion.div>

      {/* ═══ COMPACT: Day Master + Five Elements + Lucky/Avoid ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="glass-card rounded-xl p-3 sm:p-4 border border-gold/20">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Day Master badge */}
          <div className="text-center flex-shrink-0">
            <div className={`text-2xl sm:text-3xl font-serif font-bold ${elClr[d.dayMaster?.element || '']}`}>
              {d.dayMaster?.stem}
            </div>
            <div className={`text-[10px] ${elClr[d.dayMaster?.element || '']}`}>
              {d.dayMaster?.yinYang || ''}{d.dayMaster?.element}
            </div>
            <div className="mt-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-[10px]">
              {d.dayMaster?.strengthLabel || d.dayMaster?.strength}
            </div>
          </div>

          {/* Five Elements bars */}
          <div className="flex-1 space-y-1">
            {feEntries.map(([el, count]) => (
              <div key={el} className="flex items-center gap-1.5">
                <span className={`w-4 text-[10px] ${elClr[el]}`}>{el}</span>
                <div className="flex-1 bg-navy-900 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${elBar[el]}`} style={{ width: `${(count / feMax) * 100}%` }} />
                </div>
                <span className="text-white/40 text-[10px] w-4 text-right">{count}</span>
              </div>
            ))}
          </div>

          {/* Lucky/Avoid compact */}
          <div className="flex-shrink-0 text-right space-y-1">
            <div>
              <span className="text-white/40 text-[10px]">{T(lang, '喜', 'Lucky')}: </span>
              {(d.luckyElements || []).map(el => (
                <span key={el} className={`text-[10px] sm:text-xs font-bold ${elClr[el] || ''}`}>{el}</span>
              ))}
            </div>
            <div>
              <span className="text-white/40 text-[10px]">{T(lang, '忌', 'Avoid')}: </span>
              {(d.avoidElements || []).map(el => (
                <span key={el} className="text-red-400 text-[10px] sm:text-xs font-bold">{el}</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ COLLAPSIBLE: Shen Sha + Da Yun + Xiao Yun ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <button onClick={() => setShowExtra(!showExtra)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all"
          style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-2">
            {T(lang, '📋 神煞 · 大運 · 小運', '📋 Spirits · Da Yun · Xiao Yun')}
          </span>
          <motion.span animate={{ rotate: showExtra ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gold">▼</motion.span>
        </button>

        <AnimatePresence>
        {showExtra && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden space-y-3 mt-2"
          >
            {/* Shen Sha per pillar */}
            {(allPillarShenSha || (d.shenSha && d.shenSha.length > 0)) && (
              <div className="glass-card rounded-xl p-3 border border-gold/20 overflow-hidden">
                <h3 className="text-gold font-serif text-xs mb-2">{T(lang, '神煞', 'Shen Sha')}</h3>
                {allPillarShenSha ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['year','month','day','hour'] as const).map(key => {
                      const p = d.pillars[key]
                      const ss = p?.shenSha || []
                      const label = lang === 'en' ? (key === 'year' ? 'Year' : key === 'month' ? 'Month' : key === 'day' ? 'Day' : 'Hour') : (key === 'year' ? '年' : key === 'month' ? '月' : key === 'day' ? '日' : '時')
                      return (
                        <div key={key}>
                          <div className="text-white/40 text-[10px] mb-1">{label}</div>
                          <div className="flex flex-wrap gap-0.5">
                            {ss.length > 0 ? ss.map((s, i) => (
                              <span key={i} className="group relative px-1.5 py-0.5 rounded border border-gold/20 bg-gold/5 text-gold text-[10px] cursor-default">
                                {s.name}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-navy-800 border border-gold/30 rounded text-white/70 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  {s.description}
                                </span>
                              </span>
                            )) : <span className="text-white/15 text-[10px]">—</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {d.shenSha!.map((ss, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded border border-gold/20 bg-gold/5 text-gold text-[10px]">{ss.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Da Yun */}
            {d.daYun && d.daYun.length > 0 && (
              <div className="glass-card rounded-xl p-3 border border-gold/20 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gold font-serif text-xs">{T(lang, '大運', 'Da Yun')}</h3>
                  {d.qiYun && (
                    <span className="text-white/30 text-[9px]">
                      {d.qiYun.direction} · {d.qiYun.startAgeLabel}{T(lang, '起運', ' start')}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-1.5 min-w-max">
                    {d.daYun.map((dy, i) => {
                      const el = STEM_ELEMENT_MAP[dy.stem] || ''
                      return (
                        <div key={i} className={`rounded-lg border px-2 py-1.5 text-center min-w-[60px] ${elBg[el] || 'border-gold/20'}`}>
                          <div className="text-white/30 text-[9px]">{dy.startAge}-{dy.endAge}</div>
                          <div className="text-sm font-serif font-bold">
                            <span className={elClr[charElement(dy.stem)] || 'text-white'}>{dy.stem}</span>
                            <span className={elClr[charElement(dy.branch)] || 'text-white'}>{dy.branch}</span>
                          </div>
                          <div className="text-white/20 text-[9px]">{dy.startYear}-{dy.endYear}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Xiao Yun */}
            {d.xiaoYun && d.xiaoYun.length > 0 && (
              <div className="glass-card rounded-xl p-3 border border-gold/20 overflow-hidden">
                <h3 className="text-gold font-serif text-xs mb-2">{T(lang, '小運（起運前）', 'Xiao Yun')}</h3>
                <div className="flex flex-wrap gap-1">
                  {d.xiaoYun.map((xy, i) => (
                    <div key={i} className="px-1.5 py-1 rounded border border-white/10 bg-white/5 text-center">
                      <div className="text-white/20 text-[8px]">{xy.age}{T(lang, '歲', '')}</div>
                      <div className="text-xs font-serif">
                        <span className={elClr[charElement(xy.stem)] || 'text-white/60'}>{xy.stem}</span>
                        <span className={elClr[charElement(xy.branch)] || 'text-white/60'}>{xy.branch}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>

        </motion.div>
      )}
      </AnimatePresence>

      {/* ═══ SECTIONS TABS (Analysis) ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex flex-wrap gap-1 mb-3">
          {sectionsList.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${activeSection === s.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/60 hover:text-gold border border-gold/20'}`}>
              {s.icon} {lang === 'en' ? s.en : s.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <div className="glass-card rounded-xl p-4 sm:p-5 border border-gold/20 text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
              {d.sections?.[activeSection as keyof typeof d.sections] || T(lang, '暫無內容', 'No content')}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Key Advice */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif text-sm mb-2">{T(lang, '核心建議', 'Key Advice')}</h3>
          <div className="grid gap-2">
            {d.keyAdvice.map((advice, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/20 flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] flex items-center justify-center flex-shrink-0 font-serif">{i + 1}</span>
                <p className="text-white/80 text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ XUANJI Q&A ═══ */}
      <XuanjiChatCard readingResult={rawResult || ''} readingType="bazi" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.1} />

      {/* Lucky Info */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="glass-card rounded-xl p-3 border border-gold/20">
          <div className="flex flex-wrap gap-4 text-xs">
            {d.luckyInfo.numbers?.length > 0 && (
              <div><span className="text-white/40">{T(lang, '幸運數:', 'Lucky #:')}</span> <span className="text-gold">{d.luckyInfo.numbers.join(', ')}</span></div>
            )}
            {d.luckyInfo.colors?.length > 0 && (
              <div><span className="text-white/40">{T(lang, '幸運色:', 'Colors:')}</span> <span className="text-gold">{d.luckyInfo.colors.join(', ')}</span></div>
            )}
            {d.luckyInfo.directions?.length > 0 && (
              <div><span className="text-white/40">{T(lang, '吉方位:', 'Directions:')}</span> <span className="text-gold">{d.luckyInfo.directions.join(', ')}</span></div>
            )}
          </div>
        </motion.div>
      )}

    </div>
  )
}
