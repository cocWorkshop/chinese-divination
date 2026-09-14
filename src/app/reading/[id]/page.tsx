'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import BackButton from '@/components/BackButton'
import MysticalLoader from '@/components/MysticalLoader'
import LoadingOracle from '@/components/LoadingOracle'
import ReadingResultView from '@/components/ReadingResultView'
import { DivinationIcon, AlertIcon, RefreshIcon } from '@/components/DivinationIcons'

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

/**
 * Map the technical failure reason stored in Reading.result (written by
 * markFailed — see src/lib/readings/lifecycle.ts and api/divination) to a
 * user-facing cause + advice, so repeated failures are diagnosable instead
 * of an anonymous "failed".
 */
function describeFailure(reason: string | undefined, lang: string): { cause: string; advice: string } {
  const en = lang === 'en'
  const r = (reason || '').toLowerCase()
  if (r.includes('timed out') || r.includes('timeout')) {
    return {
      cause: en ? 'The analysis timed out.' : '分析超時。',
      advice: en
        ? 'This usually happens under heavy load. Retrying now typically succeeds.'
        : '通常是伺服器繁忙所致，立即重試通常可成功。',
    }
  }
  if (r.includes('rate') || r.includes('overloaded') || r.includes('busy') || r.includes('429')) {
    return {
      cause: en ? 'The AI service was temporarily busy.' : 'AI 服務暫時繁忙。',
      advice: en ? 'Please wait a minute and retry.' : '請稍候一分鐘再重試。',
    }
  }
  if (r.includes('json parse') || r.includes('output format')) {
    return {
      cause: en ? 'The AI returned an unreadable result.' : 'AI 回傳的結果格式異常。',
      advice: en
        ? 'This is a transient AI glitch — retrying usually fixes it.'
        : '這是偶發的 AI 輸出問題，重試通常即可解決。',
    }
  }
  if (r.includes('not configured')) {
    return {
      cause: en ? 'The divination service is misconfigured.' : '占卜服務配置異常。',
      advice: en
        ? 'Retrying will not help — please contact support if this persists.'
        : '重試無法解決，若持續發生請聯繫客服。',
    }
  }
  return {
    cause: en ? 'An unexpected error interrupted the reading.' : '解讀過程發生未預期的錯誤。',
    advice: en ? 'Please try again. If it keeps failing, contact support.' : '請重新嘗試；若持續失敗請聯繫客服。',
  }
}

interface Reading {
  id: string
  type: string
  status?: string
  question: string | null
  result: string
  language: string
  createdAt: string
  targetType?: string
  familyMemberId?: string | null
  familyMember?: { relation: string; name: string | null } | null
  rating?: number | null
  shareToken?: string | null
  inputData?: Record<string, unknown>
}

// inputData keys carried into the retry URL — must stay in sync with the
// query-param hydration whitelist in useDivinationForm.ts.
const RETRY_CARRY_KEYS = [
  'birthDate', 'birthTime', 'exactTime', 'timeMode', 'birthPlace', 'gender',
  'question', 'readingDateTime', 'direction', 'yearBuilt', 'ownerInfo',
  'hexagram', 'liuyaoLines', 'ichingLines',
] as const

