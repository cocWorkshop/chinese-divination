'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { useLang } from '../LanguageContext'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import XuanjiChatCard from './XuanjiChatCard'
import PersonInfoHeader from './PersonInfoHeader'
import SectionDrawer from './SectionDrawer'
import StreamingKeyPredictions from './StreamingKeyPredictions'
import StreamingKeyAdvice from './StreamingKeyAdvice'
import StreamingLuckyInfo from './StreamingLuckyInfo'
import type { DivinationResultProps, AnnualFortuneYear, DetailedAnnualFortunesMap } from '@/types/divination'
import { T } from '@/lib/i18n'
import { isDaYunUnlocked, FREE_DAYUN_LIMIT } from '@/lib/baziCalculator'
import {
  ZiWeiIcon,
  PersonalityIcon,
  CareerIcon,
  MarriageIcon,
  WealthIcon,
  HealthIcon,
  FamilyIcon,
  KeyPredictionIcon,
  SparkleIcon,
  ScrollIcon,
  LockSealIcon,
  UnlockSealIcon,
  CloseIcon,
  RefreshIcon,
  MasterSageIcon,
} from '@/components/DivinationIcons'

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
  '禄': 'text-emerald-600 dark:text-green-400',
  '权': 'text-blue-600 dark:text-blue-400',
  '科': 'text-amber-600 dark:text-yellow-400',
  '忌': 'text-rose-600 dark:text-red-400',
}

const brightnessColor: Record<string, string> = {
  '庙': 'text-amber-600 dark:text-yellow-300',
  '旺': 'text-emerald-600 dark:text-green-300',
  '得': 'text-blue-600 dark:text-blue-300',
  '利': 'text-cyan-600 dark:text-cyan-300',
  '平': 'text-[var(--text-secondary)]',
  '不': 'text-[var(--text-muted)]',
  '不得地': 'text-[var(--text-muted)]',
  '闲': 'text-[var(--text-muted)]',
  '陷': 'text-rose-600 dark:text-red-300',
}

const sectionsList = [
  { key: 'overview', label: '總覽', en: 'Overview', icon: <ZiWeiIcon size={16} /> },
  { key: 'personality', label: '性格', en: 'Personality', icon: <PersonalityIcon size={16} /> },
  { key: 'career', label: '事業', en: 'Career', icon: <CareerIcon size={16} /> },
  { key: 'marriage', label: '婚姻', en: 'Marriage', icon: <MarriageIcon size={16} /> },
  { key: 'wealth', label: '財運', en: 'Wealth', icon: <WealthIcon size={16} /> },
  { key: 'health', label: '健康', en: 'Health', icon: <HealthIcon size={16} /> },
  { key: 'family', label: '六親', en: 'Family', icon: <FamilyIcon size={16} /> },
]


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>

