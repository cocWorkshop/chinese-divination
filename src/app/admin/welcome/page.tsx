'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface WelcomeRule {
  id: string
  name: string
  condition: { stage?: string; isWeekend?: boolean }
  messages: { zh: string[]; en: string[] }
  recommendType: string | null
  priority: number
  enabled: boolean
}

const STAGE_OPTIONS = ['new', 'beginner', 'intermediate', 'advanced', 'any']
const TYPE_OPTIONS = ['', 'bazi', 'ziwei', 'liuyao', 'iching', 'qimen', 'fengshui', 'meihua']
const TYPE_LABELS: Record<string, string> = {
  '': 'None (Random)',
  bazi: 'BaZi 八字',
  ziwei: 'Zi Wei 紫微',
  liuyao: 'Liu Yao 六爻',
  iching: 'I Ching 易經',
  qimen: 'Qi Men 奇門',
  fengshui: 'Feng Shui 風水',
  meihua: 'Mei Hua 梅花',
}

export default function AdminWelcomePage() {
  const [rules, setRules] = useState<WelcomeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<WelcomeRule | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/admin/welcome-rules')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRules(data) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleEnabled = async (rule: WelcomeRule) => {
    const res = await fetch(`/api/admin/welcome-rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
    })
    if (res.ok) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this welcome rule?')) return
    const res = await fetch(`/api/admin/welcome-rules/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success('Deleted')
    }
  }

  const addNew = () => {
    setEditing({
      id: '',
      name: 'New Rule',
      condition: { stage: 'new' },
      messages: { zh: [''], en: [''] },
      recommendType: 'bazi',
      priority: 0,
      enabled: true,
    })
  }

  const saveRule = async () => {
    if (!editing) return
    setSaving(true)
    const isNew = !editing.id
    const url = isNew ? '/api/admin/welcome-rules' : `/api/admin/welcome-rules/${editing.id}`
    const method = isNew ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })

    if (res.ok) {
      toast.success(isNew ? 'Created' : 'Updated')
      setEditing(null)
      load()
    } else {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading...</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-gold">歡迎語管理</h1>
          <p className="text-white/40 text-sm mt-1">Welcome Messages</p>
        </div>
        <button
          onClick={addNew}
          className="px-4 py-2 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors text-sm"
        >
          + Add Rule
        </button>
      </div>

      {/* Rules table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20">
              <th className="text-left px-4 py-3 text-white/60">Name</th>
              <th className="text-left px-4 py-3 text-white/60">Stage</th>
              <th className="text-left px-4 py-3 text-white/60">Recommend</th>
              <th className="text-center px-4 py-3 text-white/60">Priority</th>
              <th className="text-center px-4 py-3 text-white/60">Messages</th>
              <th className="text-center px-4 py-3 text-white/60">Enabled</th>
              <th className="text-right px-4 py-3 text-white/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} className="border-b border-gold/10 hover:bg-white/5">
                <td className="px-4 py-3 text-white/80">{rule.name}</td>
                <td className="px-4 py-3 text-white/60">
                  {rule.condition.stage || 'any'}
                  {rule.condition.isWeekend && ' (weekend)'}
                </td>
                <td className="px-4 py-3 text-white/60">{rule.recommendType || 'random'}</td>
                <td className="px-4 py-3 text-center text-white/60">{rule.priority}</td>
                <td className="px-4 py-3 text-center text-white/60">
                  {(rule.messages.zh?.length || 0)} zh / {(rule.messages.en?.length || 0)} en
                </td>
                <td className="px-4 py-3 text-center">
                  <div
                    onClick={() => toggleEnabled(rule)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mx-auto ${
                      rule.enabled ? 'bg-jade' : 'bg-navy-800 border border-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      rule.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setEditing(rule)} className="text-gold hover:text-gold-light text-xs">Edit</button>
                  <button onClick={() => deleteRule(rule.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/40">No welcome rules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" style={{ borderColor: 'var(--border-gold, rgba(212,168,83,0.3))' }}>
            <h2 className="text-lg font-serif text-gold mb-4">{editing.id ? 'Edit Rule' : 'New Rule'}</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-white/60 text-sm block mb-1">Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/50 text-sm"
                />
              </div>

              {/* Stage */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-white/60 text-sm block mb-1">Stage</label>
                  <select
                    value={editing.condition.stage || 'any'}
                    onChange={e => setEditing({ ...editing, condition: { ...editing.condition, stage: e.target.value } })}
                    className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none text-sm"
                  >
                    {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1">Weekend Only</label>
                  <div
                    onClick={() => setEditing({ ...editing, condition: { ...editing.condition, isWeekend: !editing.condition.isWeekend } })}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-2 ${
                      editing.condition.isWeekend ? 'bg-jade' : 'bg-navy-800 border border-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      editing.condition.isWeekend ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Recommend Type & Priority */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-white/60 text-sm block mb-1">Recommend Type</label>
                  <select
                    value={editing.recommendType || ''}
                    onChange={e => setEditing({ ...editing, recommendType: e.target.value || null })}
                    className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none text-sm"
                  >
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-white/60 text-sm block mb-1">Priority</label>
                  <input
                    type="number"
                    value={editing.priority}
                    onChange={e => setEditing({ ...editing, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Messages ZH */}
              <div>
                <label className="text-white/60 text-sm block mb-1">Messages (中文) — one per line</label>
                <textarea
                  value={(editing.messages.zh || []).join('\n')}
                  onChange={e => setEditing({ ...editing, messages: { ...editing.messages, zh: e.target.value.split('\n').filter(Boolean) } })}
                  rows={4}
                  className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none text-sm font-mono"
                />
              </div>

              {/* Messages EN */}
              <div>
                <label className="text-white/60 text-sm block mb-1">Messages (English) — one per line</label>
                <textarea
                  value={(editing.messages.en || []).join('\n')}
                  onChange={e => setEditing({ ...editing, messages: { ...editing.messages, en: e.target.value.split('\n').filter(Boolean) } })}
                  rows={4}
                  className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none text-sm font-mono"
                />
              </div>

              {/* Enabled */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setEditing({ ...editing, enabled: !editing.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    editing.enabled ? 'bg-jade' : 'bg-navy-800 border border-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    editing.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
                <span className="text-white/60 text-sm">Enabled</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-white/60 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                disabled={saving}
                className="px-6 py-2 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light disabled:opacity-50 transition-colors text-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
