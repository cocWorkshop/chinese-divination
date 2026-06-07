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

const typeIcons: Record<string, string> = {
  bazi: '🏛️', ziwei: '⭐', iching: '☯', qimen: '🧭',
  liuyao: '🪙', meihua: '🌸', fengshui: '🏯', other: '📖',
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
  familyMember?: { relation: string; name: string | null } | null
  rating?: number | null
  shareToken?: string | null
  inputData?: Record<string, unknown>
}

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
    try {
      await fetch(`/api/readings/${reading.id}`, { method: 'DELETE' })
    } catch { /* navigate regardless */ }
    router.push(`/divination/${reading.type}`)
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
        <div className="glass-card rounded-2xl p-12 text-center text-white/50">
          <p className="text-2xl mb-2">🔍</p>
          <p>{lang === 'en' ? 'Reading not found' : '找不到此記錄'}</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full min-w-0">
          {/* Lightweight header for transient states. */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full inline-flex items-center gap-1">
              <span>{typeIcons[reading.type] ?? '📖'}</span>
              {typeLabels[reading.type]?.[lang === 'en' ? 'en' : 'zh-TW'] || reading.type}
            </span>
            {reading.targetType === 'family' && reading.familyMember && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                {lang === 'en'
                  ? `For ${relationLabels[reading.familyMember.relation]?.en || reading.familyMember.relation}${reading.familyMember.name ? ` (${reading.familyMember.name})` : ''}`
                  : `為${relationLabels[reading.familyMember.relation]?.zh || reading.familyMember.relation}${reading.familyMember.name ? `（${reading.familyMember.name}）` : ''}`}
              </span>
            )}
          </div>
          {reading.question && (
            <p className="text-white/70 text-sm mb-5">{reading.question}</p>
          )}

          {reading.status === 'pending' ? (
            <LoadingOracle divinationType={reading.type} startTime={new Date(reading.createdAt).getTime()} />
          ) : (
            <div className="glass-card rounded-2xl text-center py-12 text-red-300">
              <p className="text-2xl mb-2">⚠️</p>
              <p>{lang === 'en' ? 'This reading failed to generate.' : '解讀生成失敗'}</p>
              <p className="text-sm text-white/40 mt-1">
                {lang === 'en' ? 'Your Karma was not deducted. Please try again.' : '機緣未被扣除，請重新嘗試。'}
              </p>
              <button
                onClick={retryReading}
                className="mt-4 px-6 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
              >
                {lang === 'en' ? '🔄 Retry' : '🔄 重新占卜'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
