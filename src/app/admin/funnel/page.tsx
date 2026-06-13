'use client'

/**
 * Admin /admin/funnel — operations dashboard for the /start ad funnel.
 *
 * Shows:
 *   - Stat cards: tentatives total + recent, conversions total + recent,
 *     conversion rate, count stale at current cutoff.
 *   - Tentative user table: email, age, source (utm_*), reading count,
 *     individual delete button.
 *   - Bulk actions: "Clean stale" button (uses AdminSetting cutoff or a
 *     custom days override).
 *
 * Reads:
 *   - GET /api/admin/funnel — stats + tentative list
 * Writes:
 *   - POST /api/admin/funnel/cleanup
 *   - DELETE /api/admin/funnel/[userId]
 */

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface Stats {
  tentativeTotal: number
  tentativeRecent: { d1: number; d7: number; d30: number }
  convertedTotal: number
  convertedRecent: { d1: number; d7: number; d30: number }
  conversionRate: number
  staleAtCurrentCutoff: number
  cutoffDays: number
}

interface TentativeUser {
  id: string
  email: string
  createdAt: string
  funnelSource: Record<string, unknown> | null | undefined
  ageDays: number
  readingCount: number
}

export default function AdminFunnelPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<TentativeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [overrideDays, setOverrideDays] = useState<string>('')
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/funnel', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setStats(data.stats)
      setUsers(data.tentativeUsers)
    } catch (e) {
      setFlash((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const onCleanup = async () => {
    if (busy) return
    const days = overrideDays.trim() ? Number(overrideDays.trim()) : null
    const label = days != null ? `${days} 天` : `${stats?.cutoffDays ?? '預設'} 天`
    if (!window.confirm(`清除 ${label} 以前的 tentative 用戶？此操作不可恢復。`)) return
    setBusy('cleanup')
    try {
      const res = await fetch('/api/admin/funnel/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(days != null ? { daysOld: days } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cleanup failed')
      setFlash(`✓ 已清除 ${data.deleted} 個 tentative 用戶（cutoff = ${data.cutoffDays} 天）`)
      await load()
    } catch (e) {
      setFlash((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const onDelete = async (userId: string, email: string) => {
    if (busy) return
    if (!window.confirm(`刪除 tentative 用戶 ${email}？`)) return
    setBusy(userId)
    try {
      const res = await fetch(`/api/admin/funnel/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setFlash(`✓ 已刪除 ${data.email}`)
      await load()
    } catch (e) {
      setFlash((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading…</div>
  if (!stats) return <div className="p-8 text-red-400">Failed to load funnel stats</div>

  const cards = [
    { label: 'Tentative 用戶（待轉化）', value: stats.tentativeTotal, sub: `近 24h: ${stats.tentativeRecent.d1} · 7d: ${stats.tentativeRecent.d7} · 30d: ${stats.tentativeRecent.d30}`, icon: '⏳', color: 'text-amber-400' },
    { label: '已轉化用戶', value: stats.convertedTotal, sub: `近 24h: ${stats.convertedRecent.d1} · 7d: ${stats.convertedRecent.d7} · 30d: ${stats.convertedRecent.d30}`, icon: '✓', color: 'text-emerald-400' },
    { label: '轉化率', value: `${(stats.conversionRate * 100).toFixed(1)}%`, sub: `已轉化 / (已轉化 + tentative)`, icon: '📈', color: 'text-gold' },
    { label: '可清除（過期 tentative）', value: stats.staleAtCurrentCutoff, sub: `cutoff: ${stats.cutoffDays} 天`, icon: '🧹', color: 'text-rose-400' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
      <header className="mb-6">
        <h1 className="font-serif text-2xl mb-1" style={{ color: 'var(--gold)' }}>
          /start 漏斗管理
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          廣告 landing 漏斗的轉化監控、tentative 用戶清理。
        </p>
      </header>

      {flash && (
        <div
          className="mb-5 px-4 py-2 rounded-lg text-sm flex items-center justify-between"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
        >
          <span>{flash}</span>
          <button onClick={() => setFlash(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4"
            style={{ border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  {c.label}
                </div>
                <div className={`font-serif text-2xl font-bold ${c.color}`}>{c.value}</div>
              </div>
              <span className="text-xl">{c.icon}</span>
            </div>
            <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{c.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Bulk cleanup row */}
      <div
        className="glass-card rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        style={{ border: '1px solid var(--card-border)' }}
      >
        <div className="flex-1">
          <div className="font-serif text-sm mb-1" style={{ color: 'var(--gold)' }}>批次清理</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            刪除指定天數以前未轉化的 tentative 用戶。預設 cutoff（{stats.cutoffDays} 天）由 AdminSetting <code>funnelCleanupDays</code> 控制。
          </div>
        </div>
        <input
          type="number"
          placeholder={`天數（預設 ${stats.cutoffDays}）`}
          value={overrideDays}
          onChange={(e) => setOverrideDays(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm w-full sm:w-44"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={onCleanup}
          disabled={busy === 'cleanup' || stats.staleAtCurrentCutoff === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: 'var(--gold)', color: '#0a0f1e' }}
        >
          {busy === 'cleanup' ? '清理中…' : `清理（${stats.staleAtCurrentCutoff} 個）`}
        </button>
      </div>

      {/* Tentative users table */}
      <h2 className="font-serif text-base mb-2" style={{ color: 'var(--gold)' }}>
        最近 Tentative 用戶 <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>· {users.length} 條</span>
      </h2>

      {users.length === 0 ? (
        <div
          className="glass-card rounded-xl p-8 text-center text-sm"
          style={{ border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
        >
          目前沒有 tentative 用戶。
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide font-medium">Email</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide font-medium">Age</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide font-medium">Readings</th>
                <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wide font-medium">Source</th>
                <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wide font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid var(--card-border)' : undefined, color: 'var(--text-secondary)' }}>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{u.ageDays} 天前</td>
                  <td className="px-3 py-2 text-xs">{u.readingCount}</td>
                  <td className="px-3 py-2 text-[11px]">
                    {(() => {
                      const src = u.funnelSource as Record<string, unknown> | null
                      if (!src) return <span style={{ color: 'var(--text-muted)' }}>—</span>
                      const utm = ['utm_source', 'utm_campaign', 'utm_medium']
                        .map((k) => (typeof src[k] === 'string' ? src[k] as string : null))
                        .filter(Boolean)
                      if (utm.length === 0) return <span style={{ color: 'var(--text-muted)' }}>direct</span>
                      return <span className="font-mono">{utm.join(' · ')}</span>
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onDelete(u.id, u.email)}
                      disabled={busy === u.id}
                      className="text-xs px-2 py-1 rounded transition-colors hover:bg-red-500/10 disabled:opacity-40"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {busy === u.id ? '…' : '✕ 刪除'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Tip: 把 <code>funnelCleanupDays</code> 寫入 <a href="/admin/settings" style={{ color: 'var(--gold)' }} className="underline">AdminSetting</a> 可調整預設保留期。
        Tip: 把 <code>trialCredits</code> 寫入 AdminSetting 可調整每位 funnel 訪客的試用機緣（預設 10）。
      </p>
    </div>
  )
}