export default function ReadingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, status } = useSession()
  const { lang } = useLang()
  const router = useRouter()
  const [reading, setReading] = useState<Reading | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!session || !id) return
    let cancelled = false
    fetch(`/api/readings/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.ok ? r.json() : null
      })
      .then(data => {
        if (cancelled) return
        if (data?.reading) setReading(data.reading)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session, id])

  // Poll while the reading is still being generated.
  useEffect(() => {
    if (!reading || reading.status !== 'pending') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/readings/${id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.reading?.status === 'completed' || data.reading?.status === 'failed') {
          setReading(prev => prev ? { ...prev, ...data.reading } : data.reading)
        }
      } catch { /* ignore */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [reading, id])

  const retryReading = async () => {
    if (!reading) return
    // Carry the failed reading's original inputs into the form via the same
    // query-param hydration the Master CTA flow uses — one click re-runs the
    // identical request instead of dropping the user on a blank form.
    const params = new URLSearchParams()
    const data = reading.inputData ?? {}
    for (const k of RETRY_CARRY_KEYS) {
      const v = data[k]
      if (typeof v === 'string' && v) params.set(k, v)
    }
    if (typeof data.lunarToggle === 'string' && data.lunarToggle) params.set('calendarType', data.lunarToggle)
    if (!params.get('question') && reading.question) params.set('question', reading.question)
    if (reading.targetType === 'family' && reading.familyMemberId) {
      params.set('target', 'family')
      params.set('familyMemberId', reading.familyMemberId)
    }
    try {
      await fetch(`/api/readings/${reading.id}`, { method: 'DELETE' })
    } catch { /* navigate regardless */ }
    const qs = params.toString()
    router.push(`/divination/${reading.type}${qs ? `?${qs}` : ''}`)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <MysticalLoader lang={lang} variant="page" />
      </div>
    )
  }

  // Completed reading → the identical shared view used by the divination flow.
  if (reading && reading.status !== 'pending' && reading.status !== 'failed') {
    return (
      <ReadingResultView
        backFallbackHref="/dashboard"
        type={reading.type}
        result={reading.result}
        readingId={reading.id}
        lang={lang}
        question={reading.question}
        subjectName={
          reading.targetType === 'family' && reading.familyMember
            ? reading.familyMember.name || reading.familyMember.relation
            : session?.user?.name || null
        }
        birthInfo={reading.inputData ? {
          birthDate: reading.inputData.birthDate as string | undefined,
          birthTime: reading.inputData.birthTime as string | undefined,
          gender: reading.inputData.gender as string | undefined,
          calendarType: reading.inputData.lunarToggle as string | undefined,
          birthPlace: reading.inputData.birthPlace as string | undefined,
          exactTime: reading.inputData.timeMode === 'precise' ? (reading.inputData.exactTime as string | undefined) : undefined,
        } : null}
        createdAt={reading.createdAt}
        targetType={reading.targetType}
        familyMember={reading.familyMember}
        shareToken={reading.shareToken}
        rating={reading.rating}
      />
    )
  }

  // Not-found / pending / failed states.
  return (
    <div className="flex-1 py-8 sm:py-12 px-3 sm:px-4 max-w-4xl mx-auto w-full overflow-x-hidden">
      <div className="mb-4">
        <BackButton fallbackHref="/dashboard" />
      </div>

      {notFound || !reading ? (
        <div className="oriental-sanctuary-card rounded-2xl p-12 text-center text-[var(--text-secondary)] border border-gold/20">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3 text-gold">
            <DivinationIcon type="other" className="w-6 h-6" />
          </div>
          <p className="font-serif">{lang === 'en' ? 'Reading not found' : '找不到此記錄'}</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full min-w-0">
          {/* Lightweight header for transient states. */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-gold/15 text-gold text-xs rounded-full border border-gold/30 inline-flex items-center gap-1.5 font-serif">
              <DivinationIcon type={reading.type} className="w-3.5 h-3.5" />
              <span>{typeLabels[reading.type]?.[lang === 'en' ? 'en' : 'zh-TW'] || reading.type}</span>
            </span>
            {reading.targetType === 'family' && reading.familyMember && (
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                {lang === 'en'
                  ? `For ${relationLabels[reading.familyMember.relation]?.en || reading.familyMember.relation}${reading.familyMember.name ? ` (${reading.familyMember.name})` : ''}`
                  : `為${relationLabels[reading.familyMember.relation]?.zh || reading.familyMember.relation}${reading.familyMember.name ? `（${reading.familyMember.name}）` : ''}`}
              </span>
            )}
          </div>
          {reading.question && (
            <p className="text-[var(--text-secondary)] text-sm mb-5 font-serif">{reading.question}</p>
          )}

          {reading.status === 'pending' ? (
            <LoadingOracle divinationType={reading.type} startTime={new Date(reading.createdAt).getTime()} />
          ) : (
            <div className="oriental-sanctuary-card rounded-2xl text-center py-12 px-6 text-red-600 dark:text-red-300 border border-red-500/30">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-500 dark:text-red-400">
                <AlertIcon size={24} />
              </div>
              <p className="font-serif text-base">{lang === 'en' ? 'This reading failed to generate.' : '解讀生成失敗'}</p>
              {(() => {
                const { cause, advice } = describeFailure(reading.result, lang)
                return (
                  <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm mx-auto leading-relaxed">
                    {cause} {advice}
                  </p>
                )
              })()}
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {lang === 'en' ? 'Your Karma was not deducted.' : '機緣未被扣除。'}
              </p>
              <button
                onClick={retryReading}
                className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg font-serif font-medium text-sm transition-all hover:opacity-90 shadow-md"
                style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
              >
                <RefreshIcon size={16} />
                <span>{lang === 'en' ? 'Retry' : '重新占卜'}</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
