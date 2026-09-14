'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'
import { DivinationIcon, SunMoonIcon, MasterSageIcon } from '@/components/DivinationIcons'
import BackButton from '@/components/BackButton'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'

interface Article {
  slug: string
  title: string
  summary: string | null
  category: string
  coverImage: string | null
  updatedAt: string
}

const CATEGORIES = [
  { value: 'all', label: '全部', en: 'All', renderIcon: (cls: string) => <SunMoonIcon className={cls} /> },
  { value: 'bazi', label: '八字', en: 'BaZi', renderIcon: (cls: string) => <DivinationIcon type="bazi" className={cls} /> },
  { value: 'ziwei', label: '紫微斗數', en: 'Zi Wei', renderIcon: (cls: string) => <DivinationIcon type="ziwei" className={cls} /> },
  { value: 'iching', label: '易經', en: 'I Ching', renderIcon: (cls: string) => <DivinationIcon type="iching" className={cls} /> },
  { value: 'qimen', label: '奇門遁甲', en: 'Qi Men', renderIcon: (cls: string) => <DivinationIcon type="qimen" className={cls} /> },
  { value: 'fengshui', label: '風水', en: 'Feng Shui', renderIcon: (cls: string) => <DivinationIcon type="fengshui" className={cls} /> },
  { value: 'meihua', label: '梅花易數', en: 'Mei Hua', renderIcon: (cls: string) => <DivinationIcon type="meihua" className={cls} /> },
  { value: 'liuyao', label: '六爻', en: 'Liu Yao', renderIcon: (cls: string) => <DivinationIcon type="liuyao" className={cls} /> },
  { value: 'general', label: '綜合', en: 'General', renderIcon: (cls: string) => <MasterSageIcon className={cls} /> },
]

export default function WikiPage() {
  const { lang } = useLang()
  const isEn = lang === 'en'
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/wiki?category=${filter}`)
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setLoading(false) })
  }, [filter])

  return (
    <div className="flex-1 min-h-screen py-8 sm:py-12 pb-24 px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(212,168,83,0.16)]">
          <div className="flex items-center gap-3">
            <BackButton fallbackHref="/divination" />
            <nav className="flex items-center gap-1.5 text-xs text-white/50 font-serif" aria-label="Breadcrumb">
              <Link href="/divination" className="hover:text-gold transition-colors">
                {T(lang, '占卜大廳', 'Divination')}
              </Link>
              <span>/</span>
              <span className="text-gold">{T(lang, '易學知識庫', 'Wiki')}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/divination"
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all border border-gold/25 hover:border-gold/50 text-white/70 hover:text-gold bg-gold/5 min-h-[36px]"
            >
              <DivinationIcon type="bazi" size={14} color="currentColor" />
              <span>{T(lang, '前往占卜大廳', 'Divination Sanctuary')}</span>
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="text-center">
          <YinYangIcon size={44} className="mx-auto mb-3 text-gold" />
          <h1 className="text-2xl sm:text-3xl font-serif tracking-wide text-gold">
            {T(lang, '玄機易道典籍庫', 'XuanJi Metaphysics Archive')}
          </h1>
          <p className="text-xs sm:text-sm mt-1.5 font-serif text-white/60">
            {T(lang, '究天人之際 · 通古今之變 · 探索東方正統命理哲學', 'Explore ancient wisdom and orthodox Chinese divination')}
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className="px-4 py-2 min-h-[44px] rounded-full text-xs font-serif transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              style={{
                backgroundColor: filter === c.value ? 'var(--gold)' : 'var(--accent-bg)',
                color: filter === c.value ? '#000' : 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
              }}
            >
              {c.renderIcon('w-3.5 h-3.5')}
              <span>{isEn ? c.en : c.label}</span>
            </button>
          ))}
        </div>

        {/* Articles grid */}
        {loading ? (
          <div className="text-center text-white/40 py-16 animate-pulse font-serif text-sm">
            {isEn ? 'Consulting archive...' : '載入典籍中...'}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center text-white/40 py-16 font-serif oriental-sanctuary-card p-8 rounded-2xl">
            <p className="text-sm">{isEn ? 'No articles yet in this category.' : '此門類暫無收錄典籍。'}</p>
            <Link href="/divination" className="inline-flex items-center gap-1 mt-4 text-xs text-gold hover:underline">
              <span>{T(lang, '前往占卜大廳實踐起卦 →', 'Practice divination now →')}</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((a, i) => {
              const catConfig = CATEGORIES.find(c => c.value === a.category) || CATEGORIES[0]
              return (
                <motion.div
                  key={a.slug}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/wiki/${a.slug}`}
                    className="block oriental-sanctuary-card rounded-xl p-5 transition-all hover:scale-[1.01] shadow-sm hover:border-gold/40 h-full flex flex-col justify-between"
                  >
                    {a.coverImage && (
                      <div
                        className="w-full h-32 rounded-lg mb-3 bg-cover bg-center border border-gold/15"
                        style={{ backgroundImage: `url(${a.coverImage})` }}
                      />
                    )}
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold flex-shrink-0 mt-0.5 shadow-sm">
                          {catConfig.renderIcon('w-4 h-4')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-sm font-serif font-medium text-gold line-clamp-1">{a.title}</h2>
                          {a.summary && (
                            <p className="text-xs mt-1.5 line-clamp-2 text-white/60 font-serif leading-relaxed">
                              {a.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-[rgba(212,168,83,0.12)] flex items-center justify-between text-[11px] text-white/40 font-serif">
                      <span className="stamp-gold text-[10px]">{isEn ? catConfig.en : catConfig.label}</span>
                      <span>{new Date(a.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'zh-TW')}</span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Explore Hall Footer Banner */}
        <div className="oriental-sanctuary-card p-6 rounded-2xl border border-gold/25 text-center space-y-3 bg-gradient-to-r from-gold/5 via-navy-900/60 to-gold/5">
          <h3 className="font-serif text-base text-gold">
            {T(lang, '融會易學經緯 · 實踐天機推演', 'Integrate Wisdom and Practice')}
          </h3>
          <p className="text-xs text-white/60 font-serif max-w-md mx-auto">
            {T(lang, '若心有未決，不若立卦明心。七大正統法門，大師隨侍解惑。', 'Seek answers directly through our 7 classic divination systems.')}
          </p>
          <div className="pt-1">
            <Link
              href="/divination"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-serif text-xs font-semibold bg-gold hover:bg-gold-light text-navy-950 transition-all shadow-md active:scale-[0.98]"
            >
              <span>✦</span>
              <span>{T(lang, '前往易學占卜大廳', 'Enter Divination Sanctuary')}</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
