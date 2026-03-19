'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ResultRenderer from '@/components/results/ResultRenderer'
import MysticalLoader from '@/components/MysticalLoader'

const typeLabels: Record<string, { zh: string; en: string }> = {
  bazi: { zh: '八字命理', en: 'BaZi Analysis' },
  iching: { zh: '易經占卜', en: 'I Ching Divination' },
  ziwei: { zh: '紫微斗數', en: 'Zi Wei Dou Shu' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men Dun Jia' },
  fengshui: { zh: '風水分析', en: 'Feng Shui Analysis' },
  other: { zh: '梅花易數 / 六壬', en: 'Meihua / Liuren' },
}

interface ReadingData {
  type: string
  result: string
  language: string
  createdAt: string
  question: string | null
  inputData: Record<string, unknown>
  authorName: string | null
}

export default function PublicReadingPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReadingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public/reading/${token}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => {
        if (d) { setData(d); setLoading(false) }
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MysticalLoader lang="zh-TW" variant="page" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔮</div>
          <h1 className="text-xl font-serif text-gold mb-2">找不到此預測結果</h1>
          <p className="text-white/50 text-sm mb-6">Reading not found or has been removed</p>
          <Link href="/" className="px-6 py-2 bg-gold text-navy-950 rounded-lg font-medium hover:bg-gold-light transition-colors">
            前往玄機 / Visit Xuanji
          </Link>
        </div>
      </div>
    )
  }

  const lang = data.language === 'en' ? 'en' : 'zh-TW'
  const typeLabel = typeLabels[data.type]

  let parsedResult
  try {
    parsedResult = JSON.parse(data.result)
  } catch {
    parsedResult = null
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="glass-card rounded-2xl p-6 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl border border-gold/20 pointer-events-none" />
          <div className="text-3xl mb-2">☯</div>
          <h1 className="text-2xl font-serif text-gold mb-1">
            {typeLabel ? (lang === 'en' ? typeLabel.en : typeLabel.zh) : data.type}
          </h1>
          {data.question && (
            <p className="text-white/50 text-sm mt-2">❓ {data.question}</p>
          )}
          <div className="flex justify-center gap-4 mt-3 text-xs text-white/30">
            <span>🕐 {new Date(data.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')}</span>
            {data.authorName && <span>👤 {data.authorName}</span>}
          </div>
        </div>

        {/* Result */}
        <div className="glass-card rounded-2xl p-4 sm:p-8 mb-6">
          {parsedResult ? (
            <ResultRenderer type={data.type} result={parsedResult} />
          ) : (
            <div className="whitespace-pre-wrap text-white/80">{data.result}</div>
          )}
        </div>

        {/* CTA */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-white/60 text-sm mb-4">
            {lang === 'en'
              ? '✨ Want your own divination? Try Xuanji for free!'
              : '✨ 想知道自己的命運？來玄機免費體驗！'}
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/register"
              className="px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors"
            >
              {lang === 'en' ? '🎁 Register Free' : '🎁 免費註冊'}
            </Link>
            <Link
              href="/divination"
              className="px-6 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors"
            >
              {lang === 'en' ? '🔮 Try Now' : '🔮 立即體驗'}
            </Link>
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center mt-6 text-white/20 text-xs">
          <Link href="/" className="hover:text-gold/50 transition-colors">
            玄機 · Xuanji — 古法智慧，現代傳承
          </Link>
        </div>
      </div>
    </div>
  )
}
