'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import PersonInfoHeader from './PersonInfoHeader'
import SectionDrawer from './SectionDrawer'
import StreamingKeyPredictions from './StreamingKeyPredictions'
import StreamingKeyAdvice from './StreamingKeyAdvice'
import StreamingLuckyInfo from './StreamingLuckyInfo'
import type { DivinationResultProps, BaziDataV2, ShenShaEntry, LiuNianEntry, AnnualFortuneYear, DetailedAnnualFortunesMap } from '@/types/divination'
import { T } from '@/lib/i18n'
import {
  isDaYunUnlocked,
  FREE_DAYUN_LIMIT,
  generateLiuNianAnalysis,
  evaluateLiuNianLuck,
} from '@/lib/baziCalculator'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import {
  BaZiIcon,
  CareerIcon,
  MarriageIcon,
  WealthIcon,
  HealthIcon,
  ScrollIcon,
  KeyPredictionIcon,
  SparkleIcon,
  LockSealIcon,
  UnlockSealIcon,
  CloseIcon,
  RefreshIcon,
  MasterSageIcon,
} from '@/components/DivinationIcons'

const STEM_ELEMENT_MAP: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}
const BRANCH_ELEMENT_MAP: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}
const charElement = (ch: string): string => STEM_ELEMENT_MAP[ch] || BRANCH_ELEMENT_MAP[ch] || ''

const elClr: Record<string, string> = {
  金: 'text-amber-200',     木: 'text-emerald-400',  水: 'text-sky-400',
  火: 'text-rose-400',      土: 'text-yellow-600',
  metal: 'text-amber-200',  wood: 'text-emerald-400', water: 'text-sky-400',
  fire: 'text-rose-400',    earth: 'text-yellow-600',
}
const elBar: Record<string, string> = {
  金: 'bg-amber-300', 木: 'bg-emerald-500', 水: 'bg-sky-400', 火: 'bg-rose-500', 土: 'bg-yellow-600',
  metal: 'bg-amber-300', wood: 'bg-emerald-500', water: 'bg-sky-400', fire: 'bg-rose-500', earth: 'bg-yellow-600',
}

