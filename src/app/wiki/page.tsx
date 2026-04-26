'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'
import { useLang } from '@/components/LanguageContext'

interface Article {
  slug: string; title: string; summary: string | null
  category: string; coverImage: string | null; updatedAt: string
}

const CATEGORIES = [
  { value: 'all', label: '全部', en: 'All', icon: '📚' },
  { value: 'bazi', label: '八字', en: 'BaZi', icon: '🏷️' },
  { value: 'ziwei', label: '紫微斗數', en: 'Zi Wei', icon: '⭐' },
  { value: 'iching', label: '易經', en: 'I Ching', icon: '☯' },
  { value: 'qimen', label: '奇門遁甲', en: 'Qi Men', icon: '🧭' },
  { value: 'fengshui', label: '風水', en: 'Feng Shui', icon: '🏠' },
  { value: 'meihua', label: '梅花易數', en: 'Mei Hua', icon: '🌸' },
  { value: 'liuyao', label: '六爻', en: 'Liu Yao', icon: '🎲' },
  { value: 'general', label: '綜合', en: 'General', icon: '📖' },
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
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <YinYangIcon size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-serif" style={{ color: 'var(--gold)' }}>玄機知識庫</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>探索中國傳統預測學的智慧</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilter(c.value)}
              className="px-4 py-1.5 rounded-full text-xs transition-all"
              style={{
                backgroundColor: filter === c.value ? 'var(--gold)' : 'var(--accent-bg)',
                color: filter === c.value ? '#000' : 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Articles grid */}
        {loading ? (
          <div className="text-center text-white/40 py-12 animate-pulse">
            {isEn ? 'Loading...' : '載入中...'}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center text-white/40 py-12">
            {isEn ? 'No articles yet' : '暫無文章'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((a, i) => (
              <motion.div key={a.slug}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <Link href={`/wiki/${a.slug}`}
                  className="block rounded-xl p-5 transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  {a.coverImage && (
                    <div className="w-full h-32 rounded-lg mb-3 bg-cover bg-center"
                      style={{ backgroundImage: `url(${a.coverImage})` }} />
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{CATEGORIES.find(c => c.value === a.category)?.icon || '📖'}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-serif font-medium" style={{ color: 'var(--gold)' }}>{a.title}</h2>
                      {a.summary && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{a.summary}</p>}
                      <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                        {CATEGORIES.find(c => c.value === a.category)?.label} · {new Date(a.updatedAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
