'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import YinYangIcon from '@/components/YinYangIcon'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'
import LoadingOracle from '@/components/LoadingOracle'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import ShareResultButton from '@/components/ShareResultButton'
import { useMasterChat } from '@/components/master/MasterChatContext'

const relationLabels: Record<string, { zh: string; en: string }> = {
  spouse: { zh: '配偶', en: 'Spouse' },
  father: { zh: '父親', en: 'Father' },
  mother: { zh: '母親', en: 'Mother' },
  son: { zh: '兒子', en: 'Son' },
  daughter: { zh: '女兒', en: 'Daughter' },
  brother: { zh: '兄弟', en: 'Brother' },
  sister: { zh: '姐妹', en: 'Sister' },
  friend: { zh: '朋友', en: 'Friend' },
  other: { zh: '其他', en: 'Other' },
}

interface Reading {
  id: string
  type: string
  status?: string  // pending | completed | failed
  question: string | null
  result: string
  language: string
  createdAt: string
  targetType?: string
  familyMember?: { relation: string; name: string | null } | null
  rating?: number | null
  shareToken?: string | null
  inputData?: Record<string, unknown>
}

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

const typeIcons: Record<string, string> = {
  bazi: '🏛️',
  ziwei: '⭐',
  iching: '☯',
  qimen: '🧭',
  liuyao: '🪙',
  meihua: '🌸',
  fengshui: '🏯',
  other: '📖',
}

const typeBorderColor: Record<string, string> = {
  bazi: 'rgba(212,175,55,0.6)',
  ziwei: 'rgba(147,112,219,0.6)',
  iching: 'rgba(100,149,237,0.6)',
  qimen: 'rgba(220,120,60,0.6)',
  liuyao: 'rgba(100,149,237,0.6)',
  meihua: 'rgba(236,130,180,0.6)',
  fengshui: 'rgba(76,175,80,0.6)',
  other: 'rgba(160,160,160,0.6)',
}

const shichenLabels: Record<string, { 'zh-TW': string; en: string }> = {
  zi_early: { 'zh-TW': '早子時', en: 'Early Zi' },
  chou: { 'zh-TW': '丑時', en: 'Chou' },
  yin: { 'zh-TW': '寅時', en: 'Yin' },
  mao: { 'zh-TW': '卯時', en: 'Mao' },
  chen: { 'zh-TW': '辰時', en: 'Chen' },
  si: { 'zh-TW': '巳時', en: 'Si' },
  wu: { 'zh-TW': '午時', en: 'Wu' },
  wei: { 'zh-TW': '未時', en: 'Wei' },
  shen: { 'zh-TW': '申時', en: 'Shen' },
  you: { 'zh-TW': '酉時', en: 'You' },
  xu: { 'zh-TW': '戌時', en: 'Xu' },
  hai: { 'zh-TW': '亥時', en: 'Hai' },
  zi_late: { 'zh-TW': '晚子時', en: 'Late Zi' },
}

/**
 * Build a single dot-separated subject-info line from a reading's inputData
 * (date · time · place · gender). Returns null when no birth fields are
 * present — caller decides the fallback (e.g. event-only readings without
 * a subject still show the question inline beside the title).
 */