const sectionsList = [
  { key: 'overview', label: '總覽', en: 'Overview', icon: <BaZiIcon size={16} /> },
  { key: 'career', label: '事業', en: 'Career', icon: <CareerIcon size={16} /> },
  { key: 'marriage', label: '婚姻', en: 'Marriage', icon: <MarriageIcon size={16} /> },
  { key: 'wealth', label: '財運', en: 'Wealth', icon: <WealthIcon size={16} /> },
  { key: 'health', label: '健康', en: 'Health', icon: <HealthIcon size={16} /> },
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

  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number>(() => {
    if (!d.daYun || d.daYun.length === 0) return 0
    const currentYear = new Date().getFullYear()
    const currentIdx = d.daYun.findIndex(dy => currentYear >= dy.startYear && currentYear <= dy.endYear)
    return currentIdx >= 0 ? currentIdx : 0
  })

  const [unlockedDecades, setUnlockedDecades] = useState<number[]>(() => {
    const fromData = Array.isArray(d.unlockedDecades) ? d.unlockedDecades : []
    return Array.from(new Set([0, 1, 2, ...fromData]))
  })
  const [freeDaYunLimit, setFreeDaYunLimit] = useState<number>(FREE_DAYUN_LIMIT)
  const [unlockCost, setUnlockCost] = useState<number>(1)

  useEffect(() => {
    fetch('/api/credits')
      .then(r => (r.ok ? r.json() : null))
      .then(info => {
        if (typeof info?.rules?.freeDaYunLimit === 'number') setFreeDaYunLimit(info.rules.freeDaYunLimit)
        if (typeof info?.rules?.costDayunUnlock === 'number') setUnlockCost(info.rules.costDayunUnlock)
        else if (typeof info?.costs?.dayun_unlock === 'number') setUnlockCost(info.costs.dayun_unlock)
      })
      .catch(() => {})
  }, [])

  const [activeLiuNianYear, setActiveLiuNianYear] = useState<number | null>(null)
  const [detailedFortunes, setDetailedFortunes] = useState<DetailedAnnualFortunesMap>(() => {
    return (d.detailedAnnualFortunes || {}) as DetailedAnnualFortunesMap
  })
  const [generatingDecade, setGeneratingDecade] = useState<number | null>(null)
  const masterChat = useMasterChatActions()

  const handleAskMasterAboutDaYun = (decadeIdx: number, activeDaYun: any) => {
    if (!masterChat) return
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    masterChat.setShape('expanded')
    const dm = d.dayMaster?.stem || ''
    const prompt = T(
      lang,
      `請大師為我推究八字大運中的第【${decadeIdx + 1}】步大運【${activeDaYun.stem}${activeDaYun.branch}】（${activeDaYun.startAge}-${activeDaYun.endAge}歲，公曆${activeDaYun.startYear}-${activeDaYun.endYear}年）。我日主為【${dm}】，此步大運納音【${activeDaYun.nayin || ''}】。請為我解析此十年氣候生剋、行運喜忌，以及在事業、財運與人生轉折處的關鍵指引。`,
      `Master Xuanji, please analyze Step ${decadeIdx + 1} of my BaZi Major Life Cycles (Da Yun): 【${activeDaYun.stem}${activeDaYun.branch}】 (Ages ${activeDaYun.startAge}-${activeDaYun.endAge}, years ${activeDaYun.startYear}-${activeDaYun.endYear}). My Day Master is 【${dm}】, and this cycle's NaYin is 【${activeDaYun.nayin || ''}】. Please guide me on elemental interactions, favorable/unfavorable timing, career & wealth outlook, and turning points.`,
    )
    masterChat.sendMessage(prompt)
  }

  const handleAskMasterAboutLiuNian = (ln: LiuNianEntry, activeDaYun: any) => {
    if (!masterChat) return
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    masterChat.setShape('expanded')
    const dm = d.dayMaster?.stem || ''
    const prompt = T(
      lang,
      `請大師為我深度推演八字流年【${ln.year}年（${ln.stem}${ln.branch}）】（虛歲${ln.age}歲，十神【${ln.tenGod}】，納音【${ln.nayin}】）。當前大運為【${activeDaYun.stem}${activeDaYun.branch}】，我日主為【${dm}】。請為我解析此年歲運交鋒的具體吉凶象意、月份應期與趨吉避凶之策。`,
      `Master Xuanji, please provide a detailed reading for the Annual Year 【${ln.year} (${ln.stem}${ln.branch})】 (Nominal Age ${ln.age}, Ten God: 【${ln.tenGod}】, NaYin: 【${ln.nayin}】). The current Da Yun is 【${activeDaYun.stem}${activeDaYun.branch}】 and my Day Master is 【${dm}】. What are the key portents, critical months, and guidance for seizing auspicious opportunities and averting adversity?`,
    )
    masterChat.sendMessage(prompt)
  }

  const handleGenerateAnnualFortune = async (decadeIdx: number, activeDaYun: any) => {
    if (generatingDecade !== null) return
    if (!readingId) {
      toast.error(T(lang, '請先登入或保存占卜記錄後再推演流年精批', 'Please save reading to channel annual fortune'))
      return
    }
    setGeneratingDecade(decadeIdx)
    try {
      // Auto-unlock with credits if decade >= freeDaYunLimit and not yet unlocked
      if (!isDaYunUnlocked(decadeIdx, unlockedDecades, freeDaYunLimit)) {
        const unlockRes = await fetch('/api/credits/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dayun_unlock',
            decadeIndex: decadeIdx,
            readingId,
          }),
        })
        if (!unlockRes.ok) {
          if (unlockRes.status === 402) {
            toast.error(T(lang, '機緣點不足，請獲取更多機緣後重試', 'Insufficient Karma credits. Please acquire more credits.'))
          } else {
            toast.error(T(lang, '解鎖大運流年失敗，請稍後重試', 'Unlock failed. Please retry.'))
          }
          return
        }
        const unlockData = await unlockRes.json()
        if (!unlockData.success) {
          toast.error(T(lang, '解鎖大運流年失敗，請稍後重試', 'Unlock failed. Please retry.'))
          return
        }
        const nextUnlocked = unlockData.unlockedDecades || Array.from(new Set([...unlockedDecades, decadeIdx]))
        setUnlockedDecades(nextUnlocked)
      }

      const res = await fetch(`/api/readings/${readingId}/annual-fortune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bazi',
          decadeIndex: decadeIdx,
          decadeInfo: {
            startYear: activeDaYun.startYear,
            endYear: activeDaYun.endYear,
            startAge: activeDaYun.startAge,
            endAge: activeDaYun.endAge,
            stem: activeDaYun.stem,
            branch: activeDaYun.branch,
            nayin: activeDaYun.nayin,
            theme: d.daYunAnalysis?.[decadeIdx]?.theme,
          },
          lang,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed')
      }
      setDetailedFortunes(prev => ({
        ...prev,
        [`decade_${decadeIdx}`]: data.fortunes,
      }))
      const currentYear = new Date().getFullYear()
      const targetYear = data.fortunes.some((f: AnnualFortuneYear) => f.year === currentYear)
        ? currentYear
        : data.fortunes[0]?.year
      if (targetYear) setActiveLiuNianYear(targetYear)
      toast.success(T(lang, '本步大運十年流年深度精批已生成！', '10-Year annual fortunes channeled!'))
    } catch {
      toast.error(T(lang, '推演十年流年精批失敗，請稍後重試', 'Failed to generate annual fortunes. Please retry.'))
    } finally {
      setGeneratingDecade(null)
    }
  }

  const pillars = [
    { label: '年柱', en: 'Year', data: d.pillars?.year },
    { label: '月柱', en: 'Month', data: d.pillars?.month },
    { label: '日柱', en: 'Day', data: d.pillars?.day },
    { label: '時柱', en: 'Hour', data: d.pillars?.hour },
  ]

  // 命宫/身宫/胎元 rendered as extra columns AHEAD of the four pillars (only
  // those with computed pillar data show). `palaceCount` marks where the
  // visual divider before 年柱 goes.
  const makePalaceFallback = (p?: { stem: string; branch: string; nayin?: string; pillar?: string }) => {
    if (!p) return undefined
    return {
      stem: p.stem,
      branch: p.branch,
      element: charElement(p.stem),
      nayin: p.nayin || '',
      hiddenStems: [],
      tenGods: [],
      changSheng: '',
      kongWang: [],
      shenSha: [],
    }
  }

  const palaceColumns = [
    { label: '命宮', en: 'Life', data: d.ownSignPillar || makePalaceFallback(d.mingGong) },
    { label: '身宮', en: 'Body', data: d.bodySignPillar || makePalaceFallback(d.shenGong) },
    { label: '胎元', en: 'Fetal', data: d.fetalOriginPillar || makePalaceFallback(d.taiYuan) },
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
        className="card-quiet rounded-xl p-3 sm:p-4 border border-gold/20">
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
                  <div className="flex-1 bg-gold/15 rounded-full h-1.5 min-w-0">
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
          className="card-quiet rounded-xl p-3 border border-gold/20">
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
        icon={<BaZiIcon size={20} />}
        title={T(lang, '八字命盤', 'BaZi Chart')}
        align="center"
        size="lg"
      >
        <div className="space-y-3">
          {/* Four Pillars Table */}
          <motion.div className="card-quiet rounded-xl p-2 sm:p-4 border border-gold/20">
            {tst && (
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-gold/70 text-[10px]">真太陽時：</span>
                <span className="text-[var(--text-muted)] text-[10px]">
                  {tst.originalTime} → {tst.correctedTime} ({tst.correctionMinutes >= 0 ? '+' : ''}{tst.correctionMinutes.toFixed(0)}min)
                </span>
                {tst.shichenChanged && <span className="text-amber-400 text-[10px] border border-amber-400/30 px-1 py-0.2 rounded">{T(lang, '時辰已變', 'Hour shifted')}</span>}
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
                <tr className="border-t border-gold/10">
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
                      </td>
                    )
                  })}
                </tr>
                <tr className="border-t border-gold/10">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '藏干', 'Hidden')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[10px] py-1 leading-tight${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                      {(p?.hiddenStems || []).map((hs, i) => (
                        <span key={i} className={elClr[STEM_ELEMENT_MAP[hs] || ''] || 'text-[var(--text-muted)]'}>{hs} </span>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-line/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '副星', 'Sub')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1 leading-tight${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                      {(p?.tenGods || []).slice(1).map((tg, i) => <div key={i}>{tg.god}</div>)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-line/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '長生', 'Stage')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{p?.changSheng || ''}</td>
                  ))}
                </tr>
                <tr className="border-t border-line/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '納音', 'Nayin')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{p?.nayin || ''}</td>
                  ))}
                </tr>
                <tr className="border-t border-line/5">
                  <td className="text-[var(--text-muted)] text-[10px] py-1">{T(lang, '空亡', 'Void')}</td>
                  {tableColumns.map(({ label, data: p }, ci) => (
                    <td key={label} className={`text-[var(--text-muted)] text-[10px] py-1${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>{(p?.kongWang || []).join('')}</td>
                  ))}
                </tr>
                {allPillarShenSha && (
                  <tr className="border-t border-line/5">
                    <td className="text-[var(--text-muted)] text-[10px] py-1 align-top">{T(lang, '神煞', 'Spirits')}</td>
                    {tableColumns.map(({ label, data: p }, ci) => {
                      const ss = p?.shenSha || []
                      return (
                        <td key={label} className={`py-1 align-top${ci === palaceCount - 1 ? ' border-r border-gold/25' : ''}`}>
                          <div className="flex flex-col items-center gap-0.5">
                            {ss.length > 0 ? ss.map((s: ShenShaEntry, i: number) => (
                              <span key={i} className="group relative px-1 py-0.5 rounded border border-gold/20 bg-gold/5 text-gold text-[9px] cursor-default leading-none whitespace-nowrap">
                                {s.name}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-surface border border-gold/30 rounded text-foreground/70 text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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

          {/* Xiao Yun (pre-DaYun years, shown directly in chart drawer if present) */}
          {d.xiaoYun && d.xiaoYun.length > 0 && (
            <div className="card-quiet rounded-xl p-3 border border-gold/20">
              <h3 className="text-gold font-serif text-xs mb-2">{T(lang, '小運（起運前）', 'Xiao Yun')}</h3>
              <div className="flex flex-wrap gap-1">
                {d.xiaoYun.map((xy, i) => (
                  <div key={i} className="px-2 py-1.5 rounded border border-gold/20 bg-gold/5 text-center">
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
              <BaZiIcon size={18} />
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
              title={T(lang, s.label, s.en)}
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



      {/* ═══ DA YUN & 10-YEAR ANNUAL FORTUNE ═══ */}
      {d.daYun && d.daYun.length > 0 && (() => {
        const activeDaYun = d.daYun[selectedDaYunIndex] || d.daYun[0]
        const activeDaYunAnalysis = d.daYunAnalysis?.[selectedDaYunIndex]
        const isDecadeUnlocked = isDaYunUnlocked(selectedDaYunIndex, unlockedDecades, freeDaYunLimit)
        const luckyEls = d.luckyElements || []
        const avoidEls = d.avoidElements || []
        const dayBranch = d.pillars?.day?.branch || ''
        const decadeYears = (d.liuNian || [])
          .filter((ln: LiuNianEntry) => activeDaYun && ln.year >= activeDaYun.startYear && ln.year <= activeDaYun.endYear)
          .map((ln: LiuNianEntry) => ({
            ...ln,
            isLucky: (luckyEls.length > 0 || avoidEls.length > 0)
              ? evaluateLiuNianLuck(ln.stem, ln.branch, luckyEls, avoidEls, activeDaYun, dayBranch)
              : ln.isLucky,
          }))

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-gold font-serif text-base flex items-center gap-2">
                <KeyPredictionIcon size={16} className="text-gold" />
                <span>{T(lang, '大運排盤（點擊任一步大運展開十年流年）', 'Da Yun (Click decade to expand 10-yr annual fortunes)')}</span>
                {d.qiYun && (
                  <span className="text-[var(--text-muted)] text-xs font-normal">
                    {d.qiYun.direction} · {T(
                      lang,
                      `虛歲${d.daYun?.[0]?.startAge}起運（實歲${d.qiYun.startAgeLabel}）`,
                      `starts 虛歲 ${d.daYun?.[0]?.startAge} (≈${d.qiYun.startAgeLabel})`,
                    )}
                  </span>
                )}
              </h3>
            </div>

            <div className="card-quiet rounded-xl p-3 sm:p-4 border border-gold/20 space-y-3">
              {/* Horizontal DaYun Selection Strip */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 pt-2.5 pb-2.5">
                {d.daYun.map((dy, i) => {
                  const currentYear = new Date().getFullYear()
                  const isCurrent = currentYear >= dy.startYear && currentYear <= dy.endYear
                  const isSelected = i === selectedDaYunIndex
                  const isUnlocked = isDaYunUnlocked(i, unlockedDecades, freeDaYunLimit)

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedDaYunIndex(i)
                        setActiveLiuNianYear(null)
                      }}
                      className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg border text-center min-w-[3.5rem] transition-all relative ${
                        isSelected
                          ? 'border-gold ring-2 ring-gold/60 bg-gold/20 shadow-md scale-105 z-10'
                          : isCurrent
                          ? 'border-gold/60 ring-1 ring-gold/40 bg-gold/10 hover:bg-gold/15'
                          : 'border-gold/20 bg-foreground/5 hover:border-gold/40 hover:bg-foreground/10'
                      }`}
                    >
                      <div className="text-[var(--text-muted)] text-[10px]">{dy.startAge}-{dy.endAge}{T(lang, '歲', '')}</div>
                      <div className="text-sm font-serif font-bold">
                        <span className={elClr[charElement(dy.stem)] || ''}>{dy.stem}</span>
                        <span className={elClr[charElement(dy.branch)] || ''}>{dy.branch}</span>
                      </div>
                      <div className="text-[var(--text-muted)] text-[9px]">{dy.startYear}</div>
                      {/* Status tag */}
                      <div className="mt-0.5">
                        {i < freeDaYunLimit ? (
                          <span className="text-[8px] text-emerald-400">免</span>
                        ) : isUnlocked ? (
                          <span className="inline-flex items-center justify-center text-gold"><UnlockSealIcon size={11} color="#d4a853" /></span>
                        ) : (
                          <span className="inline-flex items-center justify-center text-amber-400"><LockSealIcon size={10} color="#e5c07b" /></span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* ═══ INTERACTIVE DECADE CONTAINER (Full-Width ZiWei-Style Vertical Flow) ═══ */}
              {activeDaYun && (
                <div className="pt-3 border-t border-gold/15 space-y-3">
                  {/* Decade Header Banner (Strictly Decade-Level Title & Master Inquiry) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gold/5 p-2.5 rounded-lg border border-gold/15">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-serif font-bold text-gold">
                        {T(lang, `第 ${selectedDaYunIndex + 1} 步大運：`, `Decade ${selectedDaYunIndex + 1}: `)}
                        <span className={elClr[charElement(activeDaYun.stem)] || ''}>{activeDaYun.stem}</span>
                        <span className={elClr[charElement(activeDaYun.branch)] || ''}>{activeDaYun.branch}</span>
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {activeDaYun.nayin} · {activeDaYun.startYear}-{activeDaYun.endYear}年 ({activeDaYun.startAge}-{activeDaYun.endAge}{T(lang, '歲', '')})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleAskMasterAboutDaYun(selectedDaYunIndex, activeDaYun)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 transition-all cursor-pointer font-serif font-medium"
                        title={T(lang, '向大師追問此大運十年格局', 'Consult Master on this decade')}
                      >
                        <MasterSageIcon size={12} color="var(--gold)" />
                        <span>{T(lang, '追問此大運', 'Ask Master')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Full-Width Decade Overview */}
                  <div className="space-y-2 px-0.5">
                    {activeDaYunAnalysis?.theme ? (
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-serif">
                        {activeDaYunAnalysis.theme}
                      </p>
                    ) : (
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-serif">
                        {T(
                          lang,
                          `此步大運逢「${activeDaYun.stem}${activeDaYun.branch}」主事，納音屬${activeDaYun.nayin}，管轄十年人生格局氣數，引動五行生克流通。`,
                          `Under ${activeDaYun.stem}${activeDaYun.branch} (${activeDaYun.nayin}), governing 10 years of personal transformation.`
                        )}
                      </p>
                    )}
                    {activeDaYunAnalysis?.interactions && (
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                        <span className="text-gold">{T(lang, '歲運生克：', 'Interactions: ')}</span>
                        {activeDaYunAnalysis.interactions}
                      </p>
                    )}
                    {activeDaYunAnalysis?.keyYears && activeDaYunAnalysis.keyYears.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[var(--text-muted)] text-xs font-medium">
                          {T(lang, '關鍵注意年份', 'Key Attention Years')}:
                        </div>
                        {activeDaYunAnalysis.keyYears.map((ky, j) => (
                          <div key={j} className="flex gap-2 items-start">
                            <span className="text-gold text-xs font-mono flex-shrink-0">{ky.year}</span>
                            <span className="text-[var(--text-secondary)] text-xs font-serif flex-shrink-0">{ky.ganZhi}</span>
                            <span className="text-[var(--text-secondary)] text-xs">{ky.event}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeDaYunAnalysis?.advice && (
                      <div className="mt-1 px-2.5 py-2 rounded-lg bg-gold/5 border border-gold/20">
                        <span className="text-[var(--text-secondary)] text-sm leading-relaxed">
                          {activeDaYunAnalysis.advice}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ═══ 10-YEAR ANNUAL FORTUNE FOR THIS DECADE ═══ */}
                  <div className="mt-3 pt-3 border-t border-gold/15 space-y-2.5">
                    {/* 10-Year Section Subheader Bar: Single Entry Point for Generating 10-Year Fortunes */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <span className="text-xs font-serif text-gold font-medium flex items-center gap-1.5">
                        <ScrollIcon size={13} className="text-gold flex-shrink-0" />
                        <span>{T(lang, '本大運十年流年（點選年份查看）', '10-Year Annual Fortunes (Click year to inspect)')}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {detailedFortunes[`decade_${selectedDaYunIndex}`] ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-serif font-medium">
                              <SparkleIcon size={11} color="currentColor" className="text-emerald-400 flex-shrink-0" />
                              <span>{T(lang, '十年流年精批已就緒', '10-Yr Fortunes Ready')}</span>
                            </span>
                            <button
                              onClick={() => handleGenerateAnnualFortune(selectedDaYunIndex, activeDaYun)}
                              disabled={generatingDecade === selectedDaYunIndex}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:text-gold border border-gold/20 hover:border-gold/40 flex-shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                              title={T(lang, '重新調用大模型推演本十年流年', 'Re-channel 10-year annual fortunes')}
                            >
                              <RefreshIcon size={10} />
                              <span>{T(lang, '重新推演', 'Re-channel')}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateAnnualFortune(selectedDaYunIndex, activeDaYun)}
                            disabled={generatingDecade === selectedDaYunIndex}
                            className="group pl-2.5 pr-1.5 py-1 rounded-lg bg-gradient-to-r from-[#d4a853] via-[#e5be6a] to-[#c99738] text-navy-950 hover:brightness-110 active:scale-[0.99] transition-all text-[11px] font-serif font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-gold/20 border border-[#f3d794]/50 flex-shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {generatingDecade === selectedDaYunIndex ? (
                              <span className="flex items-center gap-1.5 px-1">
                                <span className="w-2.5 h-2.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                                <span>{T(lang, '天機推演中…', 'Channeling…')}</span>
                              </span>
                            ) : (
                              <>
                                <SparkleIcon size={11} color="currentColor" className="transition-transform duration-300 group-hover:rotate-12 flex-shrink-0" />
                                <span>{T(lang, '生成十年流年精批', 'Generate 10-Yr Fortune')}</span>
                                <span className="px-1.5 py-0.2 rounded bg-black/15 border border-black/15 text-[10px] font-serif font-bold tracking-tight whitespace-nowrap">
                                  {isDecadeUnlocked
                                    ? T(lang, '免費 · 0點', 'Free · 0 pt')
                                    : T(lang, `✧ ${unlockCost}點機緣`, `✧ ${unlockCost} pt`)}
                                </span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 10-Year Buttons Grid (10 columns in one row on sm+, 5x2 on mobile) */}
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2.5 pb-2.5 px-1.5">
                      {decadeYears.map((ln: LiuNianEntry) => {
                        const isCurrentYear = ln.year === new Date().getFullYear()
                        const isSelectedYear = activeLiuNianYear === ln.year
                        const luckyBadge = ln.isLucky === true ? 'border-emerald-400 text-emerald-300' : ln.isLucky === false ? 'border-rose-400 text-rose-300' : 'border-gray-500 text-gray-300'
                        const hasAiFortune = Boolean(detailedFortunes[`decade_${selectedDaYunIndex}`]?.some(f => f.year === ln.year))

                        return (
                          <button
                            key={ln.year}
                            onClick={() => setActiveLiuNianYear(isSelectedYear ? null : ln.year)}
                            className={`p-1.5 rounded-lg border text-center transition-all relative ${
                              isSelectedYear
                                ? 'border-gold ring-2 ring-gold bg-gold/25 shadow-md scale-105 z-10'
                                : isCurrentYear
                                ? 'border-gold/60 bg-gold/10'
                                : 'border-gold/15 hover:border-gold/35 bg-gold/5'
                            }`}
                          >
                            {hasAiFortune && (
                              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold animate-pulse" title="精批已就绪" />
                            )}
                            <div className="text-[9px] text-[var(--text-muted)]">{ln.year}</div>
                            <div className="text-xs font-serif font-bold my-0.5">
                              <span className={elClr[charElement(ln.stem)] || ''}>{ln.stem}</span>
                              <span className={elClr[charElement(ln.branch)] || ''}>{ln.branch}</span>
                            </div>
                            <div className="text-[8px] text-gold/90 truncate">{ln.tenGod}</div>
                            <div className={`text-[8px] px-0.5 rounded border mt-0.5 ${luckyBadge}`}>
                              {ln.isLucky === true ? '喜' : ln.isLucky === false ? '忌' : '平'}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Expanded Annual Prediction Card (Full-Width below the 10-year row) */}
                    {activeLiuNianYear && (() => {
                      const ln = decadeYears.find((y: LiuNianEntry) => y.year === activeLiuNianYear)
                      if (!ln) return null
                      const decadeKey = `decade_${selectedDaYunIndex}`
                      const aiFortune = detailedFortunes[decadeKey]?.find(f => f.year === activeLiuNianYear)
                      const forecast = generateLiuNianAnalysis(d.dayMaster?.stem || '', ln, activeDaYun)

                      return (
                        <div className="p-3.5 rounded-lg bg-gold/10 border border-gold/30 space-y-3 animate-fadeIn">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-gold font-serif font-bold text-sm">
                                {ln.year}年 ({ln.age}{T(lang, '歲', '')}) · {ln.stem}{ln.branch}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-medium">
                                {ln.tenGod}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">{ln.nayin}</span>
                              {aiFortune ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                                  ✦ {T(lang, '玄機深度精批', 'Master Channeled')}
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold/80">
                                  {T(lang, '基礎運勢', 'Basic')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAskMasterAboutLiuNian(ln, activeDaYun)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 transition-all cursor-pointer font-serif font-medium"
                                title={T(lang, `向玄機大師追問 ${ln.year} 流年`, `Ask Master about ${ln.year}`)}
                              >
                                <MasterSageIcon size={11} color="var(--gold)" />
                                <span>{T(lang, `追問 ${ln.year} 流年`, `Ask ${ln.year}`)}</span>
                              </button>
                              <button
                                onClick={() => setActiveLiuNianYear(null)}
                                className="text-xs text-[var(--text-muted)] hover:text-gold px-1 cursor-pointer"
                              >
                                <CloseIcon size={12} />
                              </button>
                            </div>
                          </div>

                          {aiFortune ? (
                            /* ═══ FULL AI-CHANNELED ANNUAL FORTUNE ═══ */
                            <div className="space-y-3 text-xs">
                              {/* Theme & Overall Fortune */}
                              <div className="space-y-1.5 p-2.5 rounded-lg bg-[var(--accent-bg)] border border-gold/20">
                                <div className="text-gold font-serif font-bold text-xs flex items-center gap-1.5">
                                  <SparkleIcon size={12} className="text-gold" />
                                  <span>{aiFortune.theme}</span>
                                </div>
                                <p className="text-[var(--text-secondary)] leading-relaxed text-[12px] font-serif">
                                  {aiFortune.fortune}
                                </p>
                              </div>

                              {/* 4 Pillars of Life: Career, Wealth, Romance, Health */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {aiFortune.career && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <CareerIcon size={12} className="text-gold" />
                                      <span>{T(lang, '事業考運', 'Career & Study')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.career}</p>
                                  </div>
                                )}
                                {aiFortune.wealth && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <WealthIcon size={12} className="text-gold" />
                                      <span>{T(lang, '財帛營謀', 'Wealth & Finance')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.wealth}</p>
                                  </div>
                                )}
                                {aiFortune.romance && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <MarriageIcon size={12} className="text-gold" />
                                      <span>{T(lang, '姻緣人際', 'Love & Relationships')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.romance}</p>
                                  </div>
                                )}
                                {aiFortune.health && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <HealthIcon size={12} className="text-gold" />
                                      <span>{T(lang, '健康氣血', 'Health & Wellness')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.health}</p>
                                  </div>
                                )}
                              </div>

                              {/* Interactions & Advice */}
                              {aiFortune.interaction && (
                                <div className="flex items-start gap-1.5 text-[11px]">
                                  <span className="text-gold font-medium flex-shrink-0">{T(lang, '【歲運生克】', 'Interactions')}:</span>
                                  <span className="text-[var(--text-muted)] leading-relaxed">{aiFortune.interaction}</span>
                                </div>
                              )}
                              {aiFortune.advice && (
                                <div className="p-2 rounded bg-gold/10 border border-gold/25 text-[11px] text-gold leading-relaxed flex items-start gap-1.5">
                                  <ScrollIcon size={13} className="text-gold flex-shrink-0 mt-0.5" />
                                  <span>{aiFortune.advice}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* ═══ RULE-BASED FALLBACK (When AI fortune not yet generated) ═══ */
                            <div className="space-y-2 text-xs">
                              <div className="p-2.5 rounded bg-[var(--accent-bg)] border border-gold/15 space-y-1.5">
                                <div className="flex items-start gap-1.5">
                                  <span className="text-gold font-medium flex-shrink-0">{T(lang, '【年度重點】', 'Focus')}:</span>
                                  <span className="text-[var(--text-secondary)]">{forecast.focus}</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-gold font-medium flex-shrink-0">{T(lang, '【歲運生克】', 'Interaction')}:</span>
                                  <span className="text-[var(--text-muted)]">{forecast.stemBranchInteraction}</span>
                                </div>
                                <div className="text-[var(--text-secondary)] leading-relaxed pt-0.5">
                                  {forecast.forecast}
                                </div>
                                <div className="text-xs text-gold/90">
                                  {forecast.advice}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )
      })()}

      {/* ═══ KEY PREDICTIONS ═══ */}
      <StreamingKeyPredictions predictions={d.keyPredictions} streaming={streaming} delay={0.1} />

      {/* ═══ KEY ADVICE ═══ */}
      <StreamingKeyAdvice items={d.keyAdvice} streaming={streaming} delay={0.1} />

      {/* ═══ XUANJI Q&A ═══ (only once streaming done + 3 auto questions ready) */}
      {!isPaipan && qaReady && <XuanjiChatCard readingResult={rawResult || ''} readingType="bazi" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />}

      {/* ═══ LUCKY INFO ═══ */}
      <StreamingLuckyInfo luckyInfo={d.luckyInfo} streaming={streaming} delay={0.15} mode="inline" />
    </div>
  )
}
