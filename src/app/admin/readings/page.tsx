'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { catchAndReport } from '@/lib/errorReporter'

const typeLabels: Record<string, string> = {
  bazi: '八字',
  iching: '易經',
  ziwei: '紫微',
  qimen: '奇門',
  fengshui: '風水',
  other: '梅花/其他',
}

interface ReadingRow {
  id: string
  type: string
  modelTier: string
  question: string | null
  inputData: Record<string, string>
  language: string
  targetType: string
  rating: number | null
  createdAt: string
  user: { id: string; name: string | null; email: string | null }
  familyMember: { name: string | null; relation: string } | null
}

export default function AdminReadingsPage() {
  const [readings, setReadings] = useState<ReadingRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchReadings = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (typeFilter) params.set('type', typeFilter)
    fetch(`/api/admin/readings?${params}`)
      .then(r => r.json())
      .then(data => {
        setReadings(data.readings || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
        setLoading(false)
      })
      .catch(err => { catchAndReport('/api/admin/readings')(err); setLoading(false) })
  }, [page, typeFilter])

  useEffect(() => { fetchReadings() }, [fetchReadings])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-gold">🔮 占卜日誌</h1>
          <p className="text-white/40 text-sm mt-1">共 {total} 條記錄</p>
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-sm bg-navy-900 border border-gold/20 text-white/80 focus:outline-none focus:border-gold/50"
          >
            <option value="">全部類型</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white/40 py-20">載入中...</div>
      ) : readings.length === 0 ? (
        <div className="text-center text-white/40 py-20">暫無記錄</div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-white/40 uppercase">
            <div className="col-span-2">時間</div>
            <div className="col-span-2">用戶</div>
            <div className="col-span-1">類型</div>
            <div className="col-span-1">模型</div>
            <div className="col-span-2">對象</div>
            <div className="col-span-2">生辰</div>
            <div className="col-span-1">評分</div>
            <div className="col-span-1">操作</div>
          </div>

          {readings.map(r => (
            <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 rounded-lg bg-navy-900/50 border border-gold/10 hover:border-gold/30 transition-colors items-center text-sm">
              <div className="col-span-2 text-white/50 text-xs">
                {new Date(r.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="col-span-2 text-white/70 truncate" title={r.user.email || ''}>
                {r.user.name || r.user.email?.split('@')[0] || 'Unknown'}
              </div>
              <div className="col-span-1">
                <span className="px-2 py-0.5 rounded text-xs bg-gold/10 text-gold border border-gold/20">
                  {typeLabels[r.type] || r.type}
                </span>
              </div>
              <div className="col-span-1 text-white/50 text-xs">
                {r.modelTier === 'model2' ? '✨premium' : 'standard'}
              </div>
              <div className="col-span-2 text-white/60 text-xs">
                {r.targetType === 'family' && r.familyMember
                  ? `${r.familyMember.relation}${r.familyMember.name ? ` (${r.familyMember.name})` : ''}`
                  : '本人'}
              </div>
              <div className="col-span-2 text-white/50 text-xs">
                {r.inputData?.birthDate || '-'}
                {r.inputData?.birthTime ? ` ${r.inputData.birthTime}` : ''}
              </div>
              <div className="col-span-1 text-xs">
                {r.rating ? `${'⭐'.repeat(r.rating)}` : <span className="text-white/20">-</span>}
              </div>
              <div className="col-span-1">
                <Link
                  href={`/admin/readings/${r.id}`}
                  className="text-gold/60 hover:text-gold text-xs underline"
                >
                  詳情
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-gold/20 text-gold/60 hover:text-gold disabled:opacity-30"
          >
            上一頁
          </button>
          <span className="px-3 py-1.5 text-sm text-white/40">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-sm border border-gold/20 text-gold/60 hover:text-gold disabled:opacity-30"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  )
}
