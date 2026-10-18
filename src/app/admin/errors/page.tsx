'use client'

import { useEffect, useState } from 'react'

interface FrontendError {
  id: string
  userId: string | null
  endpoint: string
  status: number | null
  error: string
  context: string | null
  userAgent: string | null
  createdAt: string
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<FrontendError[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchErrors = (p: number) => {
    setLoading(true)
    fetch(`/api/admin/errors?page=${p}&limit=30`)
      .then(r => r.json())
      .then(data => {
        setErrors(data.errors || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchErrors(1) }, [])

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-gold">前端錯誤日誌</h1>
        <p className="text-foreground/40 text-sm mt-1">Frontend Error Logs · {total} total</p>
      </div>

      {loading ? (
        <div className="text-gold animate-pulse">Loading...</div>
      ) : errors.length === 0 ? (
        <div className="card-quiet rounded-xl p-8 text-center text-foreground/40">
          <div className="text-3xl mb-2">✅</div>
          <p>暫無錯誤記錄 / No errors recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map(err => (
            <div key={err.id} className="card-quiet rounded-xl p-4 border border-red-400/10">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-red-400/10 text-red-400 text-xs rounded-full font-mono">
                    {err.status || 'ERR'}
                  </span>
                  <span className="text-foreground/80 text-sm font-mono">{err.endpoint}</span>
                </div>
                <span className="text-foreground/30 text-xs flex-shrink-0">
                  {new Date(err.createdAt).toLocaleString('zh-TW')}
                </span>
              </div>
              <p className="text-foreground/60 text-sm mb-1 break-all">{err.error}</p>
              {err.context && (
                <p className="text-foreground/30 text-xs">📋 {err.context}</p>
              )}
              {err.userId && (
                <p className="text-foreground/20 text-xs mt-1">👤 {err.userId}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => fetchErrors(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm rounded border border-gold/20 text-foreground/60 disabled:opacity-30"
          >
            ←
          </button>
          <span className="px-3 py-1 text-sm text-foreground/40">{page} / {totalPages}</span>
          <button
            onClick={() => fetchErrors(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gold/20 text-foreground/60 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
