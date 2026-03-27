'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  title: string
  titleEn: string
  content: string
  contentEn: string
  type: string
  target: string
  active: boolean
  expiresAt: string | null
  createdAt: string
  _count: { reads: number }
}

const TYPES = ['info', 'warning', 'update', 'promo']
const TARGETS = ['all', 'paid', 'free']
const TYPE_LABELS: Record<string, string> = { info: '📢 公告', warning: '⚠️ 警告', update: '🆕 更新', promo: '🎁 活動' }
const TARGET_LABELS: Record<string, string> = { all: '所有用戶', paid: '付費用戶', free: '免費用戶' }

const empty = { title: '', titleEn: '', content: '', contentEn: '', type: 'info', target: 'all', active: true, expiresAt: '' }

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => {
    fetch('/api/admin/notifications')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNotifications(d) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getStatus = (n: Notification) => {
    if (!n.active) return { label: 'Draft', color: 'text-white/40' }
    if (n.expiresAt && new Date(n.expiresAt) < new Date()) return { label: 'Expired', color: 'text-red-400' }
    return { label: 'Active', color: 'text-green-400' }
  }

  const handleSave = async () => {
    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/admin/notifications/${editingId}` : '/api/admin/notifications'
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt || null,
        }),
      })
      if (!r.ok) { const d = await r.json(); toast.error(d.error || 'Error'); return }
      toast.success(editingId ? 'Updated!' : 'Created!')
      setShowForm(false)
      setEditingId(null)
      setForm(empty)
      load()
    } catch { toast.error('Network error') }
  }

  const handleEdit = (n: Notification) => {
    setForm({
      title: n.title,
      titleEn: n.titleEn,
      content: n.content,
      contentEn: n.contentEn,
      type: n.type,
      target: n.target,
      active: n.active,
      expiresAt: n.expiresAt ? n.expiresAt.slice(0, 16) : '',
    })
    setEditingId(n.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
      toast.success('Deleted!')
      load()
    } catch { toast.error('Failed') }
  }

  const inputClass = "w-full rounded-lg px-3 py-2 bg-navy-950 border border-gold/30 text-white text-sm focus:border-gold focus:outline-none"
  const selectClass = "rounded-lg px-3 py-2 bg-navy-950 border border-gold/30 text-white text-sm focus:border-gold focus:outline-none"

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif text-gold">通知管理 Notifications</h1>
        <button
          onClick={() => { setForm(empty); setEditingId(null); setShowForm(!showForm) }}
          className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-medium hover:bg-gold-light transition-colors"
        >
          {showForm ? '取消' : '+ 新增通知'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 rounded-xl bg-navy-800 border border-gold/20">
          <h2 className="text-gold text-sm font-medium mb-4">
            {editingId ? '編輯通知 Edit' : '新增通知 Create'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-white/60 text-xs mb-1 block">標題 (中文)</label>
              <input className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="通知標題" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Title (EN)</label>
              <input className={inputClass} value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} placeholder="Notification title" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-white/60 text-xs mb-1 block">內容 (中文)</label>
              <textarea className={inputClass} rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="通知內容" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Content (EN)</label>
              <textarea className={inputClass} rows={3} value={form.contentEn} onChange={e => setForm({ ...form, contentEn: e.target.value })} placeholder="Notification content" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div>
              <label className="text-white/60 text-xs mb-1 block">類型 Type</label>
              <select className={selectClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">對象 Target</label>
              <select className={selectClass} value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}>
                {TARGETS.map(t => <option key={t} value={t}>{TARGET_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">到期時間 Expires</label>
              <input type="datetime-local" className={selectClass} value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-gold" />
                啟用 Active
              </label>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gold text-navy-950 rounded-lg text-sm font-medium hover:bg-gold-light transition-colors"
          >
            {editingId ? '更新 Update' : '建立 Create'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-center py-8">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-white/40 text-center py-8">No notifications yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 border-b border-gold/10">
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Title</th>
                <th className="text-left py-2 px-3">Target</th>
                <th className="text-right py-2 px-3">Reads</th>
                <th className="text-left py-2 px-3">Created</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => {
                const status = getStatus(n)
                return (
                  <tr key={n.id} className="border-b border-gold/10 hover:bg-white/5">
                    <td className={`py-2 px-3 ${status.color}`}>{status.label}</td>
                    <td className="py-2 px-3 text-white/80">{TYPE_LABELS[n.type] || n.type}</td>
                    <td className="py-2 px-3 text-white">{n.title}</td>
                    <td className="py-2 px-3 text-white/60">{TARGET_LABELS[n.target] || n.target}</td>
                    <td className="py-2 px-3 text-right text-white/60">{n._count.reads}</td>
                    <td className="py-2 px-3 text-white/40 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => handleEdit(n)} className="text-gold hover:text-gold-light text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(n.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
