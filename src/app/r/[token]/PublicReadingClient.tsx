'use client'

import { useEffect, useState } from 'react'
import YinYangIcon from '@/components/YinYangIcon'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ResultRenderer from '@/components/results/ResultRenderer'
import MysticalLoader from '@/components/MysticalLoader'
import { catchAndReport } from '@/lib/errorReporter'
import { useTheme } from '@/components/ThemeProvider'
import { DivinationIcon, SunMoonIcon } from '@/components/DivinationIcons'
import FullPageFlameEffect from '@/components/reading/FullPageFlameEffect'

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
  chatMessages?: { role: 'user' | 'assistant'; content: string }[]
}

export default function PublicReadingClient({ token: initialToken }: { token?: string }) {
  const params = useParams<{ token?: string }>()
  const token = initialToken || params?.token
  const [data, setData] = useState<ReadingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shareBonus, setShareBonus] = useState<{divination: number, chat: number, shareBonus?: number, registerBonus?: number} | null>(null)
  const { theme, toggleTheme } = useTheme()

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
    if (!token) {
      setNotFound(true)
      setLoading(false)
      return
    }

    fetch(`/api/public/reading/${token}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => {
        if (d) { setData(d); setLoading(false) }
      })
      .catch((err) => { catchAndReport('/api/claim')(err); setNotFound(true); setLoading(false) })
    fetch('/api/share/bonus').then(r => r.json()).then(setShareBonus).catch(catchAndReport('/api/share/bonus'))
  }, [token])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <MysticalLoader lang="zh-TW" variant="page" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="oriental-sanctuary-card rounded-2xl p-5 sm:p-8 text-center max-w-md">
          <div className="flex justify-center mb-4"><DivinationIcon type="bazi" size={40} /></div>
          <h1 className="text-xl font-serif text-gold mb-2">找不到此預測結果</h1>
          <p className="text-[var(--text-muted)] text-sm mb-6">Reading not found or has been removed</p>
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
    <div className="flex-1 py-6 sm:py-8 px-3 sm:px-4">
      <FullPageFlameEffect lang={lang} />
      <div className="max-w-3xl mx-auto">
        {/* Top Control Bar (Issue #146 Theme Switching) */}
        <div className="flex items-center justify-between py-2 px-1 mb-4">
          <Link href="/" className="flex items-center gap-2 text-gold hover:opacity-80 transition-opacity">
            <YinYangIcon size={22} />
            <span className="font-serif font-bold text-base tracking-wider">玄機 · Xuanji</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 px-2.5 rounded-lg border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <SunMoonIcon size={14} isDark={theme === 'dark'} />
              <span>{theme === 'dark' ? (lang === 'en' ? 'Light' : '明亮') : (lang === 'en' ? 'Dark' : '幽暗')}</span>
            </button>
            <Link
              href="/divination"
              className="px-3 py-1.5 text-xs rounded-lg bg-gold text-navy-950 font-medium hover:bg-gold-light transition-colors"
            >
              {lang === 'en' ? 'Try Free' : '免費體驗'}
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="oriental-sanctuary-card rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-center relative overflow-hidden">
          <div className="mb-2"><DivinationIcon type={data.type} size={36} /></div>
          <h1 className="text-2xl font-serif text-gold mb-1">
            {typeLabel ? (lang === 'en' ? typeLabel.en : typeLabel.zh) : data.type}
          </h1>
          {data.question && (
            <p className="text-[var(--text-secondary)] text-sm mt-2">{data.question}</p>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-[var(--text-muted)] font-serif">
            <span>{lang === 'en' ? 'Date: ' : '推演時間：'}{new Date(data.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')}</span>
            {data.subjectName && <span>{lang === 'en' ? 'Querent: ' : '命主：'}{data.subjectName}</span>}
          </div>
          {data.birthInfo && (data.type === 'bazi' || data.type === 'ziwei' || data.type === 'qimen' || data.type === 'other') && (
            <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-[var(--text-secondary)] border-t border-gold/10 pt-2">
              {data.birthInfo.birthDate && (
                <span>{lang === 'en' ? 'Birth: ' : '生辰：'}{data.birthInfo.birthDate}{data.birthInfo.calendarType === 'lunar' ? ' (農曆)' : ''}</span>
              )}
              {data.birthInfo.birthTime && (
                <span>{lang === 'en' ? 'Hour: ' : '時辰：'}{timeLabels[data.birthInfo.birthTime] || data.birthInfo.birthTime}</span>
              )}
              {data.birthInfo.gender && (
                <span>{lang === 'en' ? 'Gender: ' : '乾坤：'}{lang === 'en' ? genderLabels[data.birthInfo.gender]?.en : genderLabels[data.birthInfo.gender]?.zh}</span>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="oriental-sanctuary-card rounded-2xl p-4 sm:p-8 mb-6">
          <ResultRenderer type={data.type} result={resultString} isShared chatMessages={data.chatMessages} />
        </div>

        {/* CTA */}
        <div className="oriental-sanctuary-card rounded-2xl p-4 sm:p-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            {lang === 'en'
              ? 'Want your own divination? Try Xuanji for free!'
              : '想知道自己的命運？來玄機免費體驗！'}
          </p>
          {shareBonus && (
            <p className="text-xs mb-4" style={{ color: 'var(--gold)' }}>
              {lang === 'en'
                ? `Register now and get ${shareBonus.registerBonus || 6} Karma for free!`
                : `新用戶註冊即獲得 ${shareBonus.registerBonus || 6} 點機緣！`}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Link
              href="/register"
              className="px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors"
            >
              {lang === 'en' ? 'Register Free' : '免費註冊'}
            </Link>
            <Link
              href="/divination"
              className="px-6 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors"
            >
              {lang === 'en' ? 'Try Now' : '立即體驗'}
            </Link>
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center mt-6 text-[var(--text-muted)] text-xs">
          <Link href="/" className="hover:text-gold/50 transition-colors">
            玄機 · Xuanji — 古法智慧，現代傳承
          </Link>
        </div>
      </div>
    </div>
  )
}
