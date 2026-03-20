'use client'

import { useEffect, useState, useCallback } from 'react'

type Tab = 'llm' | 'errors'

interface LogEntry {
  id: string; userId: string | null; endpoint: string; model: string; modelTier: string | null
  promptTokens: number; completionTokens: number; totalTokens: number; latencyMs: number
  status: string; errorMessage: string | null; inputPreview: string | null; outputPreview: string | null
  createdAt: string; user?: { email: string; name: string | null }
}

interface FrontendError {
  id: string; userId: string | null; endpoint: string; status: number | null
  error: string; context: string | null; userAgent: string | null; createdAt: string
  user?: { email: string; name: string | null } | null
}

interface LlmStats { totalCalls: number; totalTokens: number; avgLatencyMs: number; errorCount: number }

export default function AdminSystemLogs() {
  const [tab, setTab] = useState<Tab>('llm')

  // LLM state
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [llmTotal, setLlmTotal] = useState(0)
  const [llmPage, setLlmPage] = useState(1)
  const [llmPages, setLlmPages] = useState(1)
  const [llmStats, setLlmStats] = useState<LlmStats>({ totalCalls: 0, totalTokens: 0, avgLatencyMs: 0, errorCount: 0 })
  const [llmFilter, setLlmFilter] = useState('all')
  const [llmLoading, setLlmLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Error state
  const [errors, setErrors] = useState<FrontendError[]>([])
  const [errTotal, setErrTotal] = useState(0)
  const [errPage, setErrPage] = useState(1)
  const [errPages, setErrPages] = useState(1)
  const [errLoading, setErrLoading] = useState(true)

  const fetchLogs = useCallback((p: number, filter: string) => {
    setLlmLoading(true)
    fetch(`/api/admin/logs?page=${p}&limit=30&filter=${filter}`)
      .then(r => r.json())
      .then(d => {
        setLogs(d.logs || [])
        setLlmTotal(d.total || 0)
        setLlmPage(d.page || 1)
        setLlmPages(d.pages || 1)
        if (d.stats) setLlmStats(d.stats)
      })
      .finally(() => setLlmLoading(false))
  }, [])

  const fetchErrors = useCallback((p: number) => {
    setErrLoading(true)
    fetch(`/api/admin/errors?page=${p}&limit=30`)
      .then(r => r.json())
      .then(d => {
        setErrors(d.errors || [])
        setErrTotal(d.total || 0)
        setErrPage(d.page || 1)
        setErrPages(Math.ceil((d.total || 0) / 30))
      })
      .finally(() => setErrLoading(false))
  }, [])

  useEffect(() => { fetchLogs(1, 'all') }, [fetchLogs])
  useEffect(() => { if (tab === 'errors') fetchErrors(1) }, [tab, fetchErrors])

  const Pagination = ({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) => {
    if (pages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gold/20 text-white/60 hover:text-gold disabled:opacity-30 transition-colors">
          ←
        </button>
        <span className="px-3 py-1.5 text-sm text-white/40">{page} / {pages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gold/20 text-white/60 hover:text-gold disabled:opacity-30 transition-colors">
          →
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-gold">系統日誌</h1>
        <p className="text-white/40 text-sm mt-1">System Logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-navy-900/50 rounded-xl w-fit border border-gold/10">
        {[
          { key: 'llm' as Tab, label: '📋 LLM 調用', count: llmTotal },
          { key: 'errors' as Tab, label: '🐛 前端錯誤', count: errTotal },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gold/20 text-gold shadow-sm'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 text-xs opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* ===== LLM Logs Tab ===== */}
      {tab === 'llm' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: '總調用', value: llmStats.totalCalls.toLocaleString() },
              { label: '總 Tokens', value: llmStats.totalTokens.toLocaleString() },
              { label: '平均延遲', value: `${(llmStats.avgLatencyMs / 1000).toFixed(1)}s` },
              { label: '錯誤', value: llmStats.errorCount.toString(), red: llmStats.errorCount > 0 },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/15 text-center">
                <div className="text-white/40 text-[10px] uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-serif mt-0.5 ${s.red ? 'text-red-400' : 'text-gold'}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 mb-4">
            {['all', 'divination', 'chat', 'chat-summary'].map(f => (
              <button key={f}
                onClick={() => { setLlmFilter(f); fetchLogs(1, f) }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  llmFilter === f ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                }`}>
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>

          {llmLoading ? (
            <div className="text-gold animate-pulse p-8 text-center">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-white/40">暫無日誌記錄</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="glass-card rounded-xl border border-gold/10 overflow-hidden">
                  <div className="p-3 cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-3 text-xs"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="px-2 py-0.5 bg-gold/15 text-gold rounded-full">{log.endpoint}</span>
                    <span className="text-white/50 flex-1 truncate">{log.model}</span>
                    <span className="text-white/35">{log.totalTokens} tok</span>
                    <span className="text-white/35">{(log.latencyMs / 1000).toFixed(1)}s</span>
                    <span className="text-white/25 truncate max-w-[120px]">{log.user?.email || '—'}</span>
                    <span className="text-white/25">{new Date(log.createdAt).toLocaleString('zh-TW')}</span>
                  </div>
                  {expanded === log.id && (
                    <div className="border-t border-gold/10 p-4 space-y-3 bg-navy-900/30">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div><span className="text-white/40">Prompt:</span> <span className="text-white/70">{log.promptTokens}</span></div>
                        <div><span className="text-white/40">Completion:</span> <span className="text-white/70">{log.completionTokens}</span></div>
                        <div><span className="text-white/40">Tier:</span> <span className="text-white/70">{log.modelTier || '—'}</span></div>
                      </div>
                      {log.inputPreview && (
                        <div>
                          <div className="text-white/40 text-xs mb-1">Input:</div>
                          <pre className="text-white/60 text-xs bg-navy-950/50 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32">{log.inputPreview}</pre>
                        </div>
                      )}
                      {log.outputPreview && (
                        <div>
                          <div className="text-white/40 text-xs mb-1">Output:</div>
                          <pre className="text-white/60 text-xs bg-navy-950/50 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32">{log.outputPreview}</pre>
                        </div>
                      )}
                      {log.errorMessage && (
                        <div>
                          <div className="text-red-400 text-xs mb-1">Error:</div>
                          <pre className="text-red-300 text-xs bg-red-900/20 rounded p-2">{log.errorMessage}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <Pagination page={llmPage} pages={llmPages} onChange={p => fetchLogs(p, llmFilter)} />
        </>
      )}

      {/* ===== Frontend Errors Tab ===== */}
      {tab === 'errors' && (
        <>
          {errLoading ? (
            <div className="text-gold animate-pulse p-8 text-center">Loading...</div>
          ) : errors.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-white/40">
              <div className="text-3xl mb-2">✅</div>
              <p>暫無錯誤記錄 / No errors recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map(err => (
                <div key={err.id} className="glass-card rounded-xl p-4 border border-red-400/10">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-red-400/10 text-red-400 text-xs rounded-full font-mono">
                        {err.status || 'ERR'}
                      </span>
                      <span className="text-white/70 text-sm font-mono">{err.endpoint}</span>
                    </div>
                    <span className="text-white/25 text-xs flex-shrink-0">
                      {new Date(err.createdAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mb-1 break-all">{err.error}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                    {err.user && (
                      <span className="text-white/50">👤 {err.user.name || '—'} <span className="text-white/30">({err.user.email})</span></span>
                    )}
                    {err.context && <span className="text-white/30">📋 {err.context}</span>}
                    {err.userAgent && <span className="text-white/20 truncate max-w-xs" title={err.userAgent}>🌐 {err.userAgent.slice(0, 60)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={errPage} pages={errPages} onChange={p => fetchErrors(p)} />
        </>
      )}
    </div>
  )
}
