'use client'

import { useState, useMemo } from 'react'
import { useLang } from '@/components/LanguageContext'
import toast from 'react-hot-toast'
import FamilyDrawer, { type FamilyMemberData } from '../_components/FamilyDrawer'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh
const PAGE_SIZE = 5

const relationLabels: Record<string, { zh: string; en: string }> = {
  spouse: { zh: '配偶', en: 'Spouse' }, father: { zh: '父親', en: 'Father' },
  mother: { zh: '母親', en: 'Mother' }, son: { zh: '兒子', en: 'Son' },
  daughter: { zh: '女兒', en: 'Daughter' }, brother: { zh: '兄弟', en: 'Brother' },
  sister: { zh: '姐妹', en: 'Sister' }, friend: { zh: '朋友', en: 'Friend' },
  other: { zh: '其他', en: 'Other' },
}

interface Props {
  members: FamilyMemberData[]
  onMembersChange: (members: FamilyMemberData[]) => void
}

export default function FamilyTab({ members, onMembersChange }: Props) {
  const { lang } = useLang()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMemberData | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(m => {
      const label = relationLabels[m.relation]
      const searchable = [m.name, m.relation, m.relationDetail, label?.zh, label?.en].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(q)
    })
  }, [members, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleAdd = () => {
    setEditingMember(null)
    setDrawerOpen(true)
  }

  const handleEdit = (m: FamilyMemberData) => {
    setEditingMember(m)
    setDrawerOpen(true)
  }

  const handleSave = async (data: FamilyMemberData) => {
    const isEdit = !!data.id
    try {
      const res = await fetch('/api/family-members', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      if (isEdit) {
        onMembersChange(members.map(m => m.id === data.id ? { ...data, ...result.member } : m))
      } else {
        onMembersChange([...members, result.member])
      }
      toast.success(T(lang, isEdit ? '已更新' : '已新增', isEdit ? 'Updated' : 'Added'))
    } catch {
      toast.error(T(lang, '操作失敗', 'Operation failed'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/family-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      onMembersChange(members.filter(m => m.id !== id))
      toast.success(T(lang, '已刪除', 'Deleted'))
      setConfirmDeleteId(null)
    } catch {
      toast.error(T(lang, '刪除失敗', 'Delete failed'))
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👨‍👩‍👧‍👦</span>
          <h2 className="font-serif text-base" style={{ color: 'var(--gold)' }}>
            {T(lang, '家庭成員', 'Family Members')}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--gold)' }}>{members.length}</span>
        </div>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'var(--gold)', color: '#0a0f1e' }}
        >
          ➕ {T(lang, '新增', 'Add')}
        </button>
      </div>

      {/* Search */}
      {members.length > 3 && (
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder={T(lang, '🔍 搜尋家人...', '🔍 Search members...')}
          className="w-full px-3 py-2 rounded-lg text-sm mb-4 focus:outline-none focus:ring-1"
          style={{ backgroundColor: 'var(--bg-input, #0d1526)', border: '1px solid var(--border-gold, rgba(212,175,55,0.2))', color: 'var(--text-primary)' }}
        />
      )}

      {/* Member list */}
      {paged.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm">{T(lang, '尚未添加家庭成員', 'No family members yet')}</p>
          <p className="text-xs mt-1">{T(lang, '添加家人後可以為他們進行占卜', 'Add members to cast readings for them')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map(m => {
            const label = relationLabels[m.relation]
            const relText = m.relationDetail || (label ? (lang === 'en' ? label.en : label.zh) : m.relation)
            const genderEmoji = m.gender === 'female' ? '👩' : m.gender === 'male' ? '👨' : '👤'
            const birthSummary = [m.birthDate, m.birthTime, m.birthPlace].filter(Boolean).join(' · ')

            return (
              <div key={m.id} className="glass-card rounded-xl p-4 flex items-center gap-3" style={{ border: '1px solid var(--card-border)' }}>
                <span className="text-2xl flex-shrink-0">{genderEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(147,112,219,0.15)', color: 'rgb(167,139,250)' }}>{relText}</span>
                    {m.name && <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</span>}
                  </div>
                  {birthSummary && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{birthSummary}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(m)} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: 'var(--text-muted)' }} title={T(lang, '編輯', 'Edit')}>
                    ✏️
                  </button>
                  {confirmDeleteId === m.id ? (
                    <span className="flex items-center gap-1 text-[10px]">
                      <button onClick={() => handleDelete(m.id!)} className="text-red-400 hover:text-red-300 font-medium">{T(lang, '刪除', 'Del')}</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ color: 'var(--text-muted)' }}>{T(lang, '取消', 'No')}</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(m.id!)} className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-red-400/50 hover:text-red-400" title={T(lang, '刪除', 'Delete')}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="disabled:opacity-30">←</button>
          <span>{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30">→</button>
        </div>
      )}

      {/* Drawer */}
      <FamilyDrawer
        open={drawerOpen}
        member={editingMember}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
