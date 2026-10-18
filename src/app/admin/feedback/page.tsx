'use client'

import { useEffect, useState, useCallback } from 'react'

interface ReadingFB {
  id: string
  rating: number | null
  feedback: string | null
  createdAt: string
  user: { email: string; name: string | null }
  reading: { type: string; createdAt: string; question: string | null } | null
}

interface SiteFB {
  id: string
  rating: number | null
  feedback: string
  createdAt: string
  user: { email: string; name: string | null }
}

const typeLabels: Record<string, string> = {
  bazi: '八字', iching: '易經', ziwei: '紫微', qimen: '奇門', fengshui: '風水', meihua: '梅花易數', other: '其他',
}

const stars = (n: number | null) => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—'

export default function AdminFeedbackPage() {
  const [tab, setTab] = useState<'site' | 'reading'>('site')
  const [siteFBs, setSiteFBs] = useState<SiteFB[]>([])
  const [siteTotal, setSiteTotal] = useState(0)
  const [sitePage, setSitePage] = useState(1)
  const [readingFBs, setReadingFBs] = useState<ReadingFB[]>([])
  const [readingTotal, setReadingTotal] = useState(0)
  const [readingPage, setReadingPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [minRating, setMinRating] = useState('')
  const [maxRating, setMaxRating] = useState('')

  const fetchSite = useCallback((p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '30' })
    if (minRating) params.set('minRating', minRating)
    if (maxRating) params.set('maxRating', maxRating)
    fetch(`/api/admin/site-feedback?${params}`)
      .then(r => r.json())
      .then(data => { setSiteFBs(data.feedbacks || []); setSiteTotal(data.total || 0); setSitePage(data.page || 1) })
      .finally(() => setLoading(false))
  }, [minRating, maxRating])

  const fetchReading = useCallback((p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '30', sort })
    if (minRating) params.set('minRating', minRating)
    if (maxRating) params.set('maxRating', maxRating)
    fetch(`/api/admin/feedback?${params}`)
      .then(r => r.json())
      .then(data => { setReadingFBs(data.feedbacks || []); setReadingTotal(data.total || 0); setReadingPage(data.page || 1) })
      .finally(() => setLoading(false))
  }, [sort, minRating, maxRating])

  useEffect(() => {
    if (tab === 'site') fetchSite(1)
    else fetchReading(1)
  }, [tab, fetchSite, fetchReading])

  const totalPages = Math.ceil((tab === 'site' ? siteTotal : readingTotal) / 30)
  const currentPage = tab === 'site' ? sitePage : readingPage

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-gold">用戶反饋</h1>
        <p className="text-foreground/40 text-sm mt-1">User Feedback · {tab === 'site' ? siteTotal : readingTotal} total</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'site' as const, label: '💬 站點反饋 / Site', count: siteTotal },
          { key: 'reading' as const, label: '占卜反饋 / Reading', count: readingTotal },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === t.key ? 'bg-gold/20 text-gold border border-gold/30' : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card-quiet rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        {tab === 'reading' && (
          <div>
            <label className="text-foreground/50 text-xs block mb-1">排序 / Sort</label>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-1.5 bg-surface border border-gold/20 rounded-lg text-foreground text-sm">
              <option value="newest">最新 / Newest</option>
              <option value="oldest">最早 / Oldest</option>
              <option value="rating_high">評分高→低</option>
              <option value="rating_low">評分低→高</option>
            </select>
          </div>
        )}
        <div>
          <label className="text-foreground/50 text-xs block mb-1">最低評分</label>
          <select value={minRating} onChange={e => setMinRating(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-gold/20 rounded-lg text-foreground text-sm">
            <option value="">全部</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★+</option>)}
          </select>
        </div>
        <div>
          <label className="text-foreground/50 text-xs block mb-1">最高評分</label>
          <select value={maxRating} onChange={e => setMaxRating(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-gold/20 rounded-lg text-foreground text-sm">
            <option value="">全部</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★-</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-gold animate-pulse">Loading...</div>
      ) : (tab === 'site' ? siteFBs : readingFBs).length === 0 ? (
        <div className="card-quiet rounded-xl p-8 text-center text-foreground/40">
          <div className="text-3xl mb-2">💬</div>
          <p>暫無反饋 / No feedback yet</p>
        </div>
      ) : tab === 'site' ? (
        <div className="space-y-3">
          {siteFBs.map(fb => (
            <div key={fb.id} className="card-quiet rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-gold text-sm tracking-wide">{stars(fb.rating)}</span>
                  <span className="text-foreground/70 text-xs font-mono">
                    {fb.user.email}
                    {fb.user.name && <span className="text-foreground/40 font-sans ml-1.5">({fb.user.name})</span>}
                  </span>
                </div>
                <span className="text-foreground/30 text-xs flex-shrink-0">{new Date(fb.createdAt).toLocaleString('zh-TW')}</span>
              </div>
              <p className="text-foreground/70 text-sm bg-foreground/5 rounded-lg px-3 py-2">&ldquo;{fb.feedback}&rdquo;</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {readingFBs.map(fb => (
            <div key={fb.id} className="card-quiet rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-gold text-sm tracking-wide">{stars(fb.rating)}</span>
                  {fb.reading && (
                    <span className="px-2 py-0.5 bg-gold/10 text-gold text-xs rounded-full">
                      {typeLabels[fb.reading.type] || fb.reading.type}
                    </span>
                  )}
                  <span className="text-foreground/70 text-xs font-mono">
                    {fb.user.email}
                    {fb.user.name && <span className="text-foreground/40 font-sans ml-1.5">({fb.user.name})</span>}
                  </span>
                </div>
                <span className="text-foreground/30 text-xs flex-shrink-0">{new Date(fb.createdAt).toLocaleString('zh-TW')}</span>
              </div>
              {fb.feedback && (
                <p className="text-foreground/70 text-sm bg-foreground/5 rounded-lg px-3 py-2 mt-2">&ldquo;{fb.feedback}&rdquo;</p>
              )}
              {fb.reading?.question && (
                <p className="text-foreground/30 text-xs mt-2">❓ {fb.reading.question}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => (tab === 'site' ? fetchSite : fetchReading)(currentPage - 1)} disabled={currentPage <= 1}
            className="px-3 py-1 text-sm rounded border border-gold/20 text-foreground/60 disabled:opacity-30">←</button>
          <span className="px-3 py-1 text-sm text-foreground/40">{currentPage} / {totalPages}</span>
          <button onClick={() => (tab === 'site' ? fetchSite : fetchReading)(currentPage + 1)} disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gold/20 text-foreground/60 disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  )
}
