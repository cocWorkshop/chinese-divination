'use client'

import { useEffect, useState } from 'react'
import YinYangIcon from '@/components/YinYangIcon'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ResultRenderer from '@/components/results/ResultRenderer'
import MysticalLoader from '@/components/MysticalLoader'
import { catchAndReport } from '@/lib/errorReporter'

const typeLabels: Record<string, { zh: string; en: string }> = {
  bazi: { zh: '八字命理', en: 'BaZi Analysis' },
  iching: { zh: '易經占卜', en: 'I Ching Divination' },
  ziwei: { zh: '紫微斗數', en: 'Zi Wei Dou Shu' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men Dun Jia' },
  fengshui: { zh: '風水分析', en: 'Feng Shui Analysis' },
  other: { zh: '梅花易數 / 六壬', en: 'Meihua / Liuren' },
}

const genderLabels: Record<string, { zh: string; en: string }> = {
  male: { zh: '男', en: 'Male' },
  female: { zh: '女', en: 'Female' },
}

const timeLabels: Record<string, string> = {
  zi: '子時 (23-01)', chou: '丑時 (01-03)', yin: '寅時 (03-05)', mao: '卯時 (05-07)',
  chen: '辰時 (07-09)', si: '巳時 (09-11)', wu: '午時 (11-13)', wei: '未時 (13-15)',
  shen: '申時 (15-17)', you: '酉時 (17-19)', xu: '戌時 (19-21)', hai: '亥時 (21-23)',
}

interface ReadingData {
  type: string
  result: string
  language: string
  createdAt: string
  question: string | null
  inputData: Record<string, unknown>
  subjectName: string | null
  birthInfo: { birthDate?: string; birthTime?: string; gender?: string; calendarType?: string } | null
  targetType: string
}

export default function PublicReadingPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReadingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Hide navbar, chat widget, and remove top padding for public page
  useEffect(() => {
    const nav = document.querySelector('nav')
    const chat = document.querySelector('.fixed.bottom-6')
    const main = document.querySelector('main')
    const footer = document.querySelector('footer')
    if (nav) nav.style.display = 'none'
    if (chat) (chat as HTMLElement).style.display = 'none'
    if (main) main.style.paddingTop = '0'
    if (footer) footer.style.display = 'none'
    return () => {
      if (nav) nav.style.display = ''
      if (chat) (chat as HTMLElement).style.display = ''
      if (main) main.style.paddingTop = ''
      if (footer) footer.style.display = ''
    }
  }, [])

  useEffect(() => {
    fetch(`/api/public/reading/${token}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => {
        if (d) { setData(d); setLoading(false) }
      })
      .catch((err) => { catchAndReport('/api/claim')(err); setNotFound(true); setLoading(false) })
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

  // ResultRenderer expects the raw string and parses internally
  const resultString = data.result

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="glass-card rounded-2xl p-6 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl border border-gold/20 pointer-events-none" />
          <div className="mb-2"><YinYangIcon size={30} /></div>
          <h1 className="text-2xl font-serif text-gold mb-1">
            {typeLabel ? (lang === 'en' ? typeLabel.en : typeLabel.zh) : data.type}
          </h1>
          {data.question && (
            <p className="text-white/50 text-sm mt-2">❓ {data.question}</p>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs text-white/30">
            <span>🕐 {new Date(data.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')}</span>
            {data.subjectName && <span>👤 {data.subjectName}</span>}
          </div>
          {data.birthInfo && (data.type === 'bazi' || data.type === 'ziwei' || data.type === 'qimen' || data.type === 'other') && (
            <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs text-white/40">
              {data.birthInfo.birthDate && (
                <span>📅 {data.birthInfo.birthDate}{data.birthInfo.calendarType === 'lunar' ? ' (農曆)' : ''}</span>
              )}
              {data.birthInfo.birthTime && (
                <span>🕐 {timeLabels[data.birthInfo.birthTime] || data.birthInfo.birthTime}</span>
              )}
              {data.birthInfo.gender && (
                <span>{data.birthInfo.gender === 'male' ? '♂' : '♀'} {lang === 'en' ? genderLabels[data.birthInfo.gender]?.en : genderLabels[data.birthInfo.gender]?.zh}</span>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="glass-card rounded-2xl p-4 sm:p-8 mb-6">
          <ResultRenderer type={data.type} result={resultString} isShared />
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
