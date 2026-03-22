'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import YinYangIcon from '@/components/YinYangIcon'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import ShareResultButton from '@/components/ShareResultButton'

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
  question: string | null
  result: string
  language: string
  createdAt: string
  targetType?: string
  familyMember?: { relation: string; name: string | null } | null
  rating?: number | null
  shareToken?: string | null
}

const typeLabels: Record<string, { 'zh-TW': string; en: string }> = {
  bazi: { 'zh-TW': '八字命理', en: 'BaZi' },
  iching: { 'zh-TW': '易經占卜', en: 'I Ching' },
  ziwei: { 'zh-TW': '紫微斗數', en: 'Zi Wei' },
  qimen: { 'zh-TW': '奇門遁甲', en: 'Qi Men' },
  fengshui: { 'zh-TW': '風水佈局', en: 'Feng Shui' },
  other: { 'zh-TW': '梅花六壬', en: 'Others' },
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { lang } = useLang()
  const router = useRouter()
  const [readings, setReadings] = useState<Reading[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetch('/api/readings')
        .then(r => r.json())
        .then(data => { setReadings(data.readings || []); setLoading(false) })
    }
  }, [session])

  const deleteReading = async (id: string) => {
    await fetch(`/api/readings/${id}`, { method: 'DELETE' })
    setReadings(r => r.filter(x => x.id !== id))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MysticalLoader lang={lang} variant="page" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-3 sm:px-4 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
        <h1 className="text-3xl font-serif text-gold mb-2">
          {lang === 'zh-TW' ? '占卜歷史' : 'Reading History'}
        </h1>
        <p className="text-white/50">
          {lang === 'zh-TW' ? `共 ${readings.length} 條記錄` : `${readings.length} readings`}
        </p>
      </motion.div>

      {readings.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-white/50">
          <div className="mb-4"><YinYangIcon size={48} /></div>
          <p>{lang === 'zh-TW' ? '還沒有占卜記錄' : 'No readings yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {readings.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <div
                className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full mr-2">
                      {typeLabels[r.type]?.[lang === 'en' ? 'en' : 'zh-TW'] || r.type}
                    </span>
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
                    <button
                      onClick={e => { e.stopPropagation(); deleteReading(r.id) }}
                      className="text-white/30 hover:text-red-400 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-white/50 text-sm mt-2 line-clamp-2">
                  {(() => {
                    try {
                      const parsed = JSON.parse(r.result)
                      const summary = parsed.sections?.overview
                        || parsed.sections?.situation
                        || parsed.interpretation
                        || (parsed.outcome ? `${parsed.palace?.inquiry || ''} → ${parsed.outcome}` : '')
                        || ''
                      return (summary || r.result).slice(0, 120)
                    } catch {
                      return r.result.slice(0, 120)
                    }
                  })()}...
                </p>
              </div>
              <AnimatePresence>
                {expanded === r.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gold/10 px-5 pb-5 pt-4"
                  >
                    <ResultRenderer result={r.result} type={r.type} />
                    <div className="mt-4">
                      <ReadingFeedback
                        readingId={r.id}
                        initialRating={r.rating}
                      />
                    </div>
                    <ShareResultButton readingId={r.id} shareToken={r.shareToken} lang={lang} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
