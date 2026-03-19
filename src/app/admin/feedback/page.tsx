'use client'

import { useEffect, useState } from 'react'

interface Feedback {
  id: string
  rating: number | null
  feedback: string | null
  createdAt: string
  user: { email: string; name: string | null }
  reading: { type: string; createdAt: string; question: string | null } | null
}

const typeLabels: Record<string, string> = {
  bazi: '八字', iching: '易經', ziwei: '紫微', qimen: '奇門', fengshui: '風水', other: '梅花六壬',
}

const stars = (n: number | null) => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—'

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [minRating, setMinRating] = useState('')
  const [maxRating, setMaxRating] = useState('')

  const fetchData = (p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '30', sort })
    if (minRating) params.set('minRating', minRating)
    if (maxRating) params.set('maxRating', maxRating)

    fetch(`/api/admin/feedback?${params}`)
      .then(r => r.json())
      .then(data => {
        setFeedbacks(data.feedbacks || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(1) }, [sort, minRating, maxRating])

  const totalPages = Math.ceil(total / 30)

  // Stats
  const avgRating = feedbacks.length > 0
    ? (feedbacks.filter(f => f.rating).reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.filter(f => f.rating).length).toFixed(1)
    : '—'

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-gold">用戶反饋</h1>
        <p className="text-white/40 text-sm mt-1">User Feedback · {total} total · avg {avgRating}★</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-white/50 text-xs block mb-1">排序 / Sort</label>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-1.5 bg-navy-800 border border-gold/20 rounded-lg text-white text-sm"
          >
            <option value="newest">最新 / Newest</option>
            <option value="oldest">最早 / Oldest</option>
            <option value="rating_high">評分高→低</option>
            <option value="rating_low">評分低→高</option>
          </select>
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">最低評分</label>
          <select
            value={minRating}
            onChange={e => setMinRating(e.target.value)}
            className="px-3 py-1.5 bg-navy-800 border border-gold/20 rounded-lg text-white text-sm"
          >
            <option value="">全部</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★+</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">最高評分</label>
          <select
            value={maxRating}
            onChange={e => setMaxRating(e.target.value)}
            className="px-3 py-1.5 bg-navy-800 border border-gold/20 rounded-lg text-white text-sm"
          >
            <option value="">全部</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★-</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-gold animate-pulse">Loading...</div>
      ) : feedbacks.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-white/40">
          <div className="text-3xl mb-2">💬</div>
          <p>暫無反饋 / No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(fb => (
            <div key={fb.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-gold text-sm tracking-wide">{stars(fb.rating)}</span>
                  {fb.reading && (
                    <span className="px-2 py-0.5 bg-gold/10 text-gold text-xs rounded-full">
                      {typeLabels[fb.reading.type] || fb.reading.type}
                    </span>
                  )}
                  <span className="text-white/40 text-xs">
                    {fb.user.name || fb.user.email}
                  </span>
                </div>
                <span className="text-white/30 text-xs flex-shrink-0">
                  {new Date(fb.createdAt).toLocaleString('zh-TW')}
                </span>
              </div>
              {fb.feedback && (
                <p className="text-white/70 text-sm bg-white/5 rounded-lg px-3 py-2 mt-2">
                  &ldquo;{fb.feedback}&rdquo;
                </p>
              )}
              {fb.reading?.question && (
                <p className="text-white/30 text-xs mt-2">❓ {fb.reading.question}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => fetchData(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm rounded border border-gold/20 text-white/60 disabled:opacity-30"
          >
            ←
          </button>
          <span className="px-3 py-1 text-sm text-white/40">{page} / {totalPages}</span>
          <button
            onClick={() => fetchData(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gold/20 text-white/60 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