export default function ZiweiResultV2({ data, isShared, rawResult, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const d = data as AnyData
  const { lang } = useLang()
  // Chart-only (排盤) reading: chart/palaces present but no LLM sections, so
  // hide the section drawers and the Q&A card.
  const isPaipan = Boolean((data as { paipanOnly?: boolean }).paipanOnly)
  // Reveal the Xuanji Q&A only after streaming completes (the 3 auto-generated
  // suggested questions are ready by then); hide it during streaming.
  const qaReady = !streaming

  const chart = d.ziweiChart || {}
  const formation = d.formation as { name: string; level: string; analysis: string } | undefined
  const daYunAnalysis = d.daYunAnalysis as AnyData[] | undefined
  const keyPredictions = d.keyPredictions as { age?: string; ageRange?: string; event: string; basis?: string; reason?: string }[] | undefined
  const liuNian = d.liuNian as { year: number; age: number; earthlyBranch: string; yearlyMutagen: string[]; huaLuPalace: string; huaJiPalace: string; isLucky: boolean | null }[] | undefined

  const [detailedFortunes, setDetailedFortunes] = useState<DetailedAnnualFortunesMap>(() => {
    return (d.detailedAnnualFortunes || {}) as DetailedAnnualFortunesMap
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

  const [generatingDecade, setGeneratingDecade] = useState<number | null>(null)
  const [activeDecadeYear, setActiveDecadeYear] = useState<{ decadeIdx: number; year: number } | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const masterChat = useMasterChatActions()

  // Build full 8-step 大限 list from deterministic decadalSiHua (or palace.decadal) merged with LLM daYunAnalysis
  const fullDaXianList: AnyData[] = useMemo(() => {
    const decadalFromRoot = Array.isArray(d.decadalSiHua) ? d.decadalSiHua : (Array.isArray(chart.decadalSiHua) ? chart.decadalSiHua : [])
    let baseDecades: { heavenlyStem: string; earthlyBranch: string; range: number[]; mutagen?: string[] }[] = decadalFromRoot
      .filter((dec: AnyData) => Array.isArray(dec?.range) && (dec.range[0] > 0 || dec.range[1] > 0))
      .sort((a: AnyData, b: AnyData) => a.range[0] - b.range[0])

    if (baseDecades.length === 0 && d.palaces) {
      const palaceList = Array.isArray(d.palaces) ? d.palaces : Object.values(d.palaces as Record<string, AnyData>)
      baseDecades = palaceList
        .filter((p: AnyData) => Array.isArray(p?.decadal?.range) && (p.decadal.range[0] > 0 || p.decadal.range[1] > 0))
        .map((p: AnyData) => ({
          heavenlyStem: p.decadal.heavenlyStem || '',
          earthlyBranch: p.decadal.earthlyBranch || p.earthlyBranch || '',
          range: p.decadal.range,
        }))
        .sort((a, b) => a.range[0] - b.range[0])
    }

    const analysisList = Array.isArray(daYunAnalysis) ? daYunAnalysis : []
    if (baseDecades.length === 0) return analysisList

    return baseDecades.slice(0, 8).map((dec, idx) => {
      const ageRange = `${dec.range[0]}-${dec.range[1]}`
      const matched = analysisList.find((a: AnyData) =>
        a?.ageRange === ageRange ||
        (a?.heavenlyStem === dec.heavenlyStem && a?.earthlyBranch === dec.earthlyBranch)
      ) || analysisList[idx] || {}
      return {
        ...matched,
        heavenlyStem: dec.heavenlyStem || matched.heavenlyStem || '',
        earthlyBranch: dec.earthlyBranch || matched.earthlyBranch || '',
        ageRange,
        startAge: dec.range[0],
        endAge: dec.range[1],
        mutagen: dec.mutagen,
      }
    })
  }, [d.decadalSiHua, chart.decadalSiHua, d.palaces, daYunAnalysis])

  const [selectedDaXianIndex, setSelectedDaXianIndex] = useState<number>(() => {
    const currentYear = new Date().getFullYear()
    const currentAge = (liuNian || []).find(l => l.year === currentYear)?.age
    if (!currentAge || fullDaXianList.length === 0) return 0
    const idx = fullDaXianList.findIndex((dy: AnyData) => {
      const [s, e] = (dy.ageRange || '').split('-').map((v: string) => parseInt(v.trim(), 10))
      return s && e && currentAge >= s && currentAge <= e
    })
    return idx >= 0 ? idx : 0
  })

  const GRID_POSITIONS = useMemo(() => [
    { row: 0, col: 0, branch: '巳' },
    { row: 0, col: 1, branch: '午' },
    { row: 0, col: 2, branch: '未' },
    { row: 0, col: 3, branch: '申' },
    { row: 1, col: 0, branch: '辰' },
    { row: 1, col: 3, branch: '酉' },
    { row: 2, col: 0, branch: '卯' },
    { row: 2, col: 3, branch: '戌' },
    { row: 3, col: 0, branch: '寅' },
    { row: 3, col: 1, branch: '丑' },
    { row: 3, col: 2, branch: '子' },
    { row: 3, col: 3, branch: '亥' },
  ], [])

  const branchToPalaceMap = useMemo(() => {
    const map: Record<string, { name: string; palace: AnyData }> = {}
    if (d.palaces) {
      if (Array.isArray(d.palaces)) {
        for (const p of d.palaces) {
          if (p?.earthlyBranch) map[p.earthlyBranch] = { name: p.name, palace: p }
        }
      } else {
        for (const [name, p] of Object.entries(d.palaces as Record<string, AnyData>)) {
          if (p?.earthlyBranch) map[p.earthlyBranch] = { name, palace: p }
        }
      }
    }
    if (chart?.palaces && Array.isArray(chart.palaces)) {
      for (const p of chart.palaces) {
        if (p?.earthlyBranch && !map[p.earthlyBranch]) {
          map[p.earthlyBranch] = { name: p.name, palace: p }
        }
      }
    }
    return map
  }, [d.palaces, chart?.palaces])

  const handleAskMasterAboutPalace = (palaceName: string, branch: string, majors: AnyData[]) => {
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    const starNames = majors.map((s: AnyData) => s.name).join('、') || (T(lang, '無正曜', 'unpaired'))
    const prompt = T(
      lang,
      `請玄機大師為我詳推紫微命盤中的【${palaceName}】（位於${branch}宮，坐${starNames}）。此宮位對我的人生格局與近期氣運有何深層啟示與指引？`,
      `Master Xuanji, please provide deep insight into my Zi Wei Dou Shu 【${palaceName} Palace】 at branch ${branch} (with stars: ${starNames}). How does this placement shape my life journey and path forward?`,
    )
    masterChat.setShape('expanded')
    masterChat.sendMessage(prompt)
  }

  const handleAskMasterAboutDaXian = (decadeIdx: number, dy: AnyData) => {
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    const prompt = T(
      lang,
      `請玄機大師為我詳批紫微命盤第 ${decadeIdx + 1} 大限【${dy.heavenlyStem || ''}${dy.earthlyBranch || ''}】（${dy.ageRange || ''}歲）。此十年大限四化引動、三方四正吉凶轉折與應對進退為何？`,
      `Master Xuanji, please provide an in-depth reading of my Zi Wei Dou Shu Decade ${decadeIdx + 1} 【${dy.heavenlyStem || ''}${dy.earthlyBranch || ''}】 (ages ${dy.ageRange || ''}). What are the major SiHua transformations, turning points, and guidance for this 10-year cycle?`,
    )
    masterChat.setShape('expanded')
    masterChat.sendMessage(prompt)
  }

  const handleAskMasterAboutZiweiLiuNian = (year: number, age: number, branch: string, dy: AnyData) => {
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    const prompt = T(
      lang,
      `請玄機大師為我詳批紫微命盤【${year}年（${age}歲，流年命宮在${branch}宮）】的流年運勢（所處大限：${dy.heavenlyStem || ''}${dy.earthlyBranch || ''}，${dy.ageRange || ''}歲）。該年在事業、財運、感情與健康上有何四化疊引與吉凶應期？`,
      `Master Xuanji, please analyze my Zi Wei Dou Shu annual fortune for 【${year} (age ${age}, Palace ${branch})】 during the ${dy.heavenlyStem || ''}${dy.earthlyBranch || ''} decade. What are the key career, wealth, relationship, and health dynamics for this year?`,
    )
    masterChat.setShape('expanded')
    masterChat.sendMessage(prompt)
  }

  const handleGenerateAnnualFortune = async (decadeIdx: number, dy: AnyData) => {
    if (generatingDecade !== null) return
    if (!readingId) {
      toast.error(T(lang, '請先登入或保存占卜記錄後再推演流年精批', 'Please save reading to channel annual fortune'))
      return
    }
    setGeneratingDecade(decadeIdx)
    const [startAge, endAge] = (dy.ageRange || '').split('-').map((s: string) => parseInt(s.trim(), 10))
    const decadeYears = (liuNian || []).filter(ln => (startAge && endAge ? ln.age >= startAge && ln.age <= endAge : false))
    const startYear = decadeYears[0]?.year || (new Date().getFullYear() + (startAge || 0) - 20)
    const endYear = decadeYears[decadeYears.length - 1]?.year || (startYear + 9)

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
            toast.error(T(lang, '解鎖大限流年失敗，請稍後重試', 'Unlock failed. Please retry.'))
          }
          return
        }
        const unlockData = await unlockRes.json()
        if (!unlockData.success) {
          toast.error(T(lang, '解鎖大限流年失敗，請稍後重試', 'Unlock failed. Please retry.'))
          return
        }
        const nextUnlocked = unlockData.unlockedDecades || Array.from(new Set([...unlockedDecades, decadeIdx]))
        setUnlockedDecades(nextUnlocked)
      }

      const res = await fetch(`/api/readings/${readingId}/annual-fortune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ziwei',
          decadeIndex: decadeIdx,
          decadeInfo: {
            startYear,
            endYear,
            startAge: startAge || 0,
            endAge: endAge || 0,
            stem: dy.heavenlyStem,
            branch: dy.earthlyBranch,
            theme: dy.theme,
            siHuaOverlay: dy.siHuaOverlay,
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
      if (targetYear) setActiveDecadeYear({ decadeIdx, year: targetYear })
      toast.success(T(lang, '本大限十年流年深度精批已生成！', 'Decade 10-year annual fortunes channeled!'))
    } catch (err) {
      toast.error(T(lang, '推演十年流年精批失敗，請稍後重試', 'Failed to generate annual fortunes. Please retry.'))
    } finally {
      setGeneratingDecade(null)
    }
  }

  const levelColor = (level: string) => {
    if (level?.includes('上')) return { bg: 'rgba(234,179,8,0.2)', text: '#eab308', border: 'rgba(234,179,8,0.3)' }
    if (level?.includes('下') || level?.includes('凶')) return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }
    return { bg: 'rgba(59,130,246,0.2)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }
  }

  return (
    <div className="space-y-3 sm:space-y-4 overflow-x-auto">

      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ FORMATION + BASIC INFO ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="card-quiet rounded-xl p-3 sm:p-4 border border-gold/20">
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
                  <span key={i} className="px-1.5 py-0.5 rounded border border-gold/20 bg-foreground/5 text-[10px]">
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

      {/* ═══ CHART DATA — Traditional 4x4 Ring Grid around Celestial Center Plate ═══ */}
      {(d.palaces || chart?.palaces) && (
        <SectionDrawer
          icon={<ZiWeiIcon size={20} />}
          title={T(lang, '紫微斗數天地盤', 'Ziwei Imperial Chart')}
          align="center"
          size="lg"
        >
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-gold/5 border border-gold/20 min-w-[540px]">
                {[0, 1, 2, 3].map((row) =>
                  [0, 1, 2, 3].map((col) => {
                    const isCenter = (row === 1 || row === 2) && (col === 1 || col === 2)
                    if (isCenter) {
                      if (row === 1 && col === 1) {
                        return (
                          <div
                            key={`center-${row}-${col}`}
                            className="col-span-2 row-span-2 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-gold/10 via-[var(--bg-surface)] to-gold/15 dark:from-surface/90 dark:via-background/95 dark:to-surface/90 border border-gold/30 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gold/5 blur-xl pointer-events-none" />
                            <h4 className="text-gold font-serif text-sm sm:text-base font-bold tracking-widest mb-1">
                              {T(lang, '紫微斗數 · 天地中堂', 'Zi Wei Dou Shu Plate')}
                            </h4>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)] mt-1 font-serif">
                              <span className="px-2 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold-dark dark:text-gold-light font-medium">
                                {T(lang, '命主', 'Soul')}：{chart.soul || '—'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold-dark dark:text-gold-light font-medium">
                                {T(lang, '身主', 'Body')}：{chart.body || '—'}
                              </span>
                              <span                           className="px-2 py-0.5 rounded bg-gold/10 border border-gold/25 text-gold-dark dark:text-gold-light font-medium">
                                {chart.fiveElementsClass || '五行局'}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] mt-2 space-y-0.5">
                              {chart.lunarDate && <div>{T(lang, '農曆', 'Lunar')}：{chart.lunarDate}</div>}
                              {chart.time && <div>{T(lang, '時辰', 'Time')}：{chart.time} ({chart.timeRange || ''})</div>}
                            </div>
                            <div className="text-[9px] text-gold/75 dark:text-gold/60 mt-2 font-serif">
                              {T(lang, '✦ 點選環繞各宮查看詳細星曜與大師追問 ✦', '✦ Click any palace for deep stars & Master inquiry ✦')}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }

                    const pos = GRID_POSITIONS.find((g) => g.row === row && g.col === col)
                    if (!pos) return <div key={`empty-${row}-${col}`} />

                    const pInfo = branchToPalaceMap[pos.branch]
                    const palaceName = pInfo?.name || pos.branch
                    const palace = pInfo?.palace || {}
                    const majors = palace.majorStars || []
                    const isSoul = palaceName.includes('命')
                    const isBody = palace.isBodyPalace || palaceName.includes('身')
                    const isSelected = selectedBranch === pos.branch

                    return (
                      <div
                        key={`cell-${pos.branch}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedBranch(isSelected ? null : pos.branch)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedBranch(isSelected ? null : pos.branch)
                          }
                        }}
                        className={`p-2 rounded-xl transition-all cursor-pointer select-none flex flex-col justify-between min-h-[92px] ${
                          isSelected
                            ? 'border-2 border-gold bg-gold/20 shadow-[0_0_16px_rgba(212,168,83,0.35)] scale-[1.02]'
                            : isSoul
                            ? 'border border-gold/60 bg-gold/10 hover:border-gold hover:bg-gold/15'
                            : 'border border-[var(--card-border)] bg-[var(--accent-bg)] hover:border-gold/40 hover:bg-gold/5'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-gold/10">
                          <span
                            className={`font-serif text-xs font-bold ${
                              isSelected || isSoul ? 'text-gold' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {palaceName}
                            {isBody && !palaceName.includes('身') ? (
                              <span className="text-[10px] text-jade ml-0.5">({T(lang, '身', 'B')})</span>
                            ) : null}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {palace.heavenlyStem || ''}{pos.branch}
                          </span>
                        </div>

                        <div className="space-y-0.5 my-1">
                          {majors.length > 0 ? (
                            majors.map((s: AnyData, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px] leading-tight">
                                <span
                                  className={`font-serif font-semibold ${
                                    s.mutagen
                                      ? mutagenColor[s.mutagen] || ''
                                      : brightnessColor[s.brightness || ''] || 'text-[var(--text-primary)]'
                                  }`}
                                >
                                  {s.name}
                                </span>
                                <div className="flex items-center gap-0.5 text-[9px]">
                                  {s.brightness && (
                                    <span className={brightnessColor[s.brightness] || ''}>
                                      {s.brightness}
                                    </span>
                                  )}
                                  {s.mutagen && (
                                    <span className={`px-1 rounded font-bold ${mutagenColor[s.mutagen] || ''} bg-gold/10`}>
                                      {s.mutagen}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] italic">
                              {T(lang, '借對宮照入', 'Mirrored')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gold/10 text-[9px] text-[var(--text-muted)]">
                          <span>{palace.changsheng12 || ''}</span>
                          <span>
                            {palace.decadal?.range?.length === 2
                              ? `${palace.decadal.range[0]}-${palace.decadal.range[1]}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Selected Palace Interactive Spotlight & Master Consultation Card */}
            <AnimatePresence>
              {selectedBranch && (() => {
                const pInfo = branchToPalaceMap[selectedBranch]
                if (!pInfo) return null
                const palace = pInfo.palace || {}
                const majors = palace.majorStars || []
                const minors = palace.minorStars || []
                const adjectives = palace.adjectiveStars || []
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 via-[var(--bg-surface)] to-gold/5 dark:via-surface shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-gold/15">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-serif font-bold text-gold">
                          【{pInfo.name} · {selectedBranch}宮】
                        </span>
                        {palace.heavenlyStem && (
                          <span className="px-2 py-0.5 rounded text-xs bg-gold/15 text-gold-dark dark:text-gold-light border border-gold/25 font-mono font-medium">
                            {palace.heavenlyStem}{selectedBranch}
                          </span>
                        )}
                        {palace.decadal?.range && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {T(lang, '大限歲數', 'Decade Age')}：{palace.decadal.range[0]} - {palace.decadal.range[1]} {T(lang, '歲', 'yo')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedBranch(null)}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 transition-colors"
                      >
                        {T(lang, '關閉聚焦', 'Close')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                      <div>
                        <div className="text-[var(--text-muted)] text-[11px] mb-1 font-serif">
                          {T(lang, '主星曜（十四正曜）', 'Major Stars (14 Major Stars)')}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {majors.length > 0 ? (
                            majors.map((s: AnyData, i: number) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded border border-gold/20 bg-gold/5 font-serif font-medium ${
                                  s.mutagen ? mutagenColor[s.mutagen] || '' : brightnessColor[s.brightness] || 'text-[var(--text-primary)]'
                                }`}
                              >
                                {s.name} {s.brightness ? `(${s.brightness})` : ''} {s.mutagen ? `[化${s.mutagen}]` : ''}
                              </span>
                            ))
                          ) : (
                            <span className="text-[var(--text-muted)]">{T(lang, '無正曜（借對宮看）', 'No Major Stars (Borrow Opposite)')}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[var(--text-muted)] text-[11px] mb-1 font-serif">
                          {T(lang, '輔佐煞曜（六吉六煞等）', 'Auxiliary & Sha Stars')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {minors.length > 0 ? (
                            minors.map((s: AnyData, i: number) => (
                              <span key={i} className="text-[var(--text-secondary)] text-[11px] mr-1">
                                {s.name}{s.mutagen ? `[${s.mutagen}]` : ''}
                              </span>
                            ))
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[var(--text-muted)] text-[11px] mb-1 font-serif">
                          {T(lang, '雜曜與長生神煞', 'Adjective Stars & 12 Stages')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {adjectives.length > 0 ? (
                            adjectives.slice(0, 6).map((s: AnyData, i: number) => (
                              <span key={i} className="text-[var(--text-muted)] text-[10px] mr-1">
                                {s.name}
                              </span>
                            ))
                          ) : null}
                          {palace.changsheng12 && (
                            <span className="text-amber-700 dark:text-amber-200/80 text-[10px]">
                              {T(lang, '長生', 'Stage')}：{palace.changsheng12}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Master Consultation Trigger */}
                    <div className="pt-2 border-t border-gold/15 flex items-center justify-between flex-wrap gap-2">
                      <p className="text-[11px] text-[var(--text-muted)] font-serif">
                        {T(lang, '想深入探尋此宮的吉凶玄機、流年吉凶或化解之法？', "Delve deeper into this palace's cosmic patterns and remedies?")}
                      </p>
                      <button
                        onClick={() => handleAskMasterAboutPalace(pInfo.name, selectedBranch, majors)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
                      >
                        <MasterSageIcon size={14} />
                        <span>{T(lang, `向玄機大師追問【${pInfo.name}】`, `Ask Master about ${pInfo.name}`)}</span>
                      </button>
                    </div>
                  </motion.div>
                )
              })()}
            </AnimatePresence>
          </div>
        </SectionDrawer>
      )}

      {/* ═══ OVERVIEW — main text, NOT a drawer ═══ */}
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
              <ZiWeiIcon size={18} />
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
      {!isPaipan && (
      <div className="space-y-2">
        {sectionsList.filter(s => s.key !== 'overview').map((s) => {
          const content = d.sections?.[s.key]
          const hasContent = typeof content === 'string' && content.trim().length > 0
          return (
            <SectionDrawer
              key={s.key}
              icon={s.icon}
              title={T(lang, s.label, s.en)}
              trailing={streaming && !hasContent ? (
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[dotPulseZW_1.4s_ease_0.4s_infinite]" />
                </span>
              ) : undefined}
            >
              <div className={`text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown overflow-x-auto break-words transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
                {d.sectionSummaries?.[s.key as keyof (typeof d.sectionSummaries & object)] && (() => {
                  const raw = (d.sectionSummaries as Record<string, string>)[s.key] || ''
                  const clean = raw.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, '').trim()
                  return (
                    <p className="text-xs mb-2.5 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border border-gold/20 bg-gold/5" style={{ color: 'var(--gold)' }}>
                      <SparkleIcon size={12} className="text-gold/80 flex-shrink-0" />
                      <span>{clean || raw}</span>
                    </p>
                  )
                })()}
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
        @keyframes dotPulseZW {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ DA XIAN & 10-YEAR ANNUAL FORTUNE (BaZi-Unified 8-Step Selector & 10-Year Inspector) ═══ */}
      {fullDaXianList && fullDaXianList.length > 0 && (() => {
        const i = selectedDaXianIndex < fullDaXianList.length ? selectedDaXianIndex : 0
        const dy = fullDaXianList[i] || fullDaXianList[0]
        const stemEl = charElement(dy.heavenlyStem || '')
        const currentYear = new Date().getFullYear()
        const currentAge = (liuNian || []).find(l => l.year === currentYear)?.age
        const [startAge, endAge] = (dy.ageRange || '').split('-').map((s: string) => parseInt(s.trim(), 10))
        const birthYear = (liuNian && liuNian[0]) ? (liuNian[0].year - liuNian[0].age) : (currentYear - 30)
        const startYear = birthYear + (startAge || 0)
        const endYear = birthYear + (endAge || (startAge || 0) + 9)

        const decadeKey = `decade_${i}`
        const hasAiFortunes = Boolean(detailedFortunes[decadeKey] && detailedFortunes[decadeKey].length > 0)
        const isGeneratingThisDecade = generatingDecade === i
        const isDecadeUnlocked = isDaYunUnlocked(i, unlockedDecades, freeDaYunLimit)
        const palaceEntry = branchToPalaceMap[dy.earthlyBranch]
        const palaceName = palaceEntry?.name || ''

        const YEAR_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
        const YEAR_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
        const rawDecadeYears = (liuNian || []).filter(ln => (startAge && endAge ? ln.age >= startAge && ln.age <= endAge : false))

        const fullDecadeYears = Array.from({ length: 10 }, (_, idx) => {
          const age = (startAge || 20) + idx
          const existingLn = rawDecadeYears.find(ln => ln.age === age)
          const aiYear = detailedFortunes[decadeKey]?.find(f => f.age === age || (existingLn && f.year === existingLn.year))
          const year = existingLn?.year || aiYear?.year || (birthYear + age)
          const yrStem = YEAR_STEMS[((year - 4) % 10 + 10) % 10]
          const yrBranch = YEAR_BRANCHES[((year - 4) % 12 + 12) % 12]

          return {
            year,
            age,
            earthlyBranch: existingLn?.earthlyBranch || yrBranch,
            ganZhi: aiYear?.ganZhi || `${yrStem}${yrBranch}`,
            yearlyMutagen: existingLn?.yearlyMutagen || [],
            huaLuPalace: existingLn?.huaLuPalace || '',
            huaJiPalace: existingLn?.huaJiPalace || '',
            isLucky: aiYear?.isLucky ?? existingLn?.isLucky ?? null,
          }
        })

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-gold font-serif text-base flex items-center gap-2">
                <KeyPredictionIcon size={16} className="text-gold" />
                <span>{T(lang, '大限排盤（點擊任一步大限展開十年流年）', 'Da Xian (Click decade to expand 10-yr annual fortunes)')}</span>
              </h3>
            </div>

            <div className="card-quiet rounded-xl p-3 sm:p-4 border border-gold/20 space-y-3">
              {/* Horizontal DaXian Selection Strip (8 Decades, identical to BaZi) */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 pt-2.5 pb-2.5">
                {fullDaXianList.map((dec: AnyData, idx: number) => {
                  const decStemEl = charElement(dec.heavenlyStem || '')
                  const [dStartAge, dEndAge] = (dec.ageRange || '').split('-').map((s: string) => parseInt(s.trim(), 10))
                  const isCurrent = Boolean(currentAge && dStartAge && dEndAge && currentAge >= dStartAge && currentAge <= dEndAge)
                  const isSelected = idx === i
                  const isUnlocked = isDaYunUnlocked(idx, unlockedDecades, freeDaYunLimit)
                  const dStartYear = birthYear + (dStartAge || 0)

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDaXianIndex(idx)
                        setActiveDecadeYear(null)
                      }}
                      className={`flex-shrink-0 text-center px-3 py-2 rounded-lg border transition-all min-w-[68px] relative cursor-pointer ${
                        isSelected
                          ? 'border-gold ring-2 ring-gold/60 bg-gold/20 shadow-md scale-105 z-10'
                          : isCurrent
                          ? 'border-gold/60 ring-1 ring-gold/30 bg-gold/10'
                          : 'border-gold/15 bg-gold/5 hover:border-gold/35'
                      }`}
                    >
                      <div className="text-[var(--text-muted)] text-[10px]">
                        {dec.ageRange}{T(lang, '歲', '')}
                      </div>
                      <div className="my-0.5">
                        <span className={`text-sm font-serif font-bold ${elClr[decStemEl] || 'text-gold'}`}>{dec.heavenlyStem}</span>
                        <span className="text-sm font-serif font-bold text-gold">{dec.earthlyBranch}</span>
                      </div>
                      <div className="text-[var(--text-muted)] text-[9px]">{dStartYear}</div>
                      {/* Status tag */}
                      <div className="mt-0.5">
                        {idx < freeDaYunLimit ? (
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

              {/* ═══ INTERACTIVE DECADE CONTAINER (Full-Width Vertical Flow) ═══ */}
              {dy && (
                <div className="pt-3 border-t border-gold/15 space-y-3">
                  {/* Decade Header Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gold/5 p-2.5 rounded-lg border border-gold/15">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-serif font-bold text-gold">
                        {T(lang, `第 ${i + 1} 步大限：`, `Decade ${i + 1}: `)}
                        <span className={elClr[stemEl] || ''}>{dy.heavenlyStem}</span>
                        <span>{dy.earthlyBranch}</span>
                      </span>
                      {palaceName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 border border-gold/30 text-gold font-serif">
                          {palaceName}
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">
                        {startYear}-{endYear}年 ({dy.ageRange}{T(lang, '歲', '')})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAskMasterAboutDaXian(i, dy)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 transition-all cursor-pointer font-serif font-medium"
                        title={T(lang, '向大師追問此大限十年格局', 'Consult Master on this decade')}
                      >
                        <MasterSageIcon size={12} color="var(--gold)" />
                        <span>{T(lang, '追問此大限', 'Ask Master')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Full-Width Decade Overview */}
                  <div className="space-y-2 px-0.5">
                    {dy.theme ? (
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-serif">{dy.theme}</p>
                    ) : (
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-serif">
                        {T(
                          lang,
                          `此步大限行至「${dy.heavenlyStem}${dy.earthlyBranch}」${palaceName ? `（${palaceName}）` : ''}，管轄 ${dy.ageRange} 歲十年氣運，引動大限四化與三方四正星曜交會。`,
                          `Decade cycle in ${dy.heavenlyStem}${dy.earthlyBranch}${palaceName ? ` (${palaceName})` : ''}, governing ages ${dy.ageRange}.`
                        )}
                      </p>
                    )}
                    {dy.siHuaOverlay ? (
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                        <span className="text-gold">{T(lang, '四化疊加：', 'SiHua Overlay: ')}</span>{dy.siHuaOverlay}
                      </p>
                    ) : Array.isArray(dy.mutagen) && dy.mutagen.filter(Boolean).length === 4 ? (
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                        <span className="text-gold">{T(lang, '大限四化：', 'Decade SiHua: ')}</span>
                        {`${dy.heavenlyStem}干引動 ${dy.mutagen[0]}化祿、${dy.mutagen[1]}化權、${dy.mutagen[2]}化科、${dy.mutagen[3]}化忌`}
                      </p>
                    ) : null}
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
                        <span className="text-[var(--text-secondary)] text-sm leading-relaxed">{dy.advice}</span>
                      </div>
                    )}
                  </div>

                  {/* ═══ 10-YEAR ANNUAL FORTUNE FOR THIS DECADE ═══ */}
                  <div className="mt-3 pt-3 border-t border-gold/15 space-y-2.5">
                    {/* 10-Year Section Subheader Bar: Single Entry Point for Generating 10-Year Fortunes */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <span className="text-xs font-serif text-gold font-medium flex items-center gap-1.5">
                        <ScrollIcon size={13} className="text-gold flex-shrink-0" />
                        <span>{T(lang, '本大限十年流年（點選年份查看）', '10-Year Annual Fortunes (Click year to inspect)')}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {hasAiFortunes ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-serif font-medium">
                              <SparkleIcon size={11} color="currentColor" className="text-emerald-400 flex-shrink-0" />
                              <span>{T(lang, '十年流年精批已就緒', '10-Yr Fortunes Ready')}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGenerateAnnualFortune(i, dy)}
                              disabled={isGeneratingThisDecade}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:text-gold border border-gold/20 hover:border-gold/40 flex-shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                              title={T(lang, '重新調用大模型推演此十年流年', 'Re-channel 10-year annual fortunes')}
                            >
                              <RefreshIcon size={10} />
                              <span>{T(lang, '重新推演', 'Re-channel')}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateAnnualFortune(i, dy)}
                            disabled={isGeneratingThisDecade}
                            className="group pl-2.5 pr-1.5 py-1 rounded-lg bg-gradient-to-r from-[#d4a853] via-[#e5be6a] to-[#c99738] text-navy-950 hover:brightness-110 active:scale-[0.99] transition-all text-[11px] font-serif font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-gold/20 border border-[#f3d794]/50 flex-shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingThisDecade ? (
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

                    {/* 10-Year Buttons Grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2.5 pb-2.5 px-1.5">
                      {fullDecadeYears.map((ln) => {
                        const isCurrentYear = ln.year === currentYear
                        const isSelected = activeDecadeYear?.decadeIdx === i && activeDecadeYear?.year === ln.year
                        const luckyBadge = ln.isLucky === true ? 'border-emerald-400 text-emerald-300' : ln.isLucky === false ? 'border-rose-400 text-rose-300' : 'border-gray-500 text-gray-300'
                        const hasAiFortune = Boolean(detailedFortunes[decadeKey]?.some(f => f.year === ln.year))

                        return (
                          <button
                            key={ln.year}
                            onClick={() => setActiveDecadeYear(isSelected ? null : { decadeIdx: i, year: ln.year })}
                            className={`p-1.5 rounded-lg border text-center transition-all relative ${
                              isSelected
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
                            <div className="text-xs font-serif font-bold my-0.5 text-gold">
                              {ln.earthlyBranch}宮
                            </div>
                            <div className="text-[8px] text-[var(--text-muted)]">{ln.age}{T(lang, '歲', '')}</div>
                            <div className={`text-[8px] px-0.5 rounded border mt-0.5 ${luckyBadge}`}>
                              {ln.isLucky === true ? '禄' : ln.isLucky === false ? '忌' : '平'}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Active Year Detailed Fortune Inspector */}
                    {activeDecadeYear?.decadeIdx === i && (() => {
                      const ln = fullDecadeYears.find(y => y.year === activeDecadeYear.year)
                      const aiFortune = detailedFortunes[decadeKey]?.find(f => f.year === activeDecadeYear.year)
                      if (!ln && !aiFortune) return null

                      const displayYear = aiFortune?.year || ln?.year || currentYear
                      const displayAge = aiFortune?.age || ln?.age || 0
                      const displayBranch = ln?.earthlyBranch || ''

                      return (
                        <div className="p-3.5 rounded-lg bg-gold/10 border border-gold/30 space-y-3 animate-fadeIn">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-gold font-serif font-bold text-sm">
                                {displayYear}年 ({displayAge}{T(lang, '歲', '')}) · {aiFortune?.ganZhi || (ln ? `${ln.earthlyBranch}宮` : '')}
                              </span>
                              {ln && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-medium">
                                  {T(lang, '流年命宮', 'Palace')}: {ln.earthlyBranch}
                                </span>
                              )}
                              {aiFortune ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                                  ✦ {T(lang, '玄機深度精批', 'Master Channeled')}
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold/80">
                                  {T(lang, '星曜概覽', 'Overview')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAskMasterAboutZiweiLiuNian(displayYear, displayAge, displayBranch, dy)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 transition-all cursor-pointer font-serif font-medium"
                                title={T(lang, `向玄機大師追問 ${displayYear} 流年`, `Ask Master about ${displayYear}`)}
                              >
                                <MasterSageIcon size={11} color="var(--gold)" />
                                <span>{T(lang, `追問 ${displayYear} 流年`, `Ask ${displayYear}`)}</span>
                              </button>
                              <button
                                onClick={() => setActiveDecadeYear(null)}
                                className="text-xs text-[var(--text-muted)] hover:text-gold px-1 cursor-pointer"
                              >
                                <CloseIcon size={12} />
                              </button>
                            </div>
                          </div>

                          {aiFortune ? (
                            /* ═══ FULL AI-CHANNELED ZIWEI ANNUAL FORTUNE ═══ */
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
                                      <span>{T(lang, '事業官祿', 'Career')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.career}</p>
                                  </div>
                                )}
                                {aiFortune.wealth && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <WealthIcon size={12} className="text-gold" />
                                      <span>{T(lang, '財帛營謀', 'Wealth')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.wealth}</p>
                                  </div>
                                )}
                                {aiFortune.romance && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <MarriageIcon size={12} className="text-gold" />
                                      <span>{T(lang, '夫妻姻緣', 'Romance')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.romance}</p>
                                  </div>
                                )}
                                {aiFortune.health && (
                                  <div className="p-2 rounded bg-gold/5 border border-gold/15 space-y-1">
                                    <div className="text-gold font-serif font-medium flex items-center gap-1 text-[11px]">
                                      <HealthIcon size={12} className="text-gold" />
                                      <span>{T(lang, '疾厄身心', 'Health')}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{aiFortune.health}</p>
                                  </div>
                                )}
                              </div>

                              {/* SiHua Overlay Interaction & Advice */}
                              {aiFortune.interaction && (
                                <div className="flex items-start gap-1.5 text-[11px]">
                                  <span className="text-gold font-medium flex-shrink-0">{T(lang, '【四化疊引】', 'SiHua Overlay')}:</span>
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
                            /* ═══ BASIC OVERVIEW FALLBACK ═══ */
                            <div className="space-y-2 text-xs">
                              <div className="p-2.5 rounded bg-[var(--accent-bg)] border border-gold/15 space-y-1.5">
                                <div className="text-[var(--text-secondary)]">
                                  {T(lang,
                                    `此年流年命宮落在「${ln?.earthlyBranch || ''}」宮，化祿入${ln?.huaLuPalace || '三方'}，化忌入${ln?.huaJiPalace || '四正'}。`,
                                    `Annual life palace resides in ${ln?.earthlyBranch || ''}, Hua Lu in ${ln?.huaLuPalace || ''}, Hua Ji in ${ln?.huaJiPalace || ''}.`
                                  )}
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
      <StreamingKeyPredictions predictions={keyPredictions} streaming={streaming} delay={0.1} />

      {/* ═══ KEY ADVICE ═══ */}
      <StreamingKeyAdvice items={d.keyAdvice} streaming={streaming} delay={0.12} />

      {/* ═══ XUANJI Q&A ═══ (only once streaming done + 3 auto questions ready) */}
      {!isPaipan && qaReady && <XuanjiChatCard readingResult={rawResult || ''} readingType="ziwei" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.14} />}

      {/* ═══ LUCKY INFO ═══ */}
      <StreamingLuckyInfo luckyInfo={d.luckyInfo} streaming={streaming} delay={0.16} mode="inline" />
    </div>
  )
}
