'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'
import BirthplaceInput from '@/components/BirthplaceInput'

const relationPresets = [
  { value: 'spouse', zh: '配偶', en: 'Spouse' },
  { value: 'father', zh: '父親', en: 'Father' },
  { value: 'mother', zh: '母親', en: 'Mother' },
  { value: 'son', zh: '兒子', en: 'Son' },
  { value: 'daughter', zh: '女兒', en: 'Daughter' },
  { value: 'brother', zh: '兄弟', en: 'Brother' },
  { value: 'sister', zh: '姐妹', en: 'Sister' },
  { value: 'friend', zh: '朋友', en: 'Friend' },
  { value: 'other', zh: '其他', en: 'Other' },
]

interface FamilyMember {
  id: string
  relation: string
  name: string | null
  birthDate: string | null
  birthTime: string | null
  birthPlace: string | null
  gender: string | null
}

const shichen = [
  { value: 'zi',   label: '子時  23:00 – 01:00' },
  { value: 'chou', label: '丑時  01:00 – 03:00' },
  { value: 'yin',  label: '寅時  03:00 – 05:00' },
  { value: 'mao',  label: '卯時  05:00 – 07:00' },
  { value: 'chen', label: '辰時  07:00 – 09:00' },
  { value: 'si',   label: '巳時  09:00 – 11:00' },
  { value: 'wu',   label: '午時  11:00 – 13:00' },
  { value: 'wei',  label: '未時  13:00 – 15:00' },
  { value: 'shen', label: '申時  15:00 – 17:00' },
  { value: 'you',  label: '酉時  17:00 – 19:00' },
  { value: 'xu',   label: '戌時  19:00 – 21:00' },
  { value: 'hai',  label: '亥時  21:00 – 23:00' },
]

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { lang, setLang } = useLang()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '', language: 'zh-TW',
    newPassword: '', currentPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [fbRating, setFbRating] = useState(0)
  const [fbText, setFbText] = useState('')
  const [fbSending, setFbSending] = useState(false)
  const [fbSent, setFbSent] = useState(false)
  const [fbHistory, setFbHistory] = useState<{ id: string; rating: number | null; feedback: string; createdAt: string }[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<FamilyMember>>({})
  const [addingMember, setAddingMember] = useState(false)
  const [newMember, setNewMember] = useState<Partial<FamilyMember>>({ relation: '', name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '' })
  const [credits, setCredits] = useState<Record<string, { remaining: number; dailyLimit: number }> | null>(null)
  const [userBonus, setUserBonus] = useState<{ model1: number; model2: number; chat: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteEmailSent, setDeleteEmailSent] = useState(false)

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (res.ok) {
        setDeleteEmailSent(true)
        setShowDeleteConfirm(false)
        setDeletePassword('')
      } else {
        const data = await res.json()
        toast.error(data.error === 'Invalid password'
          ? T(lang, '密碼錯誤', 'Invalid password')
          : data.error === 'Failed to send email'
          ? T(lang, '郵件發送失敗，請稍後再試', 'Failed to send email, please try again later')
          : T(lang, '刪除失敗', 'Delete failed'))
      }
    } catch {
      toast.error(T(lang, '操作失敗', 'Operation failed'))
    } finally {
      setDeleteLoading(false)
    }
  }, [deletePassword, lang])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (session?.user?.name) setForm(f => ({ ...f, name: session.user?.name || '' }))
  }, [status, session, router])

  useEffect(() => {
    if (session) {
      fetch('/api/family-members').then(r => r.json()).then(data => setFamilyMembers(data.members || [])).catch(() => {})
      fetch('/api/site-feedback').then(r => r.json()).then(data => setFbHistory(data.feedbacks || [])).catch(() => {})
      fetch('/api/credits').then(r => r.json()).then(data => {
        setCredits(data)
        if (data.bonusModel1 !== undefined) setUserBonus({ model1: data.bonusModel1 || 0, model2: data.bonusModel2 || 0, chat: data.bonusChat || 0 })
      }).catch(() => {})
    }
  }, [session])

  const addFamilyMember = async () => {
    if (!newMember.relation) { toast.error(T(lang, '請選擇關係', 'Please select relationship')); return }
    const res = await fetch('/api/family-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMember) })
    if (res.ok) {
      const { member } = await res.json()
      setFamilyMembers(prev => [...prev, member])
      setNewMember({ relation: '', name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '' })
      setAddingMember(false)
      toast.success(T(lang, '已新增', 'Added'))
    }
  }

  const updateFamilyMember = async (id: string) => {
    const res = await fetch('/api/family-members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...editForm }) })
    if (res.ok) {
      const { member } = await res.json()
      setFamilyMembers(prev => prev.map(m => m.id === id ? member : m))
      setEditingMember(null)
      toast.success(T(lang, '已更新', 'Updated'))
    }
  }

  const deleteFamilyMember = async (id: string) => {
    const res = await fetch('/api/family-members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) {
      setFamilyMembers(prev => prev.filter(m => m.id !== id))
      toast.success(T(lang, '已刪除', 'Deleted'))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(T(lang, '儲存成功', 'Saved'))
      if (form.language === 'zh-TW' || form.language === 'en') setLang(form.language as 'zh-TW' | 'en')
    } else {
      const d = await res.json()
      toast.error(d.error || 'Error')
    }
  }

  const inputCls = "w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
  const labelCls = "block text-white/70 text-sm mb-1"

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <MysticalLoader lang={lang} variant="page" />
    </div>
  )

  return (
    <div className="min-h-screen py-12 px-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-serif text-gold mb-8">{T(lang, '個人資料', 'Profile')}</h1>

      {/* Credits Module */}
      {credits && (
        <div className="glass-card rounded-2xl p-5 sm:p-6 mb-6 border" style={{ borderColor: 'var(--card-border)' }}>
          <h2 className="font-serif text-sm mb-4" style={{ color: 'var(--gold)' }}>
            🔮 {T(lang, '每日配額', 'Daily Quota')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'model1', label: T(lang, '⚡ 標準模型', '⚡ Standard'), data: credits.model1 },
              { key: 'model2', label: T(lang, '🌟 高級模型', '🌟 Premium'), data: credits.model2 },
              { key: 'chat', label: T(lang, '💬 問答聊天', '💬 Chat'), data: credits.chat },
            ].map(m => {
              const d = m.data as { remaining: number; used: number; dailyLimit: number; bonus: number }
              if (!d) return null
              const isUnlimited = d.dailyLimit === -1
              const pct = isUnlimited ? 100 : d.dailyLimit > 0 ? Math.round((d.remaining / d.dailyLimit) * 100) : 0
              return (
                <div key={m.key} className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--accent-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                    <span className="text-xs" style={{ color: 'var(--gold)' }}>
                      {isUnlimited ? '∞' : `${d.remaining} / ${d.dailyLimit}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div className="h-2 rounded-full mb-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: pct > 30 ? 'var(--gold)' : '#ef4444' }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{T(lang, `今日已用 ${d.used} 次`, `Used ${d.used} today`)}</span>
                    {d.bonus > 0 && (
                      <span style={{ color: '#2dd489' }}>+{d.bonus} {T(lang, '儲備', 'reserve')}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {userBonus && (userBonus.model1 > 0 || userBonus.model2 > 0 || userBonus.chat > 0) && (
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              <span>🎁 {T(lang, '儲備額度', 'Reserve Credits')}:</span>
              {userBonus.model1 > 0 && <span>⚡ ×{userBonus.model1}</span>}
              {userBonus.model2 > 0 && <span>🌟 ×{userBonus.model2}</span>}
              {userBonus.chat > 0 && <span>💬 ×{userBonus.chat}</span>}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="glass-card rounded-2xl p-8 space-y-5">
        <div>
          <label className={labelCls}>{T(lang, '姓名', 'Name')}</label>
          <input type="text" className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '出生日期（公曆）', 'Birth Date (Solar)')}</label>
          <input type="date" className={inputCls} value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
          <p className="text-white/30 text-xs mt-1">{T(lang, '此處請填寫公曆（陽曆）日期。占卜時可選擇農曆輸入。', 'Enter solar calendar date here. Lunar input available in divination forms.')}</p>
        </div>
        <div>
          <label className={labelCls}>{T(lang, '出生時辰', 'Birth Time')}</label>
          <select className={inputCls} value={form.birthTime} onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))}>
            <option value="">{T(lang, '請選擇', 'Select')}</option>
            {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
          <BirthplaceInput
            value={form.birthPlace}
            onChange={v => setForm(f => ({ ...f, birthPlace: v }))}
            className={inputCls}
            placeholder={T(lang, '輸入城市名稱搜尋...', 'Search city name...')}
          />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
          <select className={inputCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">{T(lang, '請選擇', 'Select')}</option>
            <option value="male">{T(lang, '男', 'Male')}</option>
            <option value="female">{T(lang, '女', 'Female')}</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{T(lang, '介面語言', 'Language')}</label>
          <select className={inputCls} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <hr className="border-gold/20" />
        <p className="text-white/50 text-sm">{T(lang, '修改密碼（留空則不更改）', 'Change password (leave blank to keep)')}</p>
        <div>
          <label className={labelCls}>{T(lang, '當前密碼', 'Current Password')}</label>
          <input type="password" className={inputCls} value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '新密碼', 'New Password')}</label>
          <input type="password" className={inputCls} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '儲存', 'Save')}
        </button>
      </form>

      {/* Family Members Section */}
      <h2 className="text-2xl font-serif text-gold mt-12 mb-4">{T(lang, '家庭成員', 'Family Members')}</h2>
      <div className="glass-card rounded-2xl p-8 space-y-4">
        {familyMembers.length === 0 && !addingMember && (
          <p className="text-white/50 text-sm">{T(lang, '尚未新增家庭成員', 'No family members added yet')}</p>
        )}

        {familyMembers.map(member => (
          <div key={member.id} className="border border-gold/20 rounded-xl p-4 bg-navy-900/50">
            {editingMember === member.id ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>{T(lang, '關係', 'Relationship')}</label>
                  <select className={inputCls} value={editForm.relation || ''} onChange={e => setEditForm(f => ({ ...f, relation: e.target.value }))}>
                    {relationPresets.map(r => <option key={r.value} value={r.value}>{lang === 'en' ? r.en : `${r.zh} (${r.en})`}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '姓名', 'Name')}</label>
                  <input type="text" className={inputCls} value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                  <input type="date" className={inputCls} value={editForm.birthDate || ''} onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生時辰', 'Birth Time')}</label>
                  <select className={inputCls} value={editForm.birthTime || ''} onChange={e => setEditForm(f => ({ ...f, birthTime: e.target.value }))}>
                    <option value="">{T(lang, '請選擇', 'Select')}</option>
                    {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
                  <input type="text" className={inputCls} value={editForm.birthPlace || ''} onChange={e => setEditForm(f => ({ ...f, birthPlace: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
                  <select className={inputCls} value={editForm.gender || ''} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">{T(lang, '請選擇', 'Select')}</option>
                    <option value="male">{T(lang, '男', 'Male')}</option>
                    <option value="female">{T(lang, '女', 'Female')}</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateFamilyMember(member.id)} className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold">{T(lang, '儲存', 'Save')}</button>
                  <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 border border-white/20 text-white/60 rounded-lg text-sm">{T(lang, '取消', 'Cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gold font-medium">
                    {relationPresets.find(r => r.value === member.relation)?.[lang === 'en' ? 'en' : 'zh'] || member.relation}
                    {member.name ? ` — ${member.name}` : ''}
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    {[member.birthDate, member.birthTime, member.birthPlace, member.gender === 'male' ? T(lang, '男', 'M') : member.gender === 'female' ? T(lang, '女', 'F') : ''].filter(Boolean).join(' · ') || T(lang, '未填寫生辰資訊', 'No birth info')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setEditingMember(member.id); setEditForm({ relation: member.relation, name: member.name || '', birthDate: member.birthDate || '', birthTime: member.birthTime || '', birthPlace: member.birthPlace || '', gender: member.gender || '' }) }} className="text-white/40 hover:text-gold text-xs">✏️</button>
                  <button type="button" onClick={() => deleteFamilyMember(member.id)} className="text-white/40 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {addingMember ? (
          <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-3">
            <div>
              <label className={labelCls}>{T(lang, '關係', 'Relationship')}</label>
              <select className={inputCls} value={newMember.relation || ''} onChange={e => setNewMember(f => ({ ...f, relation: e.target.value }))}>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {relationPresets.map(r => <option key={r.value} value={r.value}>{lang === 'en' ? r.en : `${r.zh} (${r.en})`}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '姓名（可選）', 'Name (optional)')}</label>
              <input type="text" className={inputCls} value={newMember.name || ''} onChange={e => setNewMember(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
              <input type="date" className={inputCls} value={newMember.birthDate || ''} onChange={e => setNewMember(f => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生時辰', 'Birth Time')}</label>
              <select className={inputCls} value={newMember.birthTime || ''} onChange={e => setNewMember(f => ({ ...f, birthTime: e.target.value }))}>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
              <input type="text" className={inputCls} value={newMember.birthPlace || ''} onChange={e => setNewMember(f => ({ ...f, birthPlace: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
              <select className={inputCls} value={newMember.gender || ''} onChange={e => setNewMember(f => ({ ...f, gender: e.target.value }))}>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                <option value="male">{T(lang, '男', 'Male')}</option>
                <option value="female">{T(lang, '女', 'Female')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addFamilyMember} className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold">{T(lang, '新增', 'Add')}</button>
              <button type="button" onClick={() => setAddingMember(false)} className="px-4 py-2 border border-white/20 text-white/60 rounded-lg text-sm">{T(lang, '取消', 'Cancel')}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAddingMember(true)} className="w-full py-3 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors text-sm">
            {T(lang, '➕ 新增成員', '➕ Add Member')}
          </button>
        )}
      </div>

      {/* Site Feedback */}
      <div className="glass-card rounded-2xl p-5 sm:p-8 space-y-4">
        <h2 className="text-lg font-serif mb-4" style={{ color: 'var(--gold)' }}>
          💬 {T(lang, '意見回饋', 'Feedback')}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          {T(lang, '您的意見對我們非常重要，幫助我們持續改進服務。', 'Your feedback helps us improve our service.')}
        </p>

        {fbSent ? (
          <div className="py-4 text-center rounded-xl" style={{ backgroundColor: 'rgba(45, 212, 137, 0.1)', color: '#2dd489' }}>
            ✓ {T(lang, '感謝您的回饋！', 'Thank you for your feedback!')}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Star rating */}
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{T(lang, '整體評分', 'Overall Rating')}</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setFbRating(n)}
                    className="text-2xl transition-transform hover:scale-110"
                    style={{ color: n <= fbRating ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }}
                  >★</button>
                ))}
              </div>
            </div>
            {/* Text */}
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{T(lang, '建議或意見', 'Comments or Suggestions')}</label>
              <textarea
                value={fbText}
                onChange={e => setFbText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={T(lang, '分享您的使用體驗、建議或問題...', 'Share your experience, suggestions, or issues...')}
                className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              type="button"
              disabled={!fbText.trim() || fbSending}
              onClick={async () => {
                setFbSending(true)
                try {
                  const res = await fetch('/api/site-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: fbRating || null, feedback: fbText }),
                  })
                  if (res.ok) {
                    setFbSent(true)
                    toast.success(T(lang, '感謝回饋！', 'Thanks for your feedback!'))
                    setTimeout(() => { setFbSent(false); setFbRating(0); setFbText('') }, 3000)
                    fetch('/api/site-feedback').then(r => r.json()).then(data => setFbHistory(data.feedbacks || [])).catch(() => {})
                  }
                } catch { toast.error('Error') }
                setFbSending(false)
              }}
              className="px-5 py-2 rounded-xl font-medium text-sm transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--gold)', color: 'var(--bg-primary)' }}
            >
              {fbSending ? '...' : T(lang, '提交回饋', 'Submit Feedback')}
            </button>
          </div>
        )}

        {/* History */}
        {fbHistory.length > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <h3 className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{T(lang, '過往回饋', 'Past Feedback')}</h3>
            <div className="space-y-2">
              {fbHistory.map(fb => (
                <div key={fb.id} className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--accent-bg)' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ color: 'var(--gold)' }}>{fb.rating ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : ''}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>{fb.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Management (GDPR/PIPEDA) */}
      <div className="glass-card rounded-2xl p-5 sm:p-8 mt-6 border" style={{ borderColor: 'var(--card-border)' }}>
        <h2 className="text-lg font-serif mb-4" style={{ color: 'var(--gold)' }}>
          {T(lang, '數據管理', 'Data Management')}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          {T(lang,
            '根據 GDPR 和 PIPEDA，您有權導出或刪除您的所有個人數據。',
            'Under GDPR and PIPEDA, you have the right to export or delete all your personal data.'
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              window.open('/api/profile/export', '_blank')
              toast.success(T(lang, '數據導出已開始', 'Data export started'))
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
          >
            📥 {T(lang, '導出我的數據', 'Export My Data')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
          >
            🗑️ {T(lang, '刪除帳號', 'Delete Account')}
          </button>
        </div>

        {deleteEmailSent && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(45,212,137,0.05)', border: '1px solid rgba(45,212,137,0.2)' }}>
            <p className="text-sm" style={{ color: '#2dd489' }}>
              ✉️ {T(lang,
                '確認郵件已發送至您的信箱。請點擊郵件中的連結完成帳號刪除。連結 24 小時內有效。',
                'A confirmation email has been sent to your inbox. Please click the link in the email to complete the account deletion. The link is valid for 24 hours.'
              )}
            </p>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm mb-3" style={{ color: '#fca5a5' }}>
              ⚠️ {T(lang,
                '我們將發送一封確認郵件到您的信箱。請點擊郵件中的連結完成帳號刪除。請輸入密碼以繼續。',
                'We will send a confirmation email to your inbox. Click the link in the email to complete account deletion. Enter your password to continue.'
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder={T(lang, '請輸入密碼', 'Enter password')}
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={!deletePassword || deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors"
                style={{ backgroundColor: '#dc2626' }}
              >
                {deleteLoading ? '...' : T(lang, '發送確認信', 'Send Confirmation')}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword('') }}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {T(lang, '取消', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
