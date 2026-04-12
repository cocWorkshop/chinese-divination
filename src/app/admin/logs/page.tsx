'use client'

import { useEffect, useState, useCallback } from 'react'
import ResultRenderer from '@/components/results/ResultRenderer'

type Tab = 'llm' | 'errors' | 'auth' | 'readings' | 'divination'

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

interface AuthLogEntry {
  id: string; action: string; status: string; email: string; userId: string | null
  reason: string | null; ip: string | null; userAgent: string | null; createdAt: string
}

interface ReadingRow {
  id: string; type: string; modelTier: string; question: string | null
  inputData: Record<string, string>; targetType: string; rating: number | null; createdAt: string
  user: { id: string; name: string | null; email: string | null }
  familyMember: { name: string | null; relation: string } | null
}

interface ReadingDetail {
  id: string; type: string; modelTier: string; question: string | null
  inputData: Record<string, unknown>; result: string
  calculationData: string | null; llmPrompt: string | null; llmRawOutput: string | null
  chatMessages: string | null
  language: string; targetType: string; rating: number | null; createdAt: string
  user: { id: string; name: string | null; email: string | null }
  familyMember: { name: string | null; relation: string } | null
  feedbacks: { rating: number | null; feedback: string | null; createdAt: string }[]
}

interface LlmStats { totalCalls: number; totalTokens: number; avgLatencyMs: number; errorCount: number }
interface AuthStats { totalSuccess: number; totalFailure: number; totalToday: number }

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

  // Auth log state
  const [authLogs, setAuthLogs] = useState<AuthLogEntry[]>([])
  const [authTotal, setAuthTotal] = useState(0)
  const [authPage, setAuthPage] = useState(1)
  const [authPages, setAuthPages] = useState(1)
  const [authLoading, setAuthLoading] = useState(true)
  const [authStats, setAuthStats] = useState<AuthStats>({ totalSuccess: 0, totalFailure: 0, totalToday: 0 })
  const [authStatusFilter, setAuthStatusFilter] = useState('all')
  const [authActionFilter, setAuthActionFilter] = useState('all')
  const [authDateFrom, setAuthDateFrom] = useState('')
  const [authDateTo, setAuthDateTo] = useState('')

  // Reading log state
  const [readings, setReadings] = useState<ReadingRow[]>([])
  const [readingsTotal, setReadingsTotal] = useState(0)
  const [readingsPage, setReadingsPage] = useState(1)
  const [readingsPages, setReadingsPages] = useState(1)
  const [readingsTypeFilter, setReadingsTypeFilter] = useState('')
  const [readingsLoading, setReadingsLoading] = useState(true)
  const [readingDetail, setReadingDetail] = useState<ReadingDetail | null>(null)
  const [readingDetailTab, setReadingDetailTab] = useState<'result' | 'input' | 'calculation' | 'llmPrompt' | 'llmOutput' | 'chat'>('result')

  // Divination performance state
  interface DivReading {
    id: string; type: string; status: string; question: string | null; language: string
    targetType: string; createdAt: string
    user: { email: string; name: string | null }
    familyMember: { name: string | null; relation: string } | null
    llm: { latencyMs: number; promptTokens: number; completionTokens: number; totalTokens: number; model: string; status: string } | null
  }
  interface DivStats { avg_latency: number; total: number; completed: number; failed: number; pending: number }
  interface DivTypeStats { type: string; count: number; avg_ms: number }
  const [divReadings, setDivReadings] = useState<DivReading[]>([])
  const [divTotal, setDivTotal] = useState(0)
  const [divPage, setDivPage] = useState(1)
  const [divPages, setDivPages] = useState(1)
  const [divTypeFilter, setDivTypeFilter] = useState('')
  const [divStatusFilter, setDivStatusFilter] = useState('')
  const [divLoading, setDivLoading] = useState(true)
  const [divStats, setDivStats] = useState<DivStats>({ avg_latency: 0, total: 0, completed: 0, failed: 0, pending: 0 })
  const [divTypeStats, setDivTypeStats] = useState<DivTypeStats[]>([])

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

  const fetchAuthLogs = useCallback((p: number, status: string, action: string, from: string, to: string) => {
    setAuthLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '30', status, action })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    fetch(`/api/admin/auth-logs?${params}`)
      .then(r => r.json())
      .then(d => {
        setAuthLogs(d.logs || [])
        setAuthTotal(d.total || 0)
        setAuthPage(d.page || 1)
        setAuthPages(d.pages || 1)
        if (d.stats) setAuthStats(d.stats)
      })
      .finally(() => setAuthLoading(false))
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

  const fetchReadings = useCallback((p: number, type: string) => {
    setReadingsLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '20' })
    if (type) params.set('type', type)
    fetch(`/api/admin/readings?${params}`)
      .then(r => r.json())
      .then(d => {
        setReadings(d.readings || [])
        setReadingsTotal(d.total || 0)
        setReadingsPage(d.page || 1)
        setReadingsPages(d.pages || 1)
      })
      .finally(() => setReadingsLoading(false))
  }, [])

  const fetchReadingDetail = useCallback((id: string) => {
    fetch(`/api/admin/readings/${id}`)
      .then(r => r.json())
      .then(d => { setReadingDetail(d.reading); setReadingDetailTab('result') })
  }, [])

  const fetchDivLogs = useCallback((p: number, type: string, status: string) => {
    setDivLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '30' })
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    fetch(`/api/admin/divination-logs?${params}`)
      .then(r => r.json())
      .then(d => {
        setDivReadings(d.readings || [])
        setDivTotal(d.total || 0)
        setDivPage(d.page || 1)
        setDivPages(d.pages || 1)
        if (d.stats) setDivStats(d.stats)
        if (d.typeStats) setDivTypeStats(d.typeStats)
      })
      .finally(() => setDivLoading(false))
  }, [])

  useEffect(() => { fetchLogs(1, 'all') }, [fetchLogs])
  useEffect(() => { if (tab === 'errors') fetchErrors(1) }, [tab, fetchErrors])
  useEffect(() => { if (tab === 'auth') fetchAuthLogs(1, 'all', 'all', '', '') }, [tab, fetchAuthLogs])
  useEffect(() => { if (tab === 'readings') fetchReadings(1, '') }, [tab, fetchReadings])
  useEffect(() => { if (tab === 'divination') fetchDivLogs(1, '', '') }, [tab, fetchDivLogs])

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-gold">系統日誌</h1>
          <p className="text-white/40 text-sm mt-1">System Logs</p>
        </div>
        <button
          onClick={async () => {
            if (!confirm('清理過期日誌？(Auth: 90天, LLM: 180天, Errors: 90天)')) return
            const r = await fetch('/api/admin/cleanup-logs', { method: 'POST' })
            const d = await r.json()
            alert(`已清理：Auth ${d.authDeleted} 條, LLM ${d.llmDeleted} 條, Errors ${d.errorsDeleted} 條`)
          }}
          className="px-3 py-1.5 rounded-lg text-xs border border-gold/20 text-white/50 hover:text-gold hover:border-gold/40 transition-colors"
        >
          🧹 清理過期日誌
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-navy-900/50 rounded-xl w-fit border border-gold/10">
        {[
          { key: 'divination' as Tab, label: '⏱️ 占卜耗時', count: divTotal },
          { key: 'llm' as Tab, label: '📋 LLM 調用', count: llmTotal },
          { key: 'auth' as Tab, label: '🔐 登入日誌', count: authTotal },
          { key: 'readings' as Tab, label: '🔮 占卜日誌', count: readingsTotal },
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

      {/* ===== Divination Performance Tab ===== */}
      {tab === 'divination' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {[
              { label: '7日總數', value: divStats.total.toString(), color: 'text-gold' },
              { label: '完成', value: divStats.completed.toString(), color: 'text-green-400' },
              { label: '失敗', value: divStats.failed.toString(), color: divStats.failed > 0 ? 'text-red-400' : 'text-gold' },
              { label: '進行中', value: divStats.pending.toString(), color: divStats.pending > 0 ? 'text-yellow-400' : 'text-gold' },
              { label: '平均耗時', value: `${(divStats.avg_latency / 1000).toFixed(0)}s`, color: 'text-gold' },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/15 text-center">
                <div className="text-white/40 text-[10px] uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-serif mt-0.5 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Per-type stats */}
          {divTypeStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {divTypeStats.map(ts => (
                <div key={ts.type} className="glass-card rounded-lg p-2.5 border border-gold/10 text-center">
                  <div className="text-gold text-sm font-serif">{ts.type}</div>
                  <div className="text-white/50 text-xs mt-0.5">{ts.count} 次 · 平均 {(ts.avg_ms / 1000).toFixed(0)}s</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1.5">
              {[
                { key: '', label: '全部類型' },
                { key: 'bazi', label: '八字' },
                { key: 'ziwei', label: '紫微' },
                { key: 'qimen', label: '奇門' },
                { key: 'meihua', label: '梅花' },
                { key: 'liuyao', label: '六爻' },
              ].map(f => (
                <button key={f.key}
                  onClick={() => { setDivTypeFilter(f.key); fetchDivLogs(1, f.key, divStatusFilter) }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    divTypeFilter === f.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                  }`}>{f.label}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {[
                { key: '', label: '全部狀態' },
                { key: 'completed', label: '✅ 完成' },
                { key: 'failed', label: '❌ 失敗' },
                { key: 'pending', label: '⏳ 進行中' },
              ].map(f => (
                <button key={f.key}
                  onClick={() => { setDivStatusFilter(f.key); fetchDivLogs(1, divTypeFilter, f.key) }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    divStatusFilter === f.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>

          {divLoading ? (
            <div className="text-gold animate-pulse p-8 text-center">Loading...</div>
          ) : divReadings.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-white/40">暫無記錄</div>
          ) : (
            <div className="space-y-2">
              {divReadings.map(r => {
                const latencySec = r.llm ? (r.llm.latencyMs / 1000).toFixed(0) : '—'
                const latencyColor = !r.llm ? 'text-white/30' : r.llm.latencyMs > 120000 ? 'text-red-400' : r.llm.latencyMs > 60000 ? 'text-yellow-400' : 'text-green-400'
                return (
                  <div key={r.id} className="glass-card rounded-xl p-3 border border-gold/10 flex items-center gap-2 sm:gap-3 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      r.status === 'completed' ? 'bg-green-400' : r.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
                    }`} />
                    <span className="px-2 py-0.5 bg-gold/15 text-gold rounded-full min-w-[3rem] text-center">{r.type}</span>
                    <span className={`font-mono font-bold min-w-[3rem] text-right ${latencyColor}`}>
                      {latencySec}s
                    </span>
                    {r.llm && (
                      <span className="text-white/30 hidden sm:inline">
                        {r.llm.promptTokens}+{r.llm.completionTokens} tk
                      </span>
                    )}
                    <span className="text-white/50 flex-1 truncate hidden sm:inline">
                      {r.user.name || r.user.email?.split('@')[0] || '—'}
                    </span>
                    <span className="text-white/40 truncate max-w-[120px]">{r.question || '—'}</span>
                    {r.llm && <span className="text-white/20 hidden sm:inline truncate max-w-[100px]">{r.llm.model.split('/').pop()}</span>}
                    <span className="text-white/25 flex-shrink-0">
                      {new Date(r.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <Pagination page={divPage} pages={divPages} onChange={p => fetchDivLogs(p, divTypeFilter, divStatusFilter)} />
        </>
      )}

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

      {/* ===== Auth Logs Tab ===== */}
      {tab === 'auth' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: '成功', value: authStats.totalSuccess.toString(), color: 'text-green-400' },
              { label: '失敗', value: authStats.totalFailure.toString(), color: authStats.totalFailure > 0 ? 'text-red-400' : 'text-gold' },
              { label: '今日', value: authStats.totalToday.toString(), color: 'text-gold' },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/15 text-center">
                <div className="text-white/40 text-[10px] uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-serif mt-0.5 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="flex gap-1.5">
              {['all', 'success', 'failure'].map(f => (
                <button key={f}
                  onClick={() => { setAuthStatusFilter(f); fetchAuthLogs(1, f, authActionFilter, authDateFrom, authDateTo) }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    authStatusFilter === f ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                  }`}>
                  {f === 'all' ? '全部' : f === 'success' ? '✅ 成功' : '❌ 失敗'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {['all', 'login', 'logout', 'register'].map(f => (
                <button key={f}
                  onClick={() => { setAuthActionFilter(f); fetchAuthLogs(1, authStatusFilter, f, authDateFrom, authDateTo) }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    authActionFilter === f ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                  }`}>
                  {f === 'all' ? '類型' : f === 'login' ? '登入' : f === 'logout' ? '登出' : '註冊'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="date" value={authDateFrom} onChange={e => setAuthDateFrom(e.target.value)}
                className="px-2 py-1 rounded-lg text-xs bg-navy-900 border border-gold/15 text-white/70 focus:outline-none focus:border-gold/40" />
              <span className="text-white/30 text-xs">至</span>
              <input type="date" value={authDateTo} onChange={e => setAuthDateTo(e.target.value)}
                className="px-2 py-1 rounded-lg text-xs bg-navy-900 border border-gold/15 text-white/70 focus:outline-none focus:border-gold/40" />
              <button onClick={() => fetchAuthLogs(1, authStatusFilter, authActionFilter, authDateFrom, authDateTo)}
                className="px-3 py-1.5 rounded-lg text-xs bg-gold/20 text-gold hover:bg-gold/30 transition-colors">
                篩選
              </button>
              {(authDateFrom || authDateTo) && (
                <button onClick={() => { setAuthDateFrom(''); setAuthDateTo(''); fetchAuthLogs(1, authStatusFilter, authActionFilter, '', '') }}
                  className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors">
                  清除
                </button>
              )}
            </div>
          </div>

          {authLoading ? (
            <div className="text-gold animate-pulse p-8 text-center">Loading...</div>
          ) : authLogs.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-white/40">暫無登入日誌</div>
          ) : (
            <div className="space-y-2">
              {authLogs.map(log => (
                <div key={log.id} className="glass-card rounded-xl p-3 border border-gold/10 flex items-center gap-3 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    log.action === 'login' ? 'bg-blue-400/15 text-blue-400' :
                    log.action === 'logout' ? 'bg-white/10 text-white/50' :
                    'bg-purple-400/15 text-purple-400'
                  }`}>
                    {log.action === 'login' ? '登入' : log.action === 'logout' ? '登出' : '註冊'}
                  </span>
                  <span className="text-white/70 flex-1 truncate">{log.email}</span>
                  {log.reason && (
                    <span className="px-2 py-0.5 bg-red-400/10 text-red-400/70 rounded-full text-[10px]">
                      {log.reason === 'invalid_password' ? '密碼錯誤' :
                       log.reason === 'user_not_found' ? '用戶不存在' :
                       log.reason === 'email_not_verified' ? '未驗證' :
                       log.reason === 'email_exists' ? '郵箱已存在' : log.reason}
                    </span>
                  )}
                  {log.ip && <span className="text-white/25 font-mono">{log.ip}</span>}
                  <span className="text-white/25 flex-shrink-0">{new Date(log.createdAt).toLocaleString('zh-TW')}</span>
                </div>
              ))}
            </div>
          )}
          <Pagination page={authPage} pages={authPages} onChange={p => fetchAuthLogs(p, authStatusFilter, authActionFilter, authDateFrom, authDateTo)} />
        </>
      )}

      {/* ===== Readings Tab ===== */}
      {tab === 'readings' && (
        <>
          {readingDetail ? (
            /* Detail View */
            <div>
              <div className="flex items-center justify-between mb-4 gap-3">
                <button onClick={() => setReadingDetail(null)} className="text-gold/60 hover:text-gold text-sm">← 返回列表</button>
                <span className="text-white/40 text-xs font-mono truncate" title={readingDetail.id}>ID: {readingDetail.id}</span>
              </div>
              <div className="glass-card rounded-xl p-4 border border-gold/20 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-white/40 text-xs block">用戶</span>
                    <span className="text-white/80">{readingDetail.user.name || readingDetail.user.email?.split('@')[0]}</span>
                    <span className="text-white/30 text-xs block">{readingDetail.user.email}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs block">類型</span>
                    <span className="text-gold">{readingDetail.type}</span>
                    <span className="text-white/30 text-xs block">{readingDetail.modelTier === 'model2' ? '✨ Premium' : 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs block">對象</span>
                    <span className="text-white/80">
                      {readingDetail.targetType === 'family' && readingDetail.familyMember
                        ? `${readingDetail.familyMember.relation} ${readingDetail.familyMember.name || ''}`
                        : '本人'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs block">時間</span>
                    <span className="text-white/80">{new Date(readingDetail.createdAt).toLocaleString('zh-TW')}</span>
                    {readingDetail.rating && <span className="text-xs block mt-0.5">{'⭐'.repeat(readingDetail.rating)}</span>}
                  </div>
                </div>
                {readingDetail.question && (
                  <div className="mt-3 pt-3 border-t border-gold/10">
                    <span className="text-white/40 text-xs">問題：</span>
                    <span className="text-white/70 text-sm ml-1">{readingDetail.question}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-1 mb-4 flex-wrap">
                {([
                  { key: 'result' as const, label: '📜 解讀結果', available: true },
                  { key: 'input' as const, label: '📝 用戶輸入', available: true },
                  { key: 'calculation' as const, label: '🔢 程序計算', available: !!readingDetail.calculationData },
                  { key: 'llmPrompt' as const, label: '🤖 LLM輸入', available: !!readingDetail.llmPrompt },
                  { key: 'llmOutput' as const, label: '💬 LLM輸出', available: !!readingDetail.llmRawOutput },
                  { key: 'chat' as const, label: '☯ 玄機問答', available: !!readingDetail.chatMessages },
                ]).map(t => (
                  <button key={t.key} onClick={() => setReadingDetailTab(t.key)} disabled={!t.available}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      readingDetailTab === t.key ? 'bg-gold text-navy-950 font-semibold'
                        : t.available ? 'text-white/50 border border-gold/15 hover:text-gold' : 'text-white/20 border border-white/5 cursor-not-allowed'
                    }`}>{t.label}</button>
                ))}
              </div>

              <div className="glass-card rounded-xl border border-gold/20 overflow-hidden">
                {readingDetailTab === 'result' && (
                  <div className="p-4"><ResultRenderer type={readingDetail.type} result={readingDetail.result} /></div>
                )}
                {readingDetailTab === 'input' && (
                  <pre className="p-4 text-white/70 text-xs whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">{JSON.stringify(readingDetail.inputData, null, 2)}</pre>
                )}
                {readingDetailTab === 'calculation' && readingDetail.calculationData && (
                  <pre className="p-4 text-white/70 text-xs whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed max-h-[70vh] overflow-y-auto">{JSON.stringify(JSON.parse(readingDetail.calculationData), null, 2)}</pre>
                )}
                {readingDetailTab === 'llmPrompt' && readingDetail.llmPrompt && (
                  <pre className="p-4 text-white/70 text-xs whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed max-h-[70vh] overflow-y-auto">{readingDetail.llmPrompt}</pre>
                )}
                {readingDetailTab === 'llmOutput' && readingDetail.llmRawOutput && (
                  <pre className="p-4 text-white/70 text-xs whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">{readingDetail.llmRawOutput}</pre>
                )}
                {readingDetailTab === 'chat' && readingDetail.chatMessages && (() => {
                  try {
                    const msgs = JSON.parse(readingDetail.chatMessages) as { role: string; content: string; timestamp?: string }[]
                    return (
                      <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                        {msgs.length === 0 ? <p className="text-white/30 text-sm">暫無問答記錄</p> : msgs.map((msg, i) => (
                          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
                              msg.role === 'user' ? 'bg-gold text-navy-950 rounded-br-sm' : 'bg-white/5 border border-gold/20 text-white/80 rounded-bl-sm'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              {msg.timestamp && <p className="text-[10px] opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString('zh-TW')}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  } catch { return <pre className="p-4 text-white/70 text-xs whitespace-pre-wrap">{readingDetail.chatMessages}</pre> }
                })()}
              </div>

              {readingDetail.feedbacks.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-gold font-serif text-sm mb-2">用戶反饋</h3>
                  {readingDetail.feedbacks.map((fb, i) => (
                    <div key={i} className="glass-card rounded-xl p-3 border border-gold/10 mb-2 text-xs">
                      {fb.rating && <span>{'⭐'.repeat(fb.rating)}</span>}
                      {fb.feedback && <p className="text-white/70 mt-1">{fb.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <>
              <div className="flex gap-1.5 mb-4">
                {[
                  { key: '', label: '全部' },
                  { key: 'bazi', label: '八字' },
                  { key: 'ziwei', label: '紫微' },
                  { key: 'qimen', label: '奇門' },
                  { key: 'iching', label: '易經' },
                  { key: 'fengshui', label: '風水' },
                  { key: 'meihua', label: '梅花' },
                  { key: 'other', label: '其他' },
                ].map(f => (
                  <button key={f.key}
                    onClick={() => { setReadingsTypeFilter(f.key); fetchReadings(1, f.key) }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      readingsTypeFilter === f.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                    }`}>{f.label}</button>
                ))}
              </div>

              {readingsLoading ? (
                <div className="text-gold animate-pulse p-8 text-center">Loading...</div>
              ) : readings.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center text-white/40">暫無占卜記錄</div>
              ) : (
                <div className="space-y-2">
                  {readings.map(r => (
                    <div key={r.id}
                      onClick={() => fetchReadingDetail(r.id)}
                      className="glass-card rounded-xl p-3 border border-gold/10 hover:border-gold/30 cursor-pointer transition-colors flex items-center gap-3 text-xs">
                      <span className="px-2 py-0.5 bg-gold/15 text-gold rounded-full">{r.type}</span>
                      <span className="text-white/70 flex-1 truncate">{r.user.name || r.user.email?.split('@')[0] || '—'}</span>
                      <span className="text-white/40">{r.targetType === 'family' && r.familyMember ? r.familyMember.relation : '本人'}</span>
                      <span className="text-white/40">{r.inputData?.birthDate || '—'} {r.inputData?.birthTime || ''}</span>
                      <span className="text-white/30">{r.modelTier === 'model2' ? '✨' : '○'}</span>
                      <span className="text-white/30">{r.rating ? '⭐'.repeat(r.rating) : '—'}</span>
                      <span className="text-white/25">{new Date(r.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={readingsPage} pages={readingsPages} onChange={p => fetchReadings(p, readingsTypeFilter)} />
            </>
          )}
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
