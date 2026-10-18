'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'
import BackButton from '@/components/BackButton'
import BirthplaceInput from '@/components/BirthplaceInput'
import { catchAndReport } from '@/lib/errorReporter'
import FamilyTab from './_tabs/FamilyTab'
import GrowthTab from './_tabs/GrowthTab'
import type { FamilyMemberData } from './_components/FamilyDrawer'
import { T, formatDate } from '@/lib/i18n'
import { DivinationIcon, SunMoonIcon, FamilyIcon, MasterSageIcon, NoticeIcon, LockSealIcon, AlertIcon, CheckSealIcon } from '@/components/DivinationIcons'

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
  relationDetail: string | null
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
  { value: 'zi_early', zh: '早子時 (00:00-01:00)', en: 'Early Zi (00:00-01:00)' },
  { value: 'chou', zh: '丑時 (01:00-03:00)', en: 'Chou (01:00-03:00)' },
  { value: 'yin',  zh: '寅時 (03:00-05:00)', en: 'Yin (03:00-05:00)' },
  { value: 'mao',  zh: '卯時 (05:00-07:00)', en: 'Mao (05:00-07:00)' },
  { value: 'chen', zh: '辰時 (07:00-09:00)', en: 'Chen (07:00-09:00)' },
  { value: 'si',   zh: '巳時 (09:00-11:00)', en: 'Si (09:00-11:00)' },
  { value: 'wu',   zh: '午時 (11:00-13:00)', en: 'Wu (11:00-13:00)' },
  { value: 'wei',  zh: '未時 (13:00-15:00)', en: 'Wei (13:00-15:00)' },
  { value: 'shen', zh: '申時 (15:00-17:00)', en: 'Shen (15:00-17:00)' },
  { value: 'you',  zh: '酉時 (17:00-19:00)', en: 'You (17:00-19:00)' },
  { value: 'xu',   zh: '戌時 (19:00-21:00)', en: 'Xu (19:00-21:00)' },
  { value: 'hai',  zh: '亥時 (21:00-23:00)', en: 'Hai (21:00-23:00)' },
  { value: 'zi_late', zh: '晚子時 (23:00-00:00)', en: 'Late Zi (23:00-00:00)' },
]

type TabKey = 'personal' | 'growth' | 'family' | 'credits' | 'account'

const TABS: { key: TabKey; zh: string; en: string }[] = [
  { key: 'personal', zh: '個人資料', en: 'Personal Info' },
  { key: 'growth', zh: '術數修為', en: 'Mastery' },
  { key: 'family', zh: '家庭成員', en: 'Family Members' },
  { key: 'credits', zh: '機緣簿', en: 'Credit Ledger' },
  { key: 'account', zh: '帳號設置', en: 'Account' },
]

