'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UserRow {
  id: string
  email: string
  name: string | null
  isAdmin: boolean
  isPaid: boolean
  hourlyQuota: number
  bonusModel1: number
  bonusModel2: number
  createdAt: string
  language: string
  usedTodayModel1: number
  usedTodayModel2: number
  _count: { readings: number }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [grantM1, setGrantM1] = useState(0)
  const [grantM2, setGrantM2] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users); setTotal(d.total); setPages(d.pages) })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  const update = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) { toast.success('Updated'); load() }
    else { const d = await res.json(); toast.error(d.error || 'Failed') }
  }

  const grantCredits = async (id: string) => {
    if (grantM1 === 0 && grantM2 === 0) return
    await update(id, { grantBonus: { model1: grantM1, model2: grantM2 } })
    setGrantingId(null)
    setGrantM1(0)
    setGrantM2(0)
  }

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This also deletes all their readings.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('User deleted'); load() }
    else { const d = await res.json(); toast.error(d.error || 'Failed') }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-gold">用户管理</h1>
          <p className="text-white/40 text-sm mt-1">共 {total} 名用户</p>
        </div>
        <input
          type="text"
          placeholder="搜索邮箱/姓名..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 w-60"
        />
      </div>

      <div className="glass-card rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gold/20 text-white/50 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">用户</th>
              <th className="px-4 py-3 text-center">角色</th>
              <th className="px-4 py-3 text-center">等级</th>
              <th className="px-4 py-3 text-center">占卜次数</th>
              <th className="px-4 py-3 text-center">今日用量</th>
              <th className="px-4 py-3 text-center">额外次数</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/40">Loading...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/40">无用户</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-white/80">{u.name || '—'}</div>
                  <div className="text-white/40 text-xs">{u.email}</div>
                  <div className="text-white/30 text-xs">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => update(u.id, { isAdmin: !u.isAdmin })}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      u.isAdmin ? 'bg-gold/20 text-gold hover:bg-gold/30' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    {u.isAdmin ? 'Admin' : 'User'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => update(u.id, { isPaid: !u.isPaid })}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      u.isPaid ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    {u.isPaid ? '💎 Paid' : 'Free'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center text-white/70">{u._count.readings}</td>
                <td className="px-4 py-3 text-center">
                  <div className="text-xs">
                    <span className="text-white/50">⚡</span> <span className="text-white/70">{u.usedTodayModel1}</span>
                    <span className="text-white/20 mx-1">|</span>
                    <span className="text-white/50">🌟</span> <span className="text-white/70">{u.usedTodayModel2}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {grantingId === u.id ? (
                    <div className="flex items-center gap-1 justify-center flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white/40">⚡</span>
                        <input type="number" value={grantM1} onChange={e => setGrantM1(parseInt(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 bg-navy-800 border border-gold/30 rounded text-white text-xs text-center" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white/40">🌟</span>
                        <input type="number" value={grantM2} onChange={e => setGrantM2(parseInt(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 bg-navy-800 border border-gold/30 rounded text-white text-xs text-center" />
                      </div>
                      <button onClick={() => grantCredits(u.id)} className="text-jade text-xs hover:text-jade-light">✓</button>
                      <button onClick={() => setGrantingId(null)} className="text-white/30 text-xs">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setGrantingId(u.id); setGrantM1(0); setGrantM2(0) }}
                      className="text-white/50 hover:text-gold text-xs transition-colors"
                    >
                      ⚡{u.bonusModel1} 🌟{u.bonusModel2} <span className="text-white/30">✎</span>
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => deleteUser(u.id, u.email)}
                    className="text-red-400/50 hover:text-red-400 text-xs transition-colors"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm transition-colors ${
                p === page ? 'bg-gold text-navy-950 font-bold' : 'text-white/50 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
