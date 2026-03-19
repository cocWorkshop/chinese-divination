'use client'

import { useEffect, useState } from 'react'

interface LogEntry {
  id: string
  userId: string | null
  endpoint: string
  model: string
  modelTier: string | null
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  status: string
  errorMessage: string | null
  inputPreview: string | null
  outputPreview: string | null
  createdAt: string
  user?: { email: string; name: string | null }
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/admin/logs')
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.endpoint === filter)

  const totalTokens = filtered.reduce((s, l) => s + l.totalTokens, 0)
  const avgLatency = filtered.length > 0 ? Math.round(filtered.reduce((s, l) => s + l.latencyMs, 0) / filtered.length) : 0
  const errorCount = filtered.filter(l => l.status === 'error').length

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading...</div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-gold">LLM 調用日誌</h1>
        <p className="text-white/40 text-sm mt-1">API Call Logs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
          <div className="text-white/40 text-xs">總調用</div>
          <div className="text-gold text-2xl font-serif">{filtered.length}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
          <div className="text-white/40 text-xs">總 Tokens</div>
          <div className="text-gold text-2xl font-serif">{totalTokens.toLocaleString()}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
          <div className="text-white/40 text-xs">平均延遲</div>
          <div className="text-gold text-2xl font-serif">{(avgLatency / 1000).toFixed(1)}s</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
          <div className="text-white/40 text-xs">錯誤數</div>
          <div className={`text-2xl font-serif ${errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{errorCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['all', 'divination', 'chat', 'chat-summary'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              filter === f ? 'bg-gold text-navy-950 font-semibold' : 'text-white/60 border border-gold/20 hover:text-gold'
            }`}
          >
            {f === 'all' ? '全部' : f}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.map(log => (
          <div
            key={log.id}
            className="glass-card rounded-xl border border-gold/10 overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-4"
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-full">{log.endpoint}</span>
              <span className="text-white/60 text-xs flex-1">{log.model}</span>
              <span className="text-white/40 text-xs">{log.totalTokens} tok</span>
              <span className="text-white/40 text-xs">{(log.latencyMs / 1000).toFixed(1)}s</span>
              <span className="text-white/30 text-xs">{log.user?.email || log.userId?.slice(0, 8) || '—'}</span>
              <span className="text-white/30 text-xs">{new Date(log.createdAt).toLocaleString('zh-TW')}</span>
            </div>
            {expanded === log.id && (
              <div className="border-t border-gold/10 p-4 space-y-3 bg-navy-900/30">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-white/40">Prompt:</span> <span className="text-white/70">{log.promptTokens}</span></div>
                  <div><span className="text-white/40">Completion:</span> <span className="text-white/70">{log.completionTokens}</span></div>
                  <div><span className="text-white/40">Model Tier:</span> <span className="text-white/70">{log.modelTier || '—'}</span></div>
                </div>
                {log.inputPreview && (
                  <div>
                    <div className="text-white/40 text-xs mb-1">Input Preview:</div>
                    <pre className="text-white/60 text-xs bg-navy-950/50 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32">{log.inputPreview}</pre>
                  </div>
                )}
                {log.outputPreview && (
                  <div>
                    <div className="text-white/40 text-xs mb-1">Output Preview:</div>
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

      {filtered.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center text-white/40">暫無日誌記錄</div>
      )}
    </div>
  )
}