function TabIcon({ tabKey }: { tabKey: TabKey }) {
  if (tabKey === 'personal') {
    return (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
  if (tabKey === 'growth') {
    return (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="inline-block">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a5 5 0 0 0 0 10 5 5 0 0 1 0 10" />
        <circle cx="12" cy="7" r="1.5" fill="currentColor" />
        <circle cx="12" cy="17" r="1.5" fill="currentColor" />
      </svg>
    )
  }
  if (tabKey === 'family') {
    return (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
        <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M9 21v-2a4 4 0 0 1 3-3.87" />
        <circle cx="9" cy="7" r="4" />
        <circle cx="17" cy="11" r="3" />
      </svg>
    )
  }
  if (tabKey === 'credits') {
    return (
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const PAGE_SIZE = 5

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { lang, setLang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromQuery = searchParams?.get('tab') as TabKey | null
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabFromQuery && ['personal', 'growth', 'family', 'credits', 'account'].includes(tabFromQuery)
      ? tabFromQuery
      : 'personal'
  )

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as TabKey | null
    if (tabParam && ['personal', 'growth', 'family', 'credits', 'account'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])
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
  const [newMember, setNewMember] = useState<Partial<FamilyMember>>({ relation: '', relationDetail: '', name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '', calendarType: 'solar', timeMode: 'fuzzy', exactTime: '', birthLat: null, birthLng: null, birthEnvironment: '' })
  const [credits, setCredits] = useState<{ credits: number } | null>(null)
  const [hasPassword, setHasPassword] = useState<boolean>(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteEmailSent, setDeleteEmailSent] = useState(false)
  const [showDeleteMemoryConfirm, setShowDeleteMemoryConfirm] = useState(false)
  const [deleteMemoryLoading, setDeleteMemoryLoading] = useState(false)
  const [familySearch, setFamilySearch] = useState('')
  const [familyPage, setFamilyPage] = useState(0)
  const [creditLogs, setCreditLogs] = useState<{ id: string; action: string; amount: number; balance: number; source: string; note: string | null; createdAt: string }[]>([])
  const [creditLogPage, setCreditLogPage] = useState(1)
  const [creditLogPages, setCreditLogPages] = useState(1)
  const [creditLogLoading, setCreditLogLoading] = useState(false)
  const [userPayments, setUserPayments] = useState<{ id: string; stripeSessionId: string | null; packId: string | null; amount: number; currency: string; credits: number; status: string; note: string | null; createdAt: string }[]>([])
  const [isPaidUser, setIsPaidUser] = useState(false)
  const [paidAtDate, setPaidAtDate] = useState<string | null>(null)

  const handleDeleteAccount = useCallback(async () => {
    if (hasPassword && !deletePassword) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hasPassword ? deletePassword : undefined }),
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
  }, [hasPassword, deletePassword, lang])

  const handleDeleteMemory = useCallback(async () => {
    setDeleteMemoryLoading(true)
    try {
      const res = await fetch('/api/profile/portrait', { method: 'DELETE' })
      if (res.ok) {
        toast.success(T(lang, '大師記憶已刪除', 'Master memory deleted'))
        setShowDeleteMemoryConfirm(false)
      } else {
        toast.error(T(lang, '刪除失敗', 'Delete failed'))
      }
    } catch {
      toast.error(T(lang, '操作失敗', 'Operation failed'))
    } finally {
      setDeleteMemoryLoading(false)
    }
  }, [lang])

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
          if (typeof data.hasPassword === 'boolean') {
            setHasPassword(data.hasPassword)
          }
          if (typeof data.isPaid === 'boolean') {
            setIsPaidUser(data.isPaid)
          }
          if (data.paidAt) {
            setPaidAtDate(data.paidAt)
          }
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
      fetch('/api/user/payments').then(r => r.json()).then(data => {
        if (data.payments) setUserPayments(data.payments)
        if (typeof data.isPaid === 'boolean') setIsPaidUser(data.isPaid)
        if (data.paidAt) setPaidAtDate(data.paidAt)
      }).catch(catchAndReport('/api/user/payments'))
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
        m.relationDetail,
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
    if (newMember.relation === 'other' && !newMember.relationDetail?.trim()) {
      toast.error(T(lang, '「其他」關係必須填寫具體關係', "Please specify 'other' relationship"))
      return
    }
    const res = await fetch('/api/family-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMember) })
    if (res.ok) {
      const { member } = await res.json()
      setFamilyMembers(prev => [...prev, member])
      setNewMember({ relation: '', relationDetail: '', name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '' })
      setAddingMember(false)
      toast.success(T(lang, '已新增', 'Added'))
    } else {
      const err = await res.json().catch(() => ({ error: 'Error' }))
      toast.error(err.error || 'Error')
    }
  }

  const updateFamilyMember = async (id: string) => {
    if (editForm.relation === 'other' && !editForm.relationDetail?.trim()) {
      toast.error(T(lang, '「其他」關係必須填寫具體關係', "Please specify 'other' relationship"))
      return
    }
    const res = await fetch('/api/family-members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...editForm }) })
    if (res.ok) {
      const { member } = await res.json()
      setFamilyMembers(prev => prev.map(m => m.id === id ? member : m))
      setEditingMember(null)
      toast.success(T(lang, '已更新', 'Updated'))
    } else {
      const err = await res.json().catch(() => ({ error: 'Error' }))
      toast.error(err.error || 'Error')
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

  const inputCls = "w-full px-4 py-3 bg-surface border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 transition-colors"
  const labelCls = "block text-foreground/70 text-sm mb-1"

  if (status === 'loading') return (
    <div className="flex-1 flex items-center justify-center">
      <MysticalLoader lang={lang} variant="page" />
    </div>
  )

  return (
    <div className="flex-1 py-6 sm:py-10 px-3 sm:px-4 w-full max-w-2xl mx-auto">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <BackButton fallbackHref="/divination" label={T(lang, '返回', 'Back')} variant="pill" />
        <div className="flex items-center gap-2 text-xs text-foreground/50 font-serif">
          <Link href="/divination" className="hover:text-gold transition-colors">
            {T(lang, '占卜大廳', 'Divinations')}
          </Link>
          <span className="text-foreground/20">/</span>
          <span className="text-gold/80">{T(lang, '個人檔案', 'Profile')}</span>
        </div>
      </div>

      {/* Page Header Card */}
      <div className="oriental-sanctuary-card p-6 sm:p-8 mb-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-xl font-serif font-bold text-gold relative"
          style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.2), rgba(212,168,83,0.05))', border: '1.5px solid rgba(212,168,83,0.4)' }}>
          {session?.user?.name?.[0] || '玄'}
          {isPaidUser && (
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-full flex items-center justify-center text-xs text-navy-950 font-bold shadow-md"
              title={T(lang, '尊享結緣緣主', 'Paid Patron')}
            >
              ✦
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-serif text-gold-light">
            {T(lang, '個人命盤檔案', 'Profile')}
          </h1>
          {isPaidUser && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-serif bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 text-amber-300 border border-amber-400/30 shadow-sm">
              <span>👑</span>
              <span>{T(lang, '尊享結緣緣主', 'VIP Patron')}</span>
            </span>
          )}
        </div>
        {session?.user?.email && (
          <p className="text-foreground/40 text-xs font-serif mt-1">
            {session.user.email}
            {isPaidUser && paidAtDate && (
              <span className="text-amber-400/60 ml-2 font-mono">
                · {T(lang, '自', 'Since')} {new Date(paidAtDate).toLocaleDateString(T(lang, 'zh-TW', 'en-US'))}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-xl overflow-hidden mb-6 border border-gold/20 p-1 bg-surface/60 backdrop-blur-md">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-serif font-medium transition-all rounded-lg text-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === tab.key
                ? 'bg-gold text-navy-950 shadow-md shadow-gold/10'
                : 'text-foreground/60 hover:text-gold hover:bg-foreground/[0.03]'
            }`}
          >
            <TabIcon tabKey={tab.key} />
            <span className="block text-[10px] leading-tight sm:hidden">{T(lang, tab.zh, tab.en).split(/[\s/]/)[0]}</span>
            <span className="hidden sm:inline">{T(lang, tab.zh, tab.en)}</span>
          </button>
        ))}
      </div>

      {/* ========== Personal Info Tab ========== */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Info Card */}
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <NoticeIcon className="w-5 h-5 text-gold" />
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
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <SunMoonIcon className="w-5 h-5 text-gold" />
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
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.calendarType === opt.value ? 'bg-gold text-navy-950' : 'bg-surface text-foreground/60 hover:text-foreground/80'}`}
                        onClick={() => setForm(f => ({ ...f, calendarType: opt.value as 'solar' | 'lunar' }))}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                  <input type="date" className={inputCls} value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                  <p className="text-foreground/30 text-xs mt-1">
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
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.timeMode === opt.value ? 'bg-gold text-navy-950' : 'bg-surface text-foreground/60 hover:text-foreground/80'}`}
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
                      {shichen.map(s => <option key={s.value} value={s.value}>{T(lang, s.zh, s.en)}</option>)}
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
            {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '儲存', 'Save')}
          </button>
        </form>
      )}

      {/* ========== Divination Mastery & Growth Tab ========== */}
      {activeTab === 'growth' && (
        <GrowthTab />
      )}

      {/* ========== Family Members Tab (extracted) ========== */}
      {activeTab === 'family' && (
        <FamilyTab
          members={familyMembers as FamilyMemberData[]}
          onMembersChange={(updated) => setFamilyMembers(updated as typeof familyMembers)}
        />
      )}

      {/* Old family tab removed — now handled by FamilyTab component */}
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {false && (
        <div className="card-quiet rounded-2xl">
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
              <p className="text-foreground/40 text-sm text-center py-4">
                {familySearch
                  ? T(lang, '沒有找到匹配的成員', 'No matching members found')
                  : T(lang, '尚未新增家庭成員', 'No family members added yet')}
              </p>
            )}

            {pagedMembers.map(member => (
              <div key={member.id} className="rounded-xl p-4 border border-gold/10 bg-surface/50">
                {editingMember === member.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{T(lang, '關係', 'Relationship')}</label>
                        <select className={inputCls} value={editForm.relation || ''} onChange={e => setEditForm(f => ({ ...f, relation: e.target.value }))}>
                          {relationPresets.map(r => <option key={r.value} value={r.value}>{T(lang, `${r.zh} (${r.en})`, r.en)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{T(lang, '姓名', 'Name')}</label>
                        <input type="text" className={inputCls} value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                    </div>
                    {editForm.relation === 'other' && (
                      <div>
                        <label className={labelCls}>
                          {T(lang, '具體關係', 'Specific Relationship')}
                          <span className="text-red-400 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          className={inputCls}
                          value={editForm.relationDetail || ''}
                          onChange={e => setEditForm(f => ({ ...f, relationDetail: e.target.value }))}
                          placeholder={T(lang, '例：岳父、合作夥伴', 'e.g. father-in-law, business partner')}
                          required
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                        <div className="flex rounded-lg overflow-hidden border border-gold/20">
                          {[
                            { value: 'solar', label: T(lang, '公曆', 'Solar') },
                            { value: 'lunar', label: T(lang, '農曆', 'Lunar') },
                          ].map(opt => (
                            <button key={opt.value} type="button"
                              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editForm.calendarType === opt.value ? 'bg-gold text-navy-950' : 'bg-surface text-foreground/60 hover:text-foreground/80'}`}
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
                              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editForm.timeMode === opt.value ? 'bg-gold text-navy-950' : 'bg-surface text-foreground/60 hover:text-foreground/80'}`}
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
                            {shichen.map(s => <option key={s.value} value={s.value}>{T(lang, s.zh, s.en)}</option>)}
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
                      <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 border border-line/20 text-foreground/60 rounded-lg text-sm">{T(lang, '取消', 'Cancel')}</button>
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
                          {member.relation === 'other' && member.relationDetail
                            ? member.relationDetail
                            : (() => {
                                const rel = relationPresets.find(r => r.value === member.relation)
                                return rel ? T(lang, rel.zh, rel.en) : member.relation
                              })()}
                          {member.name ? ` — ${member.name}` : ''}
                        </p>
                        <p className="text-foreground/40 text-xs mt-0.5">
                          {[member.birthDate, member.birthTime, member.birthPlace].filter(Boolean).join(' · ') || T(lang, '未填寫生辰', 'No birth info')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingMember(member.id); setEditForm({ relation: member.relation, relationDetail: member.relationDetail || '', name: member.name || '', birthDate: member.birthDate || '', birthTime: member.birthTime || '', birthPlace: member.birthPlace || '', gender: member.gender || '', calendarType: member.calendarType || 'solar', timeMode: member.timeMode || 'fuzzy', exactTime: member.exactTime || '', birthLat: member.birthLat ?? null, birthLng: member.birthLng ?? null, birthEnvironment: member.birthEnvironment || '' }) }}
                        className="text-foreground/30 hover:text-gold text-sm transition-colors">✏️</button>
                      <button type="button" onClick={() => deleteFamilyMember(member.id)}
                        className="text-foreground/30 hover:text-red-400 text-sm transition-colors">✕</button>
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
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors border border-gold/20 text-foreground/60 hover:text-foreground disabled:opacity-30"
                >
                  ← {T(lang, '上一頁', 'Prev')}
                </button>
                <span className="text-foreground/40 text-sm">{familyPage + 1} / {totalPages}</span>
                <button
                  type="button"
                  disabled={familyPage >= totalPages - 1}
                  onClick={() => setFamilyPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors border border-gold/20 text-foreground/60 hover:text-foreground disabled:opacity-30"
                >
                  {T(lang, '下一頁', 'Next')} →
                </button>
              </div>
            )}

            {addingMember && (
              <div className="rounded-xl p-4 space-y-3 border border-gold/20 bg-surface/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{T(lang, '關係', 'Relationship')}</label>
                    <select className={inputCls} value={newMember.relation || ''} onChange={e => setNewMember(f => ({ ...f, relation: e.target.value }))}>
                      <option value="">{T(lang, '請選擇', 'Select')}</option>
                      {relationPresets.map(r => <option key={r.value} value={r.value}>{T(lang, `${r.zh} (${r.en})`, r.en)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{T(lang, '姓名（可選）', 'Name (optional)')}</label>
                    <input type="text" className={inputCls} value={newMember.name || ''} onChange={e => setNewMember(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
                {newMember.relation === 'other' && (
                  <div>
                    <label className={labelCls}>
                      {T(lang, '具體關係', 'Specific Relationship')}
                      <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={newMember.relationDetail || ''}
                      onChange={e => setNewMember(f => ({ ...f, relationDetail: e.target.value }))}
                      placeholder={T(lang, '例：岳父、合作夥伴', 'e.g. father-in-law, business partner')}
                      required
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                    <div className="flex rounded-lg overflow-hidden border border-gold/20">
                      {[
                        { value: 'solar', label: T(lang, '公曆', 'Solar') },
                        { value: 'lunar', label: T(lang, '農曆', 'Lunar') },
                      ].map(opt => (
                        <button key={opt.value} type="button"
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${newMember.calendarType === opt.value ? 'bg-gold text-navy-950' : 'bg-surface text-foreground/60 hover:text-foreground/80'}`}
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
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${newMember.timeMode === opt.value ? 'bg-gold text-navy-950' : 'bg-surface text-foreground/60 hover:text-foreground/80'}`}
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
                        {shichen.map(s => <option key={s.value} value={s.value}>{T(lang, s.zh, s.en)}</option>)}
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
                  <button type="button" onClick={() => setAddingMember(false)} className="px-4 py-2 border border-line/20 text-foreground/60 rounded-lg text-sm">{T(lang, '取消', 'Cancel')}</button>
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
            <div className="card-quiet rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-foreground/60">{T(lang, '當前機緣', 'Current Karma')}</div>
                  {isPaidUser && (
                    <div className="text-xs text-amber-300 font-serif mt-1 flex items-center gap-1.5">
                      <span>👑</span>
                      <span>{T(lang, '尊享結緣緣主', 'VIP Patron')}</span>
                      {paidAtDate && (
                        <span className="text-foreground/40 font-mono text-[11px]">
                          ({new Date(paidAtDate).toLocaleDateString(T(lang, 'zh-TW', 'en-US'))})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl text-gold font-mono font-bold">
                    {credits.credits === 999 ? '∞' : credits.credits}
                  </span>
                  <Link
                    href="/subscribe"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-serif bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 transition-colors"
                  >
                    {T(lang, '結緣充值', 'Karma Shop')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Real Payment Orders Section */}
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">💳</span>
                <h2 className="text-lg font-serif text-gold">{T(lang, '結緣訂單記錄', 'Payment Orders')}</h2>
              </div>
              {isPaidUser && userPayments.length > 0 && (
                <span className="text-xs text-amber-300/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {T(lang, '累計結緣', 'Total Paid')}: ${(userPayments.reduce((acc, p) => acc + (p.status === 'completed' ? p.amount : 0), 0) / 100).toFixed(2)} USD
                </span>
              )}
            </div>
            <div className="p-4 sm:p-6">
              {userPayments.length === 0 ? (
                <div className="text-center py-6 text-foreground/40 text-sm">
                  <p>{T(lang, '尚無結緣訂單記錄', 'No payment orders yet')}</p>
                  <Link
                    href="/subscribe"
                    className="inline-block mt-3 px-4 py-1.5 rounded-lg text-xs font-serif bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors"
                  >
                    {T(lang, '前往結緣獲取機緣', 'Karma Shop')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {userPayments.map(order => (
                    <div key={order.id} className="rounded-lg px-4 py-3 border border-gold/10 bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-amber-300">
                            ${(order.amount / 100).toFixed(2)} {order.currency.toUpperCase()}
                          </span>
                          <span className="text-foreground/30 text-xs">·</span>
                          <span className="text-xs text-green-400 font-mono">+{order.credits} Karma</span>
                          <span className="text-foreground/30 text-xs">·</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}>
                            {order.status === 'completed' ? T(lang, '已結緣', 'Completed') : order.status}
                          </span>
                        </div>
                        <div className="text-foreground/30 text-[11px] font-mono mt-1">
                          {order.stripeSessionId ? `No: ${order.stripeSessionId.replace('cs_test_', '').replace('cs_live_', '').slice(0, 16)}...` : `ID: ${order.id}`}
                          <span className="mx-1.5">·</span>
                          {new Date(order.createdAt).toLocaleString(T(lang, 'zh-TW', 'en-US'), {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-serif text-gold/80 px-2 py-0.5 rounded bg-gold/10 border border-gold/20 font-mono">
                          {order.packId || 'pack'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ledger */}
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <DivinationIcon type="other" className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-serif text-gold">{T(lang, '機緣簿', 'Karma Ledger')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              {creditLogs.length === 0 ? (
                <p className="text-foreground/40 text-sm text-center py-4">{T(lang, '暫無記錄', 'No records yet')}</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {creditLogs.map(log => {
                      const actionLabels: Record<string, { zh: string; en: string; color: string }> = {
                        deduct: { zh: '消耗', en: 'Used', color: 'text-red-400' },
                        deduct_admin: { zh: '使用(管理員)', en: 'Used(Admin)', color: 'text-orange-400' },
                        grant_daily: { zh: '每日贈送', en: 'Daily Bonus', color: 'text-green-400' },
                        grant_admin: { zh: '管理員贈送', en: 'Admin Bonus', color: 'text-green-400' },
                        grant_system: { zh: '系統贈送', en: 'System Bonus', color: 'text-green-400' },
                        purchase: { zh: '購買', en: 'Purchased', color: 'text-green-400' },
                        gift_redeem: { zh: '兌換禮品碼', en: 'Gift Code', color: 'text-green-400' },
                      }
                      const info = actionLabels[log.action] || { zh: log.action, en: log.action, color: 'text-foreground/60' }
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
                        <div key={log.id} className="rounded-lg px-4 py-3 border border-gold/5 bg-surface/50 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${info.color}`}>{T(lang, info.zh, info.en)}</span>
                              <span className="text-foreground/30 text-xs">·</span>
                              <span className="text-foreground/50 text-xs truncate">{sourceText}</span>
                            </div>
                            <div className="text-foreground/25 text-xs mt-0.5">
                              {new Date(log.createdAt).toLocaleString(T(lang, 'zh-TW', 'en-US'), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {log.note && <span className="ml-2 text-foreground/20">({log.note})</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-mono font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {log.amount > 0 ? '+' : ''}{log.amount}
                            </span>
                            <div className="text-foreground/20 text-xs">{T(lang, '餘', 'bal')} {log.balance}</div>
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
                        className="px-3 py-1 rounded-lg text-xs bg-foreground/5 border border-line/10 text-foreground/60 hover:text-foreground disabled:opacity-30">
                        ←
                      </button>
                      <span className="text-foreground/40 text-xs py-1">{creditLogPage} / {creditLogPages}</span>
                      <button disabled={creditLogPage >= creditLogPages || creditLogLoading}
                        onClick={() => {
                          const p = creditLogPage + 1
                          setCreditLogPage(p)
                          setCreditLogLoading(true)
                          fetch(`/api/credits/history?page=${p}`).then(r => r.json()).then(data => {
                            setCreditLogs(data.logs || []); setCreditLogPages(data.pages || 1)
                          }).finally(() => setCreditLogLoading(false))
                        }}
                        className="px-3 py-1 rounded-lg text-xs bg-foreground/5 border border-line/10 text-foreground/60 hover:text-foreground disabled:opacity-30">
                        →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Feedback Card */}
          <div className="card-quiet rounded-2xl">
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
                    <label className="block text-sm mb-2 text-foreground/50">{T(lang, '整體評分', 'Overall Rating')}</label>
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
                    <label className="block text-sm mb-1 text-foreground/50">{T(lang, '建議或意見', 'Comments')}</label>
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
                      } catch { toast.error(T(lang, '提交失敗', 'Submission failed')) }
                      setFbSending(false)
                    }}
                    className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gold text-navy-950 hover:bg-gold-light transition-colors disabled:opacity-40">
                    {fbSending ? '...' : T(lang, '提交回饋', 'Submit')}
                  </button>
                </div>
              )}
              {fbHistory.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(212,168,83,0.1)' }}>
                  <h3 className="text-xs uppercase tracking-wider text-foreground/40 mb-3">{T(lang, '過往回饋', 'Past Feedback')}</h3>
                  <div className="space-y-2">
                    {fbHistory.map(fb => (
                      <div key={fb.id} className="rounded-lg px-4 py-3 border border-gold/5 bg-surface/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gold text-xs">{fb.rating ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : ''}</span>
                          <span className="text-foreground/30 text-xs">{formatDate(fb.createdAt, lang)}</span>
                        </div>
                        <p className="text-foreground/60 text-sm">{fb.feedback}</p>
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
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <LockSealIcon className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-serif text-gold">{T(lang, '修改密碼', 'Change Password')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-foreground/40 text-xs uppercase tracking-wider mb-3">{T(lang, '留空不更改', 'Leave blank to keep current password')}</p>
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
                  className="px-5 py-2.5 min-h-[44px] rounded-xl font-medium text-sm bg-gold text-navy-950 hover:bg-gold-light transition-colors disabled:opacity-40 font-serif"
                >
                  {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '更新密碼', 'Update Password')}
                </button>
              </form>
            </div>
          </div>

          {/* Master Memory Card */}
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <MasterSageIcon className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-serif text-gold">{T(lang, '大師記憶', 'Master Memory')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-foreground/50 mb-4 leading-relaxed">
                {T(lang,
                  '玄機大師在對話中記下的主題與偏好。您可前往記憶設定頁面查看、編輯或暫停，也可在此永久刪除。刪除後不影響您的占卜歷史與個人檔案。',
                  "Topics and preferences Master Xuanji has noted from your conversations. You can view, edit, or pause them on the memory settings page, or permanently delete them here. Deletion does not affect your reading history or profile."
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/profile/portrait"
                  className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-lg text-sm font-medium transition-colors hover:bg-foreground/5 border border-gold/20 text-foreground/80 font-serif"
                >
                  {T(lang, '記憶設定', 'Memory Settings')}
                </a>
                <button
                  onClick={() => setShowDeleteMemoryConfirm(true)}
                  className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 border border-red-500/30 text-red-400 font-serif"
                >
                  {T(lang, '刪除所有記憶', 'Delete All Memory')}
                </button>
              </div>

              {showDeleteMemoryConfirm && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm mb-3 text-red-300 flex items-center gap-1.5">
                    <AlertIcon size={16} className="text-red-400 flex-shrink-0" />
                    <span>{T(lang,
                      '這將永久刪除大師對您的所有記憶與歷史版本。無法復原。',
                      'This will permanently delete all memory the Master has of you, including all history versions. Cannot be undone.'
                    )}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteMemory}
                      disabled={deleteMemoryLoading}
                      className="px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium text-foreground disabled:opacity-40 transition-colors bg-red-600 hover:bg-red-700"
                    >
                      {deleteMemoryLoading ? '...' : T(lang, '確認刪除', 'Confirm delete')}
                    </button>
                    <button
                      onClick={() => setShowDeleteMemoryConfirm(false)}
                      className="px-3 py-2 min-h-[40px] rounded-lg text-sm text-foreground/60 hover:text-foreground transition-colors"
                    >
                      {T(lang, '取消', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Data Management Card */}
          <div className="oriental-sanctuary-card rounded-2xl border border-gold/20">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
              <LockSealIcon className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-serif text-gold">{T(lang, '數據管理', 'Data Management')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-foreground/50 mb-4 leading-relaxed">
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
                  className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors hover:bg-foreground/5 border border-gold/20 text-foreground/80 font-serif"
                >
                  {T(lang, '導出數據', 'Export Data')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 border border-red-500/30 text-red-400 font-serif"
                >
                  {T(lang, '刪除帳號', 'Delete Account')}
                </button>
              </div>

              {deleteEmailSent && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                    <CheckSealIcon size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>{T(lang,
                      '確認郵件已發送。請點擊郵件中的連結完成帳號刪除，24 小時內有效。',
                      'Confirmation email sent. Click the link to complete deletion. Valid for 24 hours.'
                    )}</span>
                  </p>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm mb-3 text-red-300 flex items-center gap-1.5">
                    <AlertIcon size={16} className="text-red-400 flex-shrink-0" />
                    <span>{hasPassword
                      ? T(lang, '我們將發送確認郵件。請輸入密碼繼續。', 'We will send a confirmation email. Enter your password to continue.')
                      : T(lang, '您使用的是第三方快捷登入，點擊確認將向您的郵箱發送確認郵件以完成帳號刪除。', 'You signed in via OAuth. Click confirm to send a deletion confirmation link to your email.')
                    }</span>
                  </p>
                  <div className="flex gap-2">
                    {hasPassword && (
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder={T(lang, '請輸入密碼', 'Enter password')}
                        className="flex-1 px-3 py-2 min-h-[40px] rounded-lg text-sm text-foreground bg-surface/60 border border-gold/20 focus:outline-none focus:border-gold/40"
                      />
                    )}
                    <button
                      onClick={handleDeleteAccount}
                      disabled={(hasPassword && !deletePassword) || deleteLoading}
                      className="px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium text-foreground disabled:opacity-40 transition-colors bg-red-600 hover:bg-red-700 font-serif"
                    >
                      {deleteLoading ? '...' : (hasPassword ? T(lang, '確認', 'Confirm') : T(lang, '發送確認郵件', 'Send Email'))}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword('') }}
                      className="px-3 py-2 min-h-[40px] rounded-lg text-sm text-foreground/60 hover:text-foreground transition-colors font-serif"
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
