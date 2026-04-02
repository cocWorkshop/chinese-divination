'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'
import BirthplaceInput from '@/components/BirthplaceInput'
import { catchAndReport } from '@/lib/errorReporter'

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
  calendarType: string | null
  timeMode: string | null
  exactTime: string | null
  birthLat: number | null
  birthLng: number | null
  birthEnvironment: string | null
}

const shichen = [
  { value: 'zi_early', label: '早子時  00:00 – 01:00' },
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
  { value: 'zi_late', label: '晚子時  23:00 – 00:00' },
]

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

type TabKey = 'personal' | 'family' | 'credits' | 'account'

const TABS: { key: TabKey; icon: string; zh: string; en: string }[] = [
  { key: 'personal', icon: '👤', zh: '個人資料', en: 'Personal Info' },
  { key: 'family', icon: '👨‍👩‍👦', zh: '家庭成員', en: 'Family Members' },
  { key: 'credits', icon: '✨', zh: '機緣簿', en: 'Credit Ledger' },
  { key: 'account', icon: '⚙️', zh: '帳號設置', en: 'Account' },
]

const PAGE_SIZE = 5

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { lang, setLang } = useLang()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  const [form, setForm] = useState({
    name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '', language: 'zh-TW',
    timeMode: 'fuzzy' as 'fuzzy' | 'precise', calendarType: 'solar' as 'solar' | 'lunar',
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
  const [newMember, setNewMember] = useState<Partial<FamilyMember>>({ relation: '', name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '', calendarType: 'solar', timeMode: 'fuzzy', exactTime: '', birthLat: null, birthLng: null, birthEnvironment: '' })
  const [credits, setCredits] = useState<{ credits: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteEmailSent, setDeleteEmailSent] = useState(false)
  const [familySearch, setFamilySearch] = useState('')
  const [familyPage, setFamilyPage] = useState(0)
  const [creditLogs, setCreditLogs] = useState<{ id: string; action: string; amount: number; balance: number; source: string; note: string | null; createdAt: string }[]>([])
  const [creditLogPage, setCreditLogPage] = useState(1)
  const [creditLogPages, setCreditLogPages] = useState(1)
  const [creditLogLoading, setCreditLogLoading] = useState(false)

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
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetch('/api/profile').then(r => r.json()).then(data => {
        if (!data.error) {
          setForm(f => ({
            ...f,
            name: data.name || '',
            birthDate: data.birthDate || '',
            birthTime: data.birthTime || '',
            birthPlace: data.birthPlace || '',
            gender: data.gender || '',
            language: data.language || 'zh-TW',
            timeMode: data.timeMode || 'fuzzy',
            calendarType: data.calendarType || 'solar',
          }))
        }
      }).catch(catchAndReport('/api/profile'))
      fetch('/api/family-members').then(r => r.json()).then(data => setFamilyMembers(data.members || [])).catch(catchAndReport('/api/family-members'))
      fetch('/api/site-feedback').then(r => r.json()).then(data => setFbHistory(data.feedbacks || [])).catch(catchAndReport('/api/site-feedback'))
      fetch('/api/credits').then(r => r.json()).then(data => {
        setCredits(data)
      }).catch(catchAndReport('/api/credits'))
      fetch('/api/credits/history').then(r => r.json()).then(data => {
        setCreditLogs(data.logs || [])
        setCreditLogPages(data.pages || 1)
      }).catch(catchAndReport('/api/credits/history'))
    }
  }, [session])

  const filteredMembers = useMemo(() => {
    if (!familySearch.trim()) return familyMembers
    const q = familySearch.toLowerCase()
    return familyMembers.filter(m => {
      const relationLabel = relationPresets.find(r => r.value === m.relation)
      const searchable = [
        m.name,
        m.relation,
        relationLabel?.zh,
        relationLabel?.en,
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(q)
    })
  }, [familyMembers, familySearch])

  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE)
  const pagedMembers = filteredMembers.slice(familyPage * PAGE_SIZE, (familyPage + 1) * PAGE_SIZE)

  useEffect(() => { setFamilyPage(0) }, [familySearch])

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
    <div className="flex-1 flex items-center justify-center">
      <MysticalLoader lang={lang} variant="page" />
    </div>
  )

  return (
    <div className="flex-1 py-8 sm:py-12 px-3 sm:px-4 w-full max-w-2xl mx-auto">
      {/* Page Header Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 rounded-2xl border border-gold/20 pointer-events-none" />
        <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.2), rgba(212,168,83,0.05))', border: '2px solid rgba(212,168,83,0.3)' }}>
          👤
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-gold">
          {T(lang, '個人資料', 'Profile')}
        </h1>
        {session?.user?.email && (
          <p className="text-white/40 text-sm mt-1">{session.user.email}</p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-xl overflow-hidden mb-6 border border-gold/20">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors text-center ${
              activeTab === tab.key
                ? 'bg-gold text-navy-950'
                : 'bg-navy-800/50 text-white/50 hover:text-white/70 hover:bg-navy-800'
            }`}
          >
            <span className="block sm:inline">{tab.icon}</span>{' '}
            <span className="hidden sm:inline">{T(lang, tab.zh, tab.en)}</span>
          </button>
        ))}
      </div>

      {/* ========== Personal Info Tab ========== */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Info Card */}
          <div className="glass-card rounded-2xl">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <span className="text-lg">🏷️</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '個人信息', 'Personal Info')}</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '姓名', 'Name')}</label>
                  <input type="text" className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '介面語言', 'Language')}</label>
                  <select className={inputCls} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="zh-TW">繁體中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Birth Info Card */}
          <div className="glass-card rounded-2xl">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <span className="text-lg">📅</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '生辰信息', 'Birth Info')}</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              {/* Calendar + Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                  <div className="flex rounded-lg overflow-hidden border border-gold/20">
                    {[
                      { value: 'solar', label: T(lang, '公曆', 'Solar') },
                      { value: 'lunar', label: T(lang, '農曆', 'Lunar') },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.calendarType === opt.value ? 'bg-gold text-navy-950' : 'bg-navy-800 text-white/60 hover:text-white/80'}`}
                        onClick={() => setForm(f => ({ ...f, calendarType: opt.value as 'solar' | 'lunar' }))}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                  <input type="date" className={inputCls} value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                  <p className="text-white/30 text-xs mt-1">
                    {form.calendarType === 'lunar'
                      ? T(lang, '請填寫農曆日期', 'Enter lunar date')
                      : T(lang, '請填寫公曆日期', 'Enter solar date')}
                  </p>
                </div>
              </div>

              {/* Time mode + Time row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '時間模式', 'Time Mode')}</label>
                  <div className="flex rounded-lg overflow-hidden border border-gold/20">
                    {[
                      { value: 'fuzzy', label: T(lang, '時辰', 'Shichen') },
                      { value: 'precise', label: T(lang, '精確', 'Exact') },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.timeMode === opt.value ? 'bg-gold text-navy-950' : 'bg-navy-800 text-white/60 hover:text-white/80'}`}
                        onClick={() => setForm(f => ({ ...f, timeMode: opt.value as 'fuzzy' | 'precise' }))}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生時辰', 'Birth Time')}</label>
                  {form.timeMode === 'precise' ? (
                    <input type="time" className={inputCls} value={form.birthTime} onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))} />
                  ) : (
                    <select className={inputCls} value={form.birthTime} onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))}>
                      <option value="">{T(lang, '請選擇', 'Select')}</option>
                      {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Birthplace + Gender row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
                  <BirthplaceInput
                    value={form.birthPlace}
                    onChange={v => setForm(f => ({ ...f, birthPlace: v }))}
                    className={inputCls}
                    placeholder={T(lang, '搜尋城市...', 'Search city...')}
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
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '💾 儲存', '💾 Save')}
          </button>
        </form>
      )}

      {/* ========== Family Members Tab ========== */}
      {activeTab === 'family' && (
        <div className="glass-card rounded-2xl">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
            <div className="flex items-center gap-3">
              <span className="text-lg">👨‍👩‍👧‍👦</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '家庭成員', 'Family Members')}</h2>
            </div>
            {!addingMember && (
              <button type="button" onClick={() => setAddingMember(true)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-gold/10"
                style={{ border: '1px solid rgba(212,168,83,0.3)', color: 'var(--gold)' }}>
                ➕ {T(lang, '新增', 'Add')}
              </button>
            )}
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            {/* Search box */}
            {familyMembers.length > 0 && (
              <input
                type="text"
                value={familySearch}
                onChange={e => setFamilySearch(e.target.value)}
                placeholder={T(lang, '搜尋姓名或關係...', 'Search by name or relation...')}
                className={inputCls + ' mb-2'}
              />
            )}

            {filteredMembers.length === 0 && !addingMember && (
              <p className="text-white/40 text-sm text-center py-4">
                {familySearch
                  ? T(lang, '沒有找到匹配的成員', 'No matching members found')
                  : T(lang, '尚未新增家庭成員', 'No family members added yet')}
              </p>
            )}

            {pagedMembers.map(member => (
              <div key={member.id} className="rounded-xl p-4 border border-gold/10 bg-navy-900/50">
                {editingMember === member.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                        <div className="flex rounded-lg overflow-hidden border border-gold/20">
                          {[
                            { value: 'solar', label: T(lang, '公曆', 'Solar') },
                            { value: 'lunar', label: T(lang, '農曆', 'Lunar') },
                          ].map(opt => (
                            <button key={opt.value} type="button"
                              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editForm.calendarType === opt.value ? 'bg-gold text-navy-950' : 'bg-navy-800 text-white/60 hover:text-white/80'}`}
                              onClick={() => setEditForm(f => ({ ...f, calendarType: opt.value }))}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                        <input type="date" className={inputCls} value={editForm.birthDate || ''} onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{T(lang, '時間模式', 'Time Mode')}</label>
                        <div className="flex rounded-lg overflow-hidden border border-gold/20">
                          {[
                            { value: 'fuzzy', label: T(lang, '時辰', 'Shichen') },
                            { value: 'precise', label: T(lang, '精確', 'Exact') },
                          ].map(opt => (
                            <button key={opt.value} type="button"
                              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editForm.timeMode === opt.value ? 'bg-gold text-navy-950' : 'bg-navy-800 text-white/60 hover:text-white/80'}`}
                              onClick={() => setEditForm(f => ({ ...f, timeMode: opt.value }))}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{editForm.timeMode === 'precise' ? T(lang, '精確時間', 'Exact Time') : T(lang, '出生時辰', 'Birth Time')}</label>
                        {editForm.timeMode === 'precise' ? (
                          <input type="time" className={inputCls} value={editForm.exactTime || ''} onChange={e => setEditForm(f => ({ ...f, exactTime: e.target.value }))} />
                        ) : (
                          <select className={inputCls} value={editForm.birthTime || ''} onChange={e => setEditForm(f => ({ ...f, birthTime: e.target.value }))}>
                            <option value="">{T(lang, '請選擇', 'Select')}</option>
                            {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
                        <BirthplaceInput
                          value={editForm.birthPlace || ''}
                          onChange={v => setEditForm(f => ({ ...f, birthPlace: v }))}
                          onLatLngChange={(lat, lng) => setEditForm(f => ({ ...f, birthLat: lat, birthLng: lng }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
                        <select className={inputCls} value={editForm.gender || ''} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                          <option value="">{T(lang, '請選擇', 'Select')}</option>
                          <option value="male">{T(lang, '男', 'Male')}</option>
                          <option value="female">{T(lang, '女', 'Female')}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{T(lang, '出生環境（可選）', 'Birth Environment (optional)')}</label>
                      <input type="text" className={inputCls} value={editForm.birthEnvironment || ''} onChange={e => setEditForm(f => ({ ...f, birthEnvironment: e.target.value }))} placeholder={T(lang, '例：農村、城市、山區...', 'e.g. rural, urban, mountainous...')} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => updateFamilyMember(member.id)} className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold">{T(lang, '儲存', 'Save')}</button>
                      <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 border border-white/20 text-white/60 rounded-lg text-sm">{T(lang, '取消', 'Cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                        style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)' }}>
                        {member.gender === 'male' ? '👨' : member.gender === 'female' ? '👩' : '👤'}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gold">
                          {relationPresets.find(r => r.value === member.relation)?.[lang === 'en' ? 'en' : 'zh'] || member.relation}
                          {member.name ? ` — ${member.name}` : ''}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {[member.birthDate, member.birthTime, member.birthPlace].filter(Boolean).join(' · ') || T(lang, '未填寫生辰', 'No birth info')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingMember(member.id); setEditForm({ relation: member.relation, name: member.name || '', birthDate: member.birthDate || '', birthTime: member.birthTime || '', birthPlace: member.birthPlace || '', gender: member.gender || '', calendarType: member.calendarType || 'solar', timeMode: member.timeMode || 'fuzzy', exactTime: member.exactTime || '', birthLat: member.birthLat ?? null, birthLng: member.birthLng ?? null, birthEnvironment: member.birthEnvironment || '' }) }}
                        className="text-white/30 hover:text-gold text-sm transition-colors">✏️</button>
                      <button type="button" onClick={() => deleteFamilyMember(member.id)}
                        className="text-white/30 hover:text-red-400 text-sm transition-colors">✕</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-3">
                <button
                  type="button"
                  disabled={familyPage === 0}
                  onClick={() => setFamilyPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors border border-gold/20 text-white/60 hover:text-white disabled:opacity-30"
                >
                  ← {T(lang, '上一頁', 'Prev')}
                </button>
                <span className="text-white/40 text-sm">{familyPage + 1} / {totalPages}</span>
                <button
                  type="button"
                  disabled={familyPage >= totalPages - 1}
                  onClick={() => setFamilyPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors border border-gold/20 text-white/60 hover:text-white disabled:opacity-30"
                >
                  {T(lang, '下一頁', 'Next')} →
                </button>
              </div>
            )}

            {addingMember && (
              <div className="rounded-xl p-4 space-y-3 border border-gold/20 bg-navy-900/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                    <div className="flex rounded-lg overflow-hidden border border-gold/20">
                      {[
                        { value: 'solar', label: T(lang, '公曆', 'Solar') },
                        { value: 'lunar', label: T(lang, '農曆', 'Lunar') },
                      ].map(opt => (
                        <button key={opt.value} type="button"
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${newMember.calendarType === opt.value ? 'bg-gold text-navy-950' : 'bg-navy-800 text-white/60 hover:text-white/80'}`}
                          onClick={() => setNewMember(f => ({ ...f, calendarType: opt.value }))}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                    <input type="date" className={inputCls} value={newMember.birthDate || ''} onChange={e => setNewMember(f => ({ ...f, birthDate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{T(lang, '時間模式', 'Time Mode')}</label>
                    <div className="flex rounded-lg overflow-hidden border border-gold/20">
                      {[
                        { value: 'fuzzy', label: T(lang, '時辰', 'Shichen') },
                        { value: 'precise', label: T(lang, '精確', 'Exact') },
                      ].map(opt => (
                        <button key={opt.value} type="button"
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${newMember.timeMode === opt.value ? 'bg-gold text-navy-950' : 'bg-navy-800 text-white/60 hover:text-white/80'}`}
                          onClick={() => setNewMember(f => ({ ...f, timeMode: opt.value }))}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{newMember.timeMode === 'precise' ? T(lang, '精確時間', 'Exact Time') : T(lang, '出生時辰', 'Birth Time')}</label>
                    {newMember.timeMode === 'precise' ? (
                      <input type="time" className={inputCls} value={newMember.exactTime || ''} onChange={e => setNewMember(f => ({ ...f, exactTime: e.target.value }))} />
                    ) : (
                      <select className={inputCls} value={newMember.birthTime || ''} onChange={e => setNewMember(f => ({ ...f, birthTime: e.target.value }))}>
                        <option value="">{T(lang, '請選擇', 'Select')}</option>
                        {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
                    <BirthplaceInput
                      value={newMember.birthPlace || ''}
                      onChange={v => setNewMember(f => ({ ...f, birthPlace: v }))}
                      onLatLngChange={(lat, lng) => setNewMember(f => ({ ...f, birthLat: lat, birthLng: lng }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
                    <select className={inputCls} value={newMember.gender || ''} onChange={e => setNewMember(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">{T(lang, '請選擇', 'Select')}</option>
                      <option value="male">{T(lang, '男', 'Male')}</option>
                      <option value="female">{T(lang, '女', 'Female')}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生環境（可選）', 'Birth Environment (optional)')}</label>
                  <input type="text" className={inputCls} value={newMember.birthEnvironment || ''} onChange={e => setNewMember(f => ({ ...f, birthEnvironment: e.target.value }))} placeholder={T(lang, '例：農村、城市、山區...', 'e.g. rural, urban, mountainous...')} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={addFamilyMember} className="px-4 py-2 bg-gold text-navy-950 rounded-lg text-sm font-semibold">{T(lang, '新增', 'Add')}</button>
                  <button type="button" onClick={() => setAddingMember(false)} className="px-4 py-2 border border-white/20 text-white/60 rounded-lg text-sm">{T(lang, '取消', 'Cancel')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== Credits Ledger Tab ========== */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          {/* Current balance */}
          {credits && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{T(lang, '當前機緣', 'Current Karma')}</span>
                <span className="text-2xl text-gold font-mono font-bold">
                  {credits.credits === 999 ? '∞' : credits.credits} ✨
                </span>
              </div>
            </div>
          )}

          {/* Ledger */}
          <div className="glass-card rounded-2xl">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <span className="text-lg">📜</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '機緣簿', 'Karma Ledger')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              {creditLogs.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">{T(lang, '暫無記錄', 'No records yet')}</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {creditLogs.map(log => {
                      const actionLabels: Record<string, { zh: string; en: string; color: string }> = {
                        deduct: { zh: '消耗', en: 'Used', color: 'text-red-400' },
                        deduct_admin: { zh: '使用(管理員)', en: 'Used(Admin)', color: 'text-orange-400' },
                        grant_daily: { zh: '每日贈送', en: 'Daily Bonus', color: 'text-green-400' },
                        grant_purchase: { zh: '購買', en: 'Purchase', color: 'text-emerald-400' },
                        grant_share: { zh: '分享獎勵', en: 'Share Reward', color: 'text-blue-400' },
                        grant_compensation: { zh: '補償', en: 'Compensation', color: 'text-purple-400' },
                        grant_gift: { zh: '禮品領取', en: 'Gift', color: 'text-pink-400' },
                        grant_admin: { zh: '管理員發放', en: 'Admin Grant', color: 'text-yellow-400' },
                      }
                      const info = actionLabels[log.action] || { zh: log.action, en: log.action, color: 'text-white/60' }
                      const sourceLabels: Record<string, { zh: string; en: string }> = {
                        'chat': { zh: '玄機問答', en: 'Chat' },
                        'master': { zh: '大師對話', en: 'Master' },
                        'daily_bonus': { zh: '每日登入', en: 'Daily Login' },
                      }
                      const divTypeLabels: Record<string, { zh: string; en: string }> = {
                        'bazi': { zh: '八字', en: 'BaZi' },
                        'ziwei': { zh: '紫微', en: 'ZiWei' },
                        'qimen': { zh: '奇門', en: 'QiMen' },
                        'meihua': { zh: '梅花', en: 'MeiHua' },
                        'iching': { zh: '易經', en: 'I Ching' },
                        'liuyao': { zh: '六爻', en: 'LiuYao' },
                        'fengshui': { zh: '風水', en: 'FengShui' },
                      }
                      let sourceText = log.source
                      if (sourceLabels[log.source]) {
                        sourceText = T(lang, sourceLabels[log.source].zh, sourceLabels[log.source].en)
                      } else if (log.source.startsWith('divination:')) {
                        const dtype = log.source.replace('divination:', '')
                        const dl = divTypeLabels[dtype]
                        sourceText = dl ? T(lang, dl.zh + '排盤', dl.en + ' Reading') : dtype
                      } else if (log.source.startsWith('gift:')) {
                        sourceText = T(lang, '禮品連結', 'Gift Link')
                      } else if (log.source.startsWith('stripe:')) {
                        sourceText = T(lang, '線上購買', 'Online Purchase')
                      } else if (log.source.startsWith('share:')) {
                        sourceText = T(lang, '分享推薦', 'Referral')
                      } else if (log.source.startsWith('compensation:')) {
                        sourceText = T(lang, '客服補償', 'Compensation')
                      }
                      return (
                        <div key={log.id} className="rounded-lg px-4 py-3 border border-gold/5 bg-navy-900/50 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${info.color}`}>{T(lang, info.zh, info.en)}</span>
                              <span className="text-white/30 text-xs">·</span>
                              <span className="text-white/50 text-xs truncate">{sourceText}</span>
                            </div>
                            <div className="text-white/25 text-xs mt-0.5">
                              {new Date(log.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {log.note && <span className="ml-2 text-white/20">({log.note})</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-mono font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {log.amount > 0 ? '+' : ''}{log.amount}
                            </span>
                            <div className="text-white/20 text-xs">{T(lang, '餘', 'bal')} {log.balance}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {creditLogPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <button disabled={creditLogPage <= 1 || creditLogLoading}
                        onClick={() => {
                          const p = creditLogPage - 1
                          setCreditLogPage(p)
                          setCreditLogLoading(true)
                          fetch(`/api/credits/history?page=${p}`).then(r => r.json()).then(data => {
                            setCreditLogs(data.logs || []); setCreditLogPages(data.pages || 1)
                          }).finally(() => setCreditLogLoading(false))
                        }}
                        className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30">
                        ←
                      </button>
                      <span className="text-white/40 text-xs py-1">{creditLogPage} / {creditLogPages}</span>
                      <button disabled={creditLogPage >= creditLogPages || creditLogLoading}
                        onClick={() => {
                          const p = creditLogPage + 1
                          setCreditLogPage(p)
                          setCreditLogLoading(true)
                          fetch(`/api/credits/history?page=${p}`).then(r => r.json()).then(data => {
                            setCreditLogs(data.logs || []); setCreditLogPages(data.pages || 1)
                          }).finally(() => setCreditLogLoading(false))
                        }}
                        className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30">
                        →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Feedback Card */}
          <div className="glass-card rounded-2xl">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <span className="text-lg">💬</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '意見回饋', 'Feedback')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              {fbSent ? (
                <div className="py-6 text-center rounded-xl" style={{ backgroundColor: 'rgba(45,212,137,0.08)', border: '1px solid rgba(45,212,137,0.2)' }}>
                  <span className="text-2xl">🙏</span>
                  <p className="text-emerald-400 text-sm mt-2">{T(lang, '感謝您的回饋！', 'Thank you for your feedback!')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-white/50">{T(lang, '整體評分', 'Overall Rating')}</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" onClick={() => setFbRating(n)}
                          className="text-2xl transition-all hover:scale-125"
                          style={{ color: n <= fbRating ? '#d4a853' : 'rgba(255,255,255,0.15)' }}
                        >★</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-white/50">{T(lang, '建議或意見', 'Comments')}</label>
                    <textarea value={fbText} onChange={e => setFbText(e.target.value)}
                      rows={3} maxLength={2000}
                      placeholder={T(lang, '分享您的使用體驗...', 'Share your experience...')}
                      className={inputCls + ' resize-none'} />
                  </div>
                  <button type="button" disabled={!fbText.trim() || fbSending}
                    onClick={async () => {
                      setFbSending(true)
                      try {
                        const res = await fetch('/api/site-feedback', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ rating: fbRating || null, feedback: fbText }),
                        })
                        if (res.ok) {
                          setFbSent(true); toast.success(T(lang, '感謝回饋！', 'Thanks!'))
                          setTimeout(() => { setFbSent(false); setFbRating(0); setFbText('') }, 3000)
                          fetch('/api/site-feedback').then(r => r.json()).then(data => setFbHistory(data.feedbacks || [])).catch(catchAndReport('/api/site-feedback'))
                        }
                      } catch { toast.error('Error') }
                      setFbSending(false)
                    }}
                    className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gold text-navy-950 hover:bg-gold-light transition-colors disabled:opacity-40">
                    {fbSending ? '...' : T(lang, '提交回饋', 'Submit')}
                  </button>
                </div>
              )}
              {fbHistory.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(212,168,83,0.1)' }}>
                  <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">{T(lang, '過往回饋', 'Past Feedback')}</h3>
                  <div className="space-y-2">
                    {fbHistory.map(fb => (
                      <div key={fb.id} className="rounded-lg px-4 py-3 border border-gold/5 bg-navy-900/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gold text-xs">{fb.rating ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : ''}</span>
                          <span className="text-white/30 text-xs">{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-white/60 text-sm">{fb.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== Account Tab ========== */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="glass-card rounded-2xl">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <span className="text-lg">🔑</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '修改密碼', 'Change Password')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">{T(lang, '留空不更改', 'Leave blank to keep current password')}</p>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{T(lang, '當前密碼', 'Current Password')}</label>
                    <input type="password" className={inputCls} value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>{T(lang, '新密碼', 'New Password')}</label>
                    <input type="password" className={inputCls} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving || (!form.currentPassword && !form.newPassword)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gold text-navy-950 hover:bg-gold-light transition-colors disabled:opacity-40"
                >
                  {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '更新密碼', 'Update Password')}
                </button>
              </form>
            </div>
          </div>

          {/* Data Management Card */}
          <div className="glass-card rounded-2xl">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <span className="text-lg">🔒</span>
              <h2 className="text-lg font-serif text-gold">{T(lang, '數據管理', 'Data Management')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-white/50 mb-4">
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
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 border border-gold/15 text-white/70"
                >
                  📥 {T(lang, '導出數據', 'Export Data')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                >
                  🗑️ {T(lang, '刪除帳號', 'Delete Account')}
                </button>
              </div>

              {deleteEmailSent && (
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(45,212,137,0.05)', border: '1px solid rgba(45,212,137,0.2)' }}>
                  <p className="text-sm text-emerald-400">
                    ✉️ {T(lang,
                      '確認郵件已發送。請點擊郵件中的連結完成帳號刪除，24 小時內有效。',
                      'Confirmation email sent. Click the link to complete deletion. Valid for 24 hours.'
                    )}
                  </p>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-sm mb-3" style={{ color: '#fca5a5' }}>
                    ⚠️ {T(lang,
                      '我們將發送確認郵件。請輸入密碼繼續。',
                      'We will send a confirmation email. Enter your password to continue.'
                    )}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder={T(lang, '請輸入密碼', 'Enter password')}
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-navy-900/50 border border-gold/10 focus:outline-none focus:border-gold/30"
                    />
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!deletePassword || deleteLoading}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      {deleteLoading ? '...' : T(lang, '確認', 'Confirm')}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword('') }}
                      className="px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors"
                    >
                      {T(lang, '取消', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
