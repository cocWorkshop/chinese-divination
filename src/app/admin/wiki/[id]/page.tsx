'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const CATEGORIES = [
  { value: 'general', label: '綜合' },
  { value: 'bazi', label: '八字' },
  { value: 'ziwei', label: '紫微斗數' },
  { value: 'iching', label: '易經' },
  { value: 'qimen', label: '奇門遁甲' },
  { value: 'fengshui', label: '風水' },
  { value: 'meihua', label: '梅花易數' },
  { value: 'liuyao', label: '六爻' },
]

interface Form {
  title: string; slug: string; summary: string; content: string
  category: string; coverImage: string; published: boolean; sortOrder: number
}

export default function WikiEditor() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'
  const [form, setForm] = useState<Form>({
    title: '', slug: '', summary: '', content: '',
    category: 'general', coverImage: '', published: false, sortOrder: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/admin/wiki/${id}`).then(r => r.json()).then(d => {
        if (d.article) {
          setForm({
            title: d.article.title,
            slug: d.article.slug,
            summary: d.article.summary || '',
            content: d.article.content,
            category: d.article.category,
            coverImage: d.article.coverImage || '',
            published: d.article.published,
            sortOrder: d.article.sortOrder,
          })
          setAutoSlug(false)
        }
      })
    }
  }, [id, isNew])

  const updateField = useCallback((key: keyof Form, value: string | boolean | number) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Auto-generate slug from title for new articles
      if (key === 'title' && autoSlug) {
        next.slug = (value as string).toLowerCase()
          .replace(/[\u4e00-\u9fff]/g, '') // remove Chinese chars
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        if (!next.slug && value) {
          // If title is all Chinese, use pinyin-style or timestamp
          next.slug = `article-${Date.now().toString(36)}`
        }
      }
      return next
    })
  }, [autoSlug])

  const save = async () => {
    setSaving(true)
    setError('')
    const url = isNew ? '/api/admin/wiki' : `/api/admin/wiki/${id}`
    const method = isNew ? 'POST' : 'PATCH'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success || data.article) {
      router.push('/admin/wiki')
    } else {
      setError(data.error || '保存失敗')
    }
    setSaving(false)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-gold">{isNew ? '新建文章' : '編輯文章'}</h1>
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)}
            className="px-4 py-2 rounded-lg text-xs bg-foreground/5 border border-line/10 text-foreground/60 hover:text-foreground">
            {preview ? '✏️ 編輯' : '👁 預覽'}
          </button>
          <button onClick={() => router.push('/admin/wiki')}
            className="px-4 py-2 rounded-lg text-xs bg-foreground/5 border border-line/10 text-foreground/60 hover:text-foreground">
            ← 返回列表
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <input type="text" value={form.title} placeholder="文章標題"
            onChange={e => updateField('title', e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-lg bg-foreground/5 border border-line/10 text-foreground placeholder-foreground/20 font-serif" />

          {preview ? (
            <div className="rounded-xl p-6 min-h-[500px] prose prose-invert prose-sm max-w-none"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
            </div>
          ) : (
            <textarea value={form.content} placeholder="Markdown 內容..."
              onChange={e => updateField('content', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm bg-foreground/5 border border-line/10 text-foreground placeholder-foreground/20 font-mono min-h-[500px] resize-y" />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div>
              <label className="text-xs text-foreground/40 block mb-1">Slug (URL路徑)</label>
              <input type="text" value={form.slug}
                onChange={e => { setAutoSlug(false); updateField('slug', e.target.value) }}
                className="w-full px-3 py-2 rounded-lg text-sm bg-foreground/5 border border-line/10 text-foreground font-mono" />
              <p className="text-xs text-foreground/20 mt-1">/wiki/{form.slug || '...'}</p>
            </div>

            <div>
              <label className="text-xs text-foreground/40 block mb-1">摘要</label>
              <textarea value={form.summary} placeholder="簡短描述..."
                onChange={e => updateField('summary', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-foreground/5 border border-line/10 text-foreground placeholder-foreground/20 h-20 resize-none" />
            </div>

            <div>
              <label className="text-xs text-foreground/40 block mb-1">分類</label>
              <select value={form.category} onChange={e => updateField('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-foreground/5 border border-line/10 text-foreground">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-foreground/40 block mb-1">封面圖片 URL</label>
              <input type="text" value={form.coverImage} placeholder="https://..."
                onChange={e => updateField('coverImage', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-foreground/5 border border-line/10 text-foreground placeholder-foreground/20" />
            </div>

            <div>
              <label className="text-xs text-foreground/40 block mb-1">排序 (越小越前)</label>
              <input type="number" value={form.sortOrder}
                onChange={e => updateField('sortOrder', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-foreground/5 border border-line/10 text-foreground" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.published}
                onChange={e => updateField('published', e.target.checked)}
                className="rounded" />
              <span className="text-sm text-foreground/60">立即發布</span>
            </label>

            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all"
              style={{ backgroundColor: 'var(--gold)', color: '#000' }}>
              {saving ? '保存中...' : isNew ? '創建文章' : '保存修改'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
