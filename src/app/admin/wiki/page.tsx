'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface Article {
  id: string; slug: string; title: string; summary: string | null
  category: string; published: boolean; sortOrder: number; updatedAt: string
}

const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'general', label: '綜合' },
  { value: 'bazi', label: '八字' },
  { value: 'ziwei', label: '紫微斗數' },
  { value: 'iching', label: '易經' },
  { value: 'qimen', label: '奇門遁甲' },
  { value: 'fengshui', label: '風水' },
  { value: 'meihua', label: '梅花易數' },
  { value: 'liuyao', label: '六爻' },
]

export default function WikiAdmin() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = () => {
    fetch(`/api/admin/wiki?category=${filter}`).then(r => r.json()).then(d => {
      setArticles(d.articles || []); setLoading(false)
    })
  }
  useEffect(load, [filter])

  const toggle = async (id: string, published: boolean) => {
    await fetch(`/api/admin/wiki/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('確定刪除此文章？')) return
    await fetch(`/api/admin/wiki/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-gold">Wiki 知識庫</h1>
          <p className="text-foreground/40 text-sm mt-1">管理占卜知識文章</p>
        </div>
        <Link href="/admin/wiki/new"
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--gold)', color: '#000' }}>
          ✍️ 新建文章
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilter(c.value)}
            className="px-3 py-1 rounded-full text-xs transition-all"
            style={{
              backgroundColor: filter === c.value ? 'var(--gold)' : 'var(--accent-bg)',
              color: filter === c.value ? '#000' : 'var(--text-secondary)',
              border: '1px solid var(--card-border)',
            }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Articles list */}
      <div className="space-y-3">
        {articles.map(a => (
          <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', opacity: a.published ? 1 : 0.6 }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/admin/wiki/${a.id}`} className="text-gold hover:underline text-sm font-medium">{a.title}</Link>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  backgroundColor: a.published ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)',
                  color: a.published ? '#22c55e' : '#9ca3af',
                }}>{a.published ? '已發布' : '草稿'}</span>
                <span className="text-xs text-foreground/30">{CATEGORIES.find(c => c.value === a.category)?.label}</span>
              </div>
              {a.summary && <p className="text-xs text-foreground/40 mt-1 line-clamp-1">{a.summary}</p>}
              <p className="text-xs text-foreground/20 mt-1">/wiki/{a.slug} · 排序: {a.sortOrder} · {new Date(a.updatedAt).toLocaleDateString('zh-TW')}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/wiki/${a.id}`}
                className="px-3 py-1 rounded-lg text-xs bg-foreground/5 border border-line/10 text-foreground/60 hover:text-foreground">
                ✏️ 編輯
              </Link>
              <button onClick={() => toggle(a.id, !a.published)}
                className="px-3 py-1 rounded-lg text-xs bg-foreground/5 border border-line/10 text-foreground/60 hover:text-foreground">
                {a.published ? '⏸ 下架' : '▶ 發布'}
              </button>
              <button onClick={() => remove(a.id)}
                className="px-3 py-1 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300">
                🗑
              </button>
            </div>
          </motion.div>
        ))}
        {articles.length === 0 && <p className="text-foreground/40 text-sm text-center py-8">暫無文章</p>}
      </div>
    </div>
  )
}
