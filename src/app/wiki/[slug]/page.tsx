'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'

const CATEGORY_LABELS: Record<string, string> = {
  general: '綜合', bazi: '八字', ziwei: '紫微斗數', iching: '易經',
  qimen: '奇門遁甲', fengshui: '風水', meihua: '梅花易數', liuyao: '六爻',
}

interface Article {
  slug: string; title: string; summary: string | null
  content: string; category: string; coverImage: string | null; updatedAt: string
}

export default function WikiArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/wiki/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setArticle(d.article); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <YinYangIcon size={48} className="animate-spin" />
    </div>
  )

  if (notFound || !article) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
      <p className="text-white/40">文章不存在</p>
      <Link href="/wiki" className="text-sm" style={{ color: 'var(--gold)' }}>← 返回知識庫</Link>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="mb-6 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Link href="/wiki" className="hover:underline" style={{ color: 'var(--gold)' }}>知識庫</Link>
          <span className="mx-2">›</span>
          <span>{CATEGORY_LABELS[article.category] || article.category}</span>
          <span className="mx-2">›</span>
          <span style={{ color: 'var(--text-secondary)' }}>{article.title}</span>
        </div>

        {/* Cover image */}
        {article.coverImage && (
          <div className="w-full h-48 md:h-64 rounded-xl mb-6 bg-cover bg-center"
            style={{ backgroundImage: `url(${article.coverImage})` }} />
        )}

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-serif mb-3" style={{ color: 'var(--gold)' }}>{article.title}</h1>
          {article.summary && (
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{article.summary}</p>
          )}
          <p className="text-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
            {CATEGORY_LABELS[article.category]} · 更新於 {new Date(article.updatedAt).toLocaleDateString('zh-TW')}
          </p>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-6 md:p-8"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-gold prose-headings:font-serif
            prose-a:text-blue-400 prose-strong:text-white
            prose-table:text-sm prose-th:text-gold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>
        </motion.div>

        {/* Footer nav */}
        <div className="mt-8 text-center">
          <Link href="/wiki" className="text-sm hover:underline" style={{ color: 'var(--gold)' }}>
            ← 返回知識庫
          </Link>
        </div>
      </div>
    </div>
  )
}
