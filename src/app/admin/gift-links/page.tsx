'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface GiftLink {
  id: string
  code: string
  credits: number
  maxClaims: number
  claimCount: number
  note: string | null
  expiresAt: string | null
  enabled: boolean
  createdAt: string
  _count: { claims: number }
}

export default function GiftLinksAdmin() {
  const [links, setLinks] = useState<GiftLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ credits: 5, maxClaims: 1, expiresInHours: 72, note: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = () => {
    fetch('/api/admin/gift-links').then(r => r.json()).then(d => { setLinks(d.links || []); setLoading(false) })
  }
  useEffect(load, [])

  const create = async () => {
    setCreating(true)
    const res = await fetch('/api/admin/gift-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      setForm({ credits: 5, maxClaims: 1, expiresInHours: 72, note: '' })
      load()
    }
    setCreating(false)
  }

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/admin/gift-links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('確定刪除？')) return
    await fetch(`/api/admin/gift-links/${id}`, { method: 'DELETE' })
    load()
  }

  const copyLink = (code: string, id: string) => {
    const url = `${window.location.origin}/gift/${code}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isExpired = (expiresAt: string | null) => expiresAt && new Date(expiresAt) < new Date()
  const isExhausted = (link: GiftLink) => link.maxClaims > 0 && link.claimCount >= link.maxClaims

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading...</div>

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-serif text-gold">禮品連結管理</h1>
        <p className="text-white/40 text-sm mt-1">Gift Link Management</p>
      </div>

      {/* Create form */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-xl p-6 space-y-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <h2 className="text-sm font-medium text-gold">創建新連結</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-white/40 block mb-1">機緣數量</label>
            <input type="number" min={1} value={form.credits}
              onChange={e => setForm({ ...form, credits: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">最大領取人數 (0=無限)</label>
            <input type="number" min={0} value={form.maxClaims}
              onChange={e => setForm({ ...form, maxClaims: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">有效期 (小時)</label>
            <input type="number" min={0} value={form.expiresInHours}
              onChange={e => setForm({ ...form, expiresInHours: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">備註</label>
            <input type="text" value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="如：推廣活動"
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/20" />
          </div>
        </div>
        <button onClick={create} disabled={creating}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: 'var(--gold)', color: '#000' }}>
          {creating ? '創建中...' : '🎁 生成連結'}
        </button>
      </motion.div>

      {/* Links list */}
      <div className="space-y-3">
        {links.map(link => (
          <motion.div key={link.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
            style={{
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)',
              opacity: (!link.enabled || isExpired(link.expiresAt) || isExhausted(link)) ? 0.5 : 1,
            }}>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span className="text-gold font-mono text-sm">/gift/{link.code}</span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isExpired(link.expiresAt) ? 'rgba(239,68,68,0.2)' : isExhausted(link) ? 'rgba(251,146,60,0.2)' : link.enabled ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)',
                    color: isExpired(link.expiresAt) ? '#ef4444' : isExhausted(link) ? '#fb923c' : link.enabled ? '#22c55e' : '#9ca3af',
                  }}>
                  {isExpired(link.expiresAt) ? '已過期' : isExhausted(link) ? '已領完' : link.enabled ? '有效' : '停用'}
                </span>
              </div>
              <div className="text-xs text-white/40 mt-1">
                {link.credits} 機緣 · {link.claimCount}/{link.maxClaims === 0 ? '∞' : link.maxClaims} 已領
                {link.expiresAt && ` · 到期 ${new Date(link.expiresAt).toLocaleString('zh-TW')}`}
                {link.note && ` · ${link.note}`}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyLink(link.code, link.id)}
                className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors">
                {copiedId === link.id ? '✅ 已複製' : '📋 複製'}
              </button>
              <button onClick={() => toggle(link.id, !link.enabled)}
                className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors">
                {link.enabled ? '⏸ 停用' : '▶ 啟用'}
              </button>
              <button onClick={() => remove(link.id)}
                className="px-3 py-1 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                🗑
              </button>
            </div>
          </motion.div>
        ))}
        {links.length === 0 && <p className="text-white/40 text-sm text-center py-8">暫無禮品連結</p>}
      </div>
    </div>
  )
}