function formatSubjectInfo(
  inputData: Record<string, unknown> | undefined,
  lang: 'zh-TW' | 'en',
): string | null {
  if (!inputData) return null
  const isEn = lang === 'en'
  const parts: string[] = []

  const birthDate = inputData.birthDate as string | undefined
  if (birthDate) {
    parts.push(
      inputData.lunarToggle === 'lunar'
        ? isEn
          ? `${birthDate} (Lunar)`
          : `${birthDate}（農曆）`
        : birthDate,
    )
  }

  if (inputData.timeMode === 'precise' && inputData.exactTime) {
    parts.push(String(inputData.exactTime))
  } else if (inputData.birthTime) {
    const key = String(inputData.birthTime)
    const label = shichenLabels[key]
    parts.push(label ? label[lang] : key)
  }

  if (inputData.birthPlace) parts.push(String(inputData.birthPlace))

  const g = inputData.gender as string | undefined
  if (g === 'male') parts.push(isEn ? 'M' : '男')
  else if (g === 'female') parts.push(isEn ? 'F' : '女')

  return parts.length > 0 ? parts.join(' · ') : null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [readings, setReadings] = useState<Reading[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(15)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { setShape: setMasterShape, enabled: masterEnabled } = useMasterChat()



  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // /start funnel completion lands here with `?fromFunnel=1` — auto-open
  // the master chat so the user sees their View-4 conversation continue
  // seamlessly into their now-real account. Fires once when the master
  // provider has finished mounting (`enabled` becomes true after auth).
  useEffect(() => {
    if (searchParams.get('fromFunnel') === '1' && masterEnabled) {
      setMasterShape('expanded')
    }
  }, [searchParams, masterEnabled, setMasterShape])

  useEffect(() => {
    if (session) {
      fetch('/api/readings')
        .then(r => r.json())
        .then(data => { setReadings(data.readings || []); setLoading(false) })
    }
  }, [session])

  // Deep-link: when arriving with `?reading={id}` (e.g. from a Master
  // chat reading-card click), auto-expand and scroll to that reading once
  // the list has loaded. We bump visibleCount if the target is past the
  // initial slice so the element actually exists in the DOM to scroll to.
  useEffect(() => {
    const targetId = searchParams.get('reading')
    if (!targetId || readings.length === 0) return
    const idx = readings.findIndex((r) => r.id === targetId)
    if (idx < 0) return
    setExpanded(targetId)
    if (idx + 1 > visibleCount) {
      setVisibleCount(idx + 5)
    }
    // Defer the scroll until after the expand re-render has committed.
    requestAnimationFrame(() => {
      const el = document.getElementById(`reading-${targetId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [readings, searchParams, visibleCount])

  // Poll pending readings when expanded
  useEffect(() => {
    if (!expanded) return
    const reading = readings.find(r => r.id === expanded)
    if (!reading || (reading.status !== 'pending' && reading.status !== undefined)) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/readings/${expanded}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.reading?.status === 'completed' || data.reading?.status === 'failed') {
          setReadings(prev => prev.map(r => r.id === expanded ? { ...r, ...data.reading } : r))
        }
      } catch { /* ignore */ }
    }, 10000)

    return () => clearInterval(interval)
  }, [expanded, readings])

  // Auto-poll all pending readings (even when not expanded)
  useEffect(() => {
    const pendingReadings = readings.filter(r => r.status === 'pending')
    if (pendingReadings.length === 0) return

    const interval = setInterval(async () => {
      for (const pr of pendingReadings) {
        try {
          const res = await fetch(`/api/readings/${pr.id}`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.reading?.status !== 'pending') {
            setReadings(prev => prev.map(r => r.id === pr.id ? { ...r, ...data.reading } : r))
          }
        } catch { /* ignore */ }
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [readings])

  const retryReading = async (r: Reading) => {
    // Delete the failed reading, then redirect to divination page for a fresh start
    try {
      await fetch(`/api/readings/${r.id}`, { method: 'DELETE' })
      setReadings(prev => prev.filter(x => x.id !== r.id))
    } catch {
      // Even if delete fails, still navigate
    }
    router.push(`/divination/${r.type}`)
  }

  const deleteReading = async (id: string) => {
    // Mark as deleting so the card shows a loading overlay while the request
    // is in flight — the card is NOT removed until the API confirms success,
    // so a backend failure leaves the card in place with an error toast.
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/readings/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Success — drop the card. AnimatePresence handles the exit animation.
      setReadings(r => r.filter(x => x.id !== id))
      // Notify the master chat widget so its greeting (命盤 — 八字、紫微…)
      // refreshes immediately. Without this, the widget would keep showing
      // the deleted chart type until the next expand-triggered refetch.
      window.dispatchEvent(new CustomEvent('xuanji:readingsChanged'))
    } catch {
      toast.error(lang === 'en' ? 'Delete failed, please try again' : '刪除失敗，請稍後再試')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // C1: filter + paginate
  const filteredReadings = activeTypeFilter
    ? readings.filter(r => r.type === activeTypeFilter)
    : readings
  const visibleReadings = filteredReadings.slice(0, visibleCount)
  const hasMoreReadings = filteredReadings.length > visibleCount

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <MysticalLoader lang={lang} variant="page" />
      </div>
    )
  }

  return (
    <div className="flex-1 py-8 sm:py-12 px-3 sm:px-4 max-w-4xl mx-auto w-full overflow-x-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-serif text-gold">
            {lang === 'zh-TW' ? '占卜歷史' : 'Reading History'}
          </h1>
          <a
            href="/divination"
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            {lang === 'zh-TW' ? '+ 新占卜' : '+ New Reading'}
          </a>
        </div>
        <p className="text-white/50 text-sm mb-4">
          {lang === 'zh-TW'
            ? `共 ${readings.length} 條記錄${activeTypeFilter ? ` · 篩選：${typeLabels[activeTypeFilter]?.['zh-TW'] ?? activeTypeFilter}` : ''}`
            : `${readings.length} readings${activeTypeFilter ? ` · Filter: ${typeLabels[activeTypeFilter]?.en ?? activeTypeFilter}` : ''}`}
        </p>
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveTypeFilter(null); setVisibleCount(15) }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: !activeTypeFilter ? 'var(--gold)' : 'transparent',
              color: !activeTypeFilter ? '#000' : 'var(--text-muted)',
              border: `1px solid ${!activeTypeFilter ? 'var(--gold)' : 'var(--card-border)'}`,
            }}
          >
            {lang === 'zh-TW' ? '全部' : 'All'}
          </button>
          {Object.entries(typeLabels)
            .filter(([key]) => key !== 'other' && readings.some(r => r.type === key))
            .map(([key, label]) => {
              const count = readings.filter(r => r.type === key).length
              const active = activeTypeFilter === key
              return (
                <button
                  key={key}
                  onClick={() => { setActiveTypeFilter(active ? null : key); setVisibleCount(15) }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
                  style={{
                    background: active ? 'var(--gold)' : 'transparent',
                    color: active ? '#000' : 'var(--text-muted)',
                    border: `1px solid ${active ? 'var(--gold)' : 'var(--card-border)'}`,
                  }}
                >
                  <span>{typeIcons[key] ?? '📖'}</span>
                  <span>{lang === 'zh-TW' ? label['zh-TW'] : label.en}</span>
                  <span style={{ opacity: 0.6 }}>({count})</span>
                </button>
              )
            })}
        </div>
      </motion.div>

      {readings.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-white/50">
          <div className="mb-4"><YinYangIcon size={48} /></div>
          <p>{lang === 'zh-TW' ? '還沒有占卜記錄' : 'No readings yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
          {visibleReadings.map((r, i) => {
            const isDeleting = deletingIds.has(r.id)
            return (
            <motion.div
              key={r.id}
              id={`reading-${r.id}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isDeleting ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.25 } }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl overflow-hidden w-full min-w-0 relative scroll-mt-24"
              style={{ borderLeft: `3px solid ${typeBorderColor[r.type] || typeBorderColor.other}` }}
            >
              {isDeleting && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
                  <span className="flex items-center gap-2 text-xs text-red-300">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                    {lang === 'en' ? 'Deleting…' : '刪除中…'}
                  </span>
                </div>
              )}
              <button
                type="button"
                aria-expanded={expanded === r.id}
                className={`w-full text-left p-5 cursor-pointer hover:bg-white/5 transition-colors ${r.status === 'pending' ? 'animate-pulse' : ''} ${isDeleting ? 'pointer-events-none' : ''}`}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full mr-2 inline-flex items-center gap-1">
                      <span>{typeIcons[r.type] ?? '📖'}</span>
                      {typeLabels[r.type]?.[lang === 'en' ? 'en' : 'zh-TW'] || r.type}
                    </span>
                    {r.status === 'pending' && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded-full mr-2 inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                        {lang === 'en' ? 'Processing...' : '解讀中...'}
                      </span>
                    )}
                    {r.status === 'failed' && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full mr-2">
                        {lang === 'en' ? 'Failed' : '解讀失敗'}
                      </span>
                    )}
                    {r.targetType === 'family' && r.familyMember && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full mr-2">
                        {lang === 'en'
                          ? `For ${relationLabels[r.familyMember.relation]?.en || r.familyMember.relation}${r.familyMember.name ? ` (${r.familyMember.name})` : ''}`
                          : `為${relationLabels[r.familyMember.relation]?.zh || r.familyMember.relation}${r.familyMember.name ? `（${r.familyMember.name}）` : ''}`
                        }
                      </span>
                    )}
                    {r.question && <span className="text-white/60 text-sm">{r.question}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {r.rating && (
                      <span className="text-gold text-xs" title={`${r.rating}/5`}>
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                    )}
                    <span className="text-white/40 text-xs">
                      {new Date(r.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')}
                    </span>
                    {confirmDeleteId === r.id ? (
                      <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { deleteReading(r.id); setConfirmDeleteId(null) }}
                          className="text-red-400 hover:text-red-300 text-[10px] font-medium transition-colors"
                        >
                          {lang === 'en' ? 'Delete' : '刪除'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-white/40 hover:text-white/60 text-[10px] transition-colors"
                        >
                          {lang === 'en' ? 'Cancel' : '取消'}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(r.id) }}
                        disabled={isDeleting}
                        className="text-white/30 hover:text-red-400 transition-colors text-xs disabled:opacity-40 disabled:cursor-wait"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {expanded !== r.id && (() => {
                  if (r.status === 'pending') {
                    return (
                      <p className="text-white/50 text-sm mt-2">
                        {lang === 'en' ? 'Your reading is being generated...' : '正在為您解讀命盤...'}
                      </p>
                    )
                  }
                  if (r.status === 'failed') {
                    return (
                      <p className="text-white/50 text-sm mt-2">
                        {lang === 'en' ? 'This reading failed to generate. You may retry.' : '解讀生成失敗，可重新嘗試。'}
                      </p>
                    )
                  }
                  // Prefer subject info when birth data is present (bazi / ziwei
                  // and any other type whose form collected birth fields). For
                  // event-only readings without birth data, fall back to the
                  // 120-char preview so the card isn't visually empty.
                  const subject = formatSubjectInfo(r.inputData, lang === 'en' ? 'en' : 'zh-TW')
                  if (subject) {
                    return (
                      <p className="text-white/50 text-sm mt-2">{subject}</p>
                    )
                  }
                  return (
                    <p className="text-white/50 text-sm mt-2 line-clamp-2">
                      {(() => {
                        try {
                          const parsed = JSON.parse(r.result)
                          if (parsed.paipanOnly) {
                            return lang === 'en' ? 'Paipan only (no AI interpretation)' : '只排盤（無AI解盤）'
                          }
                          const summary = parsed.sections?.overview
                            || parsed.sections?.overall       // fengshui uses 'overall' not 'overview'
                            || parsed.sections?.situation
                            || parsed.interpretation
                            || (parsed.outcome ? `${parsed.palace?.inquiry || ''} → ${parsed.outcome}` : '')
                            || ''
                          return summary
                            ? summary.slice(0, 120) + '...'
                            : (lang === 'en' ? 'Click to view full reading' : '點擊查看完整解讀')
                        } catch {
                          return r.result.slice(0, 120) + '...'
                        }
                      })()}
                    </p>
                  )
                })()}
              </button>
              <AnimatePresence>
                {expanded === r.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gold/10 px-2 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4 overflow-hidden w-full min-w-0"
                  >
                    {r.status === 'pending' ? (
                      <LoadingOracle divinationType={r.type} startTime={new Date(r.createdAt).getTime()} />
                    ) : r.status === 'failed' ? (
                      <div className="text-center py-8 text-red-300">
                        <p className="text-2xl mb-2">⚠️</p>
                        <p>{lang === 'en' ? 'This reading failed to generate.' : '解讀生成失敗'}</p>
                        <p className="text-sm text-white/40 mt-1">
                          {lang === 'en' ? 'Your Karma was not deducted. Please try again.' : '機緣未被扣除，請重新嘗試。'}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); retryReading(r) }}
                          className="mt-4 px-6 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                          style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
                        >
                          {lang === 'en' ? '🔄 Retry' : '🔄 重新占卜'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-full max-w-full overflow-x-hidden">
                          <ResultRenderer
                            result={r.result}
                            type={r.type}
                            readingId={r.id}
                            subjectName={
                              r.targetType === 'family' && r.familyMember
                                ? r.familyMember.name || r.familyMember.relation
                                : session?.user?.name || null
                            }
                            birthInfo={r.inputData ? {
                              birthDate: r.inputData.birthDate as string | undefined,
                              birthTime: r.inputData.birthTime as string | undefined,
                              gender: r.inputData.gender as string | undefined,
                              calendarType: r.inputData.lunarToggle as string | undefined,
                              birthPlace: r.inputData.birthPlace as string | undefined,
                              exactTime: r.inputData.timeMode === 'precise' ? (r.inputData.exactTime as string | undefined) : undefined,
                            } : null}
                            createdAt={r.createdAt}
                          />
                        </div>
                        <div className="mt-4">
                          <ReadingFeedback
                            readingId={r.id}
                            initialRating={r.rating}
                          />
                        </div>
                        <ShareResultButton readingId={r.id} shareToken={r.shareToken} lang={lang} />
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            )
          })}
          </AnimatePresence>
          {hasMoreReadings && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisibleCount(c => c + 15)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                style={{
                  color: 'var(--gold)',
                  border: '1px solid var(--border-gold, rgba(212,175,55,0.3))',
                }}
              >
                {lang === 'zh-TW'
                  ? `載入更多（還有 ${filteredReadings.length - visibleCount} 條）`
                  : `Load more (${filteredReadings.length - visibleCount} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
