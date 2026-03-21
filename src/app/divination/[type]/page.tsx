'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import LoadingOracle from '@/components/LoadingOracle'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import BirthplaceInput from '@/components/BirthplaceInput'
import YinYangIcon from '@/components/YinYangIcon'
import { reportError } from '@/lib/errorReporter'

const shichen = [
  { value: 'zi', zh: '子時 (23:00-01:00)', en: 'Zi (23:00-01:00)' },
  { value: 'chou', zh: '丑時 (01:00-03:00)', en: 'Chou (01:00-03:00)' },
  { value: 'yin', zh: '寅時 (03:00-05:00)', en: 'Yin (03:00-05:00)' },
  { value: 'mao', zh: '卯時 (05:00-07:00)', en: 'Mao (05:00-07:00)' },
  { value: 'chen', zh: '辰時 (07:00-09:00)', en: 'Chen (07:00-09:00)' },
  { value: 'si', zh: '巳時 (09:00-11:00)', en: 'Si (09:00-11:00)' },
  { value: 'wu', zh: '午時 (11:00-13:00)', en: 'Wu (11:00-13:00)' },
  { value: 'wei', zh: '未時 (13:00-15:00)', en: 'Wei (13:00-15:00)' },
  { value: 'shen', zh: '申時 (15:00-17:00)', en: 'Shen (15:00-17:00)' },
  { value: 'you', zh: '酉時 (17:00-19:00)', en: 'You (17:00-19:00)' },
  { value: 'xu', zh: '戌時 (19:00-21:00)', en: 'Xu (19:00-21:00)' },
  { value: 'hai', zh: '亥時 (21:00-23:00)', en: 'Hai (21:00-23:00)' },
]

const directions8 = ['坎/North', '艮/NE', '震/East', '巽/SE', '离/South', '坤/SW', '兑/West', '乾/NW']

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

const typeInfo: Record<string, { zhName: string; twName: string; enName: string; symbol: string }> = {
  bazi: { zhName: '八字命理', twName: '八字命理', enName: 'BaZi Analysis', symbol: '☰' },
  iching: { zhName: '易经占卜', twName: '易經占卜', enName: 'I Ching Oracle', symbol: '☯' },
  ziwei: { zhName: '紫微斗数', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', symbol: '⭐' },
  qimen: { zhName: '奇门遁甲', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', symbol: '⚡' },
  fengshui: { zhName: '风水布局', twName: '風水佈局', enName: 'Feng Shui Analysis', symbol: '🏯' },
  other: { zhName: '梅花六壬', twName: '梅花六壬', enName: 'Plum Blossom & Liu Ren', symbol: '🌸' },
}

// Helper for bilingual text
const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

export default function DivinationFormPage() {
  const { type } = useParams<{ type: string }>()
  const { data: session } = useSession()
  const { lang } = useLang()
  const router = useRouter()

  const [form, setForm] = useState<Record<string, string>>({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: '',
    question: '',
    hexagram: '',
    direction: '',
    yearBuilt: '',
    ownerInfo: '',
    readingDateTime: new Date().toISOString().slice(0, 16),
    subType: 'meihua',
    lunarToggle: 'solar',
    birthEnvironment: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [readingId, setReadingId] = useState<string | null>(null)
  const [saveProfile, setSaveProfile] = useState(true)
  const [saveHistory, setSaveHistory] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const selfProfileRef = useRef<{ birthDate: string; birthTime: string; birthPlace: string; gender: string } | null>(null)
  const [modelTier, setModelTier] = useState('model2')
  const [credits, setCredits] = useState<Record<string, {remaining: number, dailyLimit: number}> | null>(null)
  const [llmTimeoutMs, setLlmTimeoutMs] = useState(240000)
  const [shareBonus, setShareBonus] = useState<{model1: number, model2: number} | null>(null)
  const [targetType, setTargetType] = useState<'self' | 'family'>('self')
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [newMemberRelation, setNewMemberRelation] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [birthLat, setBirthLat] = useState<number | null>(null)
  const [birthLng, setBirthLng] = useState<number | null>(null)
  const [isSouthernHemisphere, setIsSouthernHemisphere] = useState(false)
  const [tierChecked, setTierChecked] = useState(false)

  const info = typeInfo[type] || { zhName: '占卜', enName: 'Divination', symbol: '☯' }

  // Premium tier check
  useEffect(() => {
    const checkTier = async () => {
      try {
        const [tiersRes, profileRes] = await Promise.all([
          fetch('/api/divination-tiers'),
          session ? fetch('/api/profile') : Promise.resolve(null),
        ])
        const tiers = await tiersRes.json()
        const profile = profileRes ? await profileRes.json() : null
        const userRole = profile?.role || 'arcane'
        const isAdmin = profile?.isAdmin || false
        const roleLevel: Record<string, number> = { admin: 3, prestige: 3, ethereal: 2, arcane: 1 }
        const tierLevel: Record<string, number> = { prestige: 3, ethereal: 2, arcane: 1 }
        const userLvl = roleLevel[userRole] || 1
        const requiredLvl = tierLevel[tiers[type]] || 1

        if (!isAdmin && userLvl < requiredLvl) {
          const tierNames: Record<string, string> = { prestige: T(lang, '大師', 'Prestige'), ethereal: T(lang, '洞察', 'Ethereal') }
          toast.error(T(lang, `此功能需要${tierNames[tiers[type]] || '更高'}等級權限`, `This feature requires ${tiers[type] || 'higher'} access`), { icon: '✦' })
          router.push('/divination')
          return
        }
      } catch { /* ignore */ }
      setTierChecked(true)
    }
    checkTier()
  }, [type, session, lang, router])

  // Auto-fill from saved profile (bazi & ziwei only)
  useEffect(() => {
    if (!session || profileLoaded) return
    if (!['bazi', 'ziwei'].includes(type)) return
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setForm(f => ({
          ...f,
          birthDate:  data.birthDate  || f.birthDate,
          birthTime:  data.birthTime  || f.birthTime,
          birthPlace: data.birthPlace || f.birthPlace,
          gender:     data.gender     || f.gender,
        }))
        selfProfileRef.current = {
          birthDate: data.birthDate || '',
          birthTime: data.birthTime || '',
          birthPlace: data.birthPlace || '',
          gender: data.gender || '',
        }
        setProfileLoaded(true)
        if (data.birthDate || data.birthTime) {
          toast.success(T(lang, '已從檔案自動填充生辰資訊', 'Profile info auto-filled'), { icon: '📋' })
        }
      })
      .catch(() => {})
  }, [session, type, profileLoaded, lang])

  // Fetch credits
  useEffect(() => {
    if (!session) return
    fetch('/api/credits').then(r => r.json()).then(data => {
      setCredits(data)
      if (data.llmTimeoutSeconds) setLlmTimeoutMs(data.llmTimeoutSeconds * 1000)
      // Auto-fallback: if model2 has no remaining credits, switch to model1
      const m2 = data?.model2
      if (m2 && m2.remaining !== -1 && m2.remaining <= 0) {
        setModelTier('model1')
      }
    }).catch(() => {})
    // Fetch share bonus info
    fetch('/api/share/bonus').then(r => r.json()).then(setShareBonus).catch(() => {})
  }, [session])

  // Fetch family members
  useEffect(() => {
    if (!session) return
    fetch('/api/family-members').then(r => r.json()).then(data => {
      setFamilyMembers(data.members || [])
    }).catch(() => {})
  }, [session])

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId)
    if (memberId && memberId !== '__new__') {
      const member = familyMembers.find(m => m.id === memberId)
      if (member) {
        setForm(f => ({
          ...f,
          birthDate: member.birthDate || f.birthDate,
          birthTime: member.birthTime || f.birthTime,
          birthPlace: member.birthPlace || f.birthPlace,
          gender: member.gender || f.gender,
        }))
      }
    }
  }

  const castHexagram = () => {
    const n = Math.floor(Math.random() * 64) + 1
    setField('hexagram', String(n))
    toast.success(T(lang, `得卦：第${n}卦`, `Hexagram #${n}`))
  }

  // Poll for a reading that was saved server-side after connection was lost
  const pollForReading = async (afterTime: string, readingType: string): Promise<{ id: string; result: string } | null> => {
    const maxPollTime = 600_000 // 600 seconds
    const pollInterval = 8_000 // 8 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxPollTime) {
      await new Promise(r => setTimeout(r, pollInterval))
      try {
        const res = await fetch('/api/readings')
        if (!res.ok) continue
        const data = await res.json()
        const found = data.readings?.find((r: { type: string; createdAt: string; id: string; result: string }) =>
          r.type === readingType && new Date(r.createdAt) > new Date(afterTime)
        )
        if (found) return { id: found.id, result: found.result }
      } catch { /* continue polling */ }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      toast.error(T(lang, '請先登入', 'Please sign in first'))
      router.push('/login')
      return
    }
    if (isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)) {
      toast.error(T(lang, '暫不支持南半球出生地', 'Southern hemisphere not yet supported'))
      return
    }
    setLoading(true)
    setResult(null)
    setShareUrl(null)
    const requestStartTime = new Date().toISOString()
    try {
      const hasProfileData = ['bazi', 'ziwei'].includes(type)
      const formData = { ...form }
      if (birthLat !== null) (formData as Record<string, unknown>).birthLat = birthLat
      if (birthLng !== null) (formData as Record<string, unknown>).birthLng = birthLng

      const fetchController = new AbortController()
      const fetchTimeout = setTimeout(() => fetchController.abort(), llmTimeoutMs + 10000)
      const res = await fetch('/api/divination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          inputData: formData,
          language: lang,
          question: form.question,
          saveProfile: hasProfileData ? saveProfile : false,
          saveHistory,
          modelTier,
          targetType,
          familyMemberId: targetType === 'family' && selectedMemberId && selectedMemberId !== '__new__' ? selectedMemberId : undefined,
          newFamilyMember: targetType === 'family' && selectedMemberId === '__new__' ? { relation: newMemberRelation, name: newMemberName || undefined } : undefined,
        }),
        signal: fetchController.signal,
      })
      clearTimeout(fetchTimeout)
      let data
      try {
        data = await res.json()
      } catch {
        // Response is not JSON (e.g. Cloudflare 524 HTML) — fall back to polling
        toast(T(lang, '⏳ 伺服器仍在處理中，等待結果...', '⏳ Server still processing, waiting for result...'), { icon: '🔄', duration: 5000 })
        const found = await pollForReading(requestStartTime, type)
        if (found) {
          setResult(found.result)
          setResultType(type)
          setReadingId(found.id)
          toast.success(T(lang, '結果已就緒', 'Result ready!'))
          fetch('/api/credits').then(r => r.json()).then(setCredits).catch(() => {})
        } else {
          toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
          reportError({ endpoint: '/api/divination', status: res.status, error: 'Polling timeout after 600s — no result found', context: `type=${type}, modelTier=${modelTier}` })
        }
        setLoading(false)
        return
      }
      if (res.ok) {
        setResult(data.reading.result)
        setResultType(type)
        setReadingId(data.reading.id || null)
        if (data.cached) {
          toast.success(T(lang, '已使用之前的八字分析結果', 'Using cached BaZi analysis'), { icon: '📦' })
        }
        // Refresh credits
        fetch('/api/credits').then(r => r.json()).then(setCredits).catch(() => {})
      } else {
        toast.error(data.error || 'Error')
        reportError({ endpoint: '/api/divination', status: res.status, error: data.error || 'Unknown error', context: `type=${type}, modelTier=${modelTier}` })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      // Network error or abort — try polling as fallback
      toast(T(lang, '⏳ 連接中斷，等待伺服器處理結果...', '⏳ Connection lost, waiting for server result...'), { icon: '🔄', duration: 5000 })
      const found = await pollForReading(requestStartTime, type)
      if (found) {
        setResult(found.result)
        setResultType(type)
        setReadingId(found.id)
        toast.success(T(lang, '結果已就緒', 'Result ready!'))
        fetch('/api/credits').then(r => r.json()).then(setCredits).catch(() => {})
      } else {
        toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
        reportError({ endpoint: '/api/divination', error: `Polling timeout after 600s — original error: ${msg}`, context: `type=${type}, modelTier=${modelTier}` })
      }
    }
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
  const labelCls = "block text-white/70 text-sm mb-1"

  if (!tierChecked) return null

  return (
    <div className="min-h-screen py-12 px-4 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="text-5xl mb-3">{type === 'iching' ? <YinYangIcon size={48} /> : info.symbol}</div>
        <h1 className="text-3xl font-serif text-gold">{lang === 'en' ? info.enName : info.twName}</h1>
      </motion.div>

      {!result && !loading && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-4 sm:p-8 space-y-4 sm:space-y-5"
        >
          {/* Target Person Selection */}
          {session && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                {T(lang, '👤 預測對象', '👤 Reading For')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('self')
                    setSelectedMemberId('')
                    if (selfProfileRef.current) {
                      setForm(f => ({ ...f, ...selfProfileRef.current! }))
                    }
                  }}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    targetType === 'self'
                      ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-white/80 text-sm font-medium">
                    {T(lang, '為自己預測', 'For Myself')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('family')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    targetType === 'family'
                      ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-white/80 text-sm font-medium">
                    {T(lang, '為他人預測', 'For Someone Else')}
                  </span>
                </button>
              </div>

              {targetType === 'family' && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className={labelCls}>{T(lang, '選擇家庭成員', 'Select Family Member')}</label>
                    <select
                      className={inputCls}
                      value={selectedMemberId}
                      onChange={e => handleMemberSelect(e.target.value)}
                      required
                    >
                      <option value="">{T(lang, '請選擇', 'Select')}</option>
                      {familyMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {relationPresets.find(r => r.value === m.relation)?.[lang === 'en' ? 'en' : 'zh'] || m.relation}
                          {m.name ? ` - ${m.name}` : ''}
                        </option>
                      ))}
                      <option value="__new__">{T(lang, '➕ 新增家庭成員', '➕ Add New Member')}</option>
                    </select>
                  </div>

                  {selectedMemberId === '__new__' && (
                    <div className="space-y-3 border-t border-gold/10 pt-3">
                      <div>
                        <label className={labelCls}>{T(lang, '關係', 'Relationship')}</label>
                        <select
                          className={inputCls}
                          value={newMemberRelation}
                          onChange={e => setNewMemberRelation(e.target.value)}
                          required
                        >
                          <option value="">{T(lang, '請選擇', 'Select')}</option>
                          {relationPresets.map(r => (
                            <option key={r.value} value={r.value}>
                              {lang === 'en' ? r.en : `${r.zh} (${r.en})`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{T(lang, '姓名（可選）', 'Name (optional)')}</label>
                        <input
                          type="text"
                          className={inputCls}
                          value={newMemberName}
                          onChange={e => setNewMemberName(e.target.value)}
                          placeholder={T(lang, '例：張某', 'e.g. John')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BaZi */}
          {type === 'bazi' && <>
            <div>
              <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
              <select className={inputCls} value={form.lunarToggle} onChange={e => setField('lunarToggle', e.target.value)}>
                <option value="solar">{T(lang, '公曆（陽曆）', 'Solar Calendar')}</option>
                <option value="lunar">{T(lang, '農曆（陰曆）', 'Lunar Calendar')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
              <input type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生時辰', 'Birth Hour')}</label>
              <select className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
              <BirthplaceInput
                value={form.birthPlace}
                onChange={v => setField('birthPlace', v)}
                onLatLngChange={(lat, lng) => { setBirthLat(lat); setBirthLng(lng) }}
                onSouthernHemisphere={setIsSouthernHemisphere}
                className={inputCls}
                placeholder={T(lang, '輸入城市名稱搜尋...', 'Search city name...')}
              />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
              <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                <option value="male">{T(lang, '男', 'Male')}</option>
                <option value="female">{T(lang, '女', 'Female')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生地環境（可選）', 'Birth Environment (optional)')}</label>
              <input
                type="text"
                className={inputCls}
                value={form.birthEnvironment}
                onChange={e => setField('birthEnvironment', e.target.value)}
                placeholder={T(lang, '例：農村、城市、山區...', 'e.g. rural, urban, mountainous...')}
              />
            </div>
          </>}

          {/* I Ching */}
          {type === 'iching' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '請詳述您想詢問的事情...', 'Describe your question in detail...')} />
            </div>
            <div className="text-center">
              <button type="button" onClick={castHexagram} className="px-6 py-3 border border-gold/50 text-gold rounded-xl hover:border-gold hover:bg-gold/10 transition-all">
                {T(lang, '🎲 起卦', '🎲 Cast Hexagram')}
              </button>
              {form.hexagram && <p className="text-gold mt-3 text-xl font-serif">
                {T(lang, `第 ${form.hexagram} 卦`, `Hexagram #${form.hexagram}`)}
              </p>}
            </div>
          </>}

          {/* Zi Wei */}
          {type === 'ziwei' && <>
            <div>
              <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
              <select className={inputCls} value={form.lunarToggle} onChange={e => setField('lunarToggle', e.target.value)}>
                <option value="solar">{T(lang, '公曆', 'Solar')}</option>
                <option value="lunar">{T(lang, '農曆', 'Lunar')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
              <input type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生時辰', 'Birth Hour')}</label>
              <select className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
              <BirthplaceInput
                value={form.birthPlace}
                onChange={v => setField('birthPlace', v)}
                onLatLngChange={(lat, lng) => { setBirthLat(lat); setBirthLng(lng) }}
                onSouthernHemisphere={setIsSouthernHemisphere}
                className={inputCls}
                placeholder={T(lang, '輸入城市名稱搜尋...', 'Search city name...')}
              />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
              <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                <option value="male">{T(lang, '男', 'Male')}</option>
                <option value="female">{T(lang, '女', 'Female')}</option>
              </select>
            </div>
          </>}

          {/* Qi Men */}
          {type === 'qimen' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想詢問的事項...', 'Describe your situation...')} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '起盤時間', 'Reading Date/Time')}</label>
              <input type="datetime-local" className={inputCls} value={form.readingDateTime} onChange={e => setField('readingDateTime', e.target.value)} />
            </div>
          </>}

          {/* Feng Shui */}
          {type === 'fengshui' && <>
            <div>
              <label className={labelCls}>{T(lang, '房屋朝向', 'House Facing Direction')}</label>
              <select className={inputCls} value={form.direction} onChange={e => setField('direction', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {directions8.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '建造年份', 'Year Built')}</label>
              <input type="number" className={inputCls} value={form.yearBuilt} onChange={e => setField('yearBuilt', e.target.value)} placeholder="e.g. 2005" />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '屋主簡介', 'Owner Info')}</label>
              <textarea className={inputCls + ' h-20 resize-none'} value={form.ownerInfo} onChange={e => setField('ownerInfo', e.target.value)} placeholder={T(lang, '性別、出生年份、主要居住者情況等', 'Gender, birth year, who lives there...')} />
            </div>
          </>}

          {/* Other */}
          {type === 'other' && <>
            <div>
              <label className={labelCls}>{T(lang, '占卜類型', 'Sub-type')}</label>
              <select className={inputCls} value={form.subType} onChange={e => setField('subType', e.target.value)}>
                <option value="meihua">{T(lang, '梅花易數', 'Mei Hua Yi Shu')}</option>
                <option value="liuren">{T(lang, '六壬神課', 'Liu Ren')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想預測的事項...', 'Describe what you want to predict...')} />
            </div>
          </>}

          {/* Common optional question for non-question-first types */}
          {(type === 'bazi' || type === 'ziwei') && (
            <div>
              <label className={labelCls}>{T(lang, '想了解的方面（可選）', 'Focus Area (optional)')}</label>
              <input type="text" className={inputCls} value={form.question} onChange={e => setField('question', e.target.value)} placeholder={T(lang, '例：事業運、婚姻、財運...', 'e.g. career, marriage, wealth...')} />
            </div>
          )}

          {/* Model Selection */}
          {session && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                {T(lang, '🤖 選擇模型', '🤖 Select Model')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { tier: 'model1', zhLabel: '標準模型', enLabel: 'Standard', icon: '⚡' },
                  { tier: 'model2', zhLabel: '高級模型', enLabel: 'Premium', icon: '🌟' },
                ].map(m => (
                  <button
                    key={m.tier}
                    type="button"
                    onClick={() => setModelTier(m.tier)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      modelTier === m.tier
                        ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{m.icon}</span>
                      <span className="text-white/80 text-sm font-medium">
                        {lang === 'en' ? m.enLabel : m.zhLabel}
                      </span>
                    </div>
                    {credits && credits[m.tier] && (
                      <p className="text-white/40 text-xs">
                        {(() => {
                          const c = credits[m.tier]
                          const rem = c.remaining === -1 ? '∞' : c.remaining
                          const lim = c.dailyLimit === -1 ? '∞' : c.dailyLimit
                          return lang === 'en'
                            ? `${rem} / ${lim} remaining today`
                            : `今日配額剩餘 ${rem} / ${lim} 次`
                        })()}
                      </p>
                    )}
                  </button>
                ))}
              </div>
              {/* Share prompt when premium credits depleted */}
              {credits?.model2 && credits.model2.remaining !== -1 && credits.model2.remaining <= 0 && shareBonus && (
                <div className="mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border-gold)' }}>
                  <span>🔗</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {T(lang, '高級模型次數已用完，', 'Premium credits used up. ')}
                    <a href="/divination" onClick={async (e) => {
                      e.preventDefault()
                      const res = await fetch('/api/share', { method: 'POST' })
                      const data = await res.json()
                      if (res.ok) window.location.href = `/share/${data.code}`
                    }} className="underline" style={{ color: 'var(--gold)' }}>
                      {T(lang,
                        `分享可獲得儲備額度 ⚡×${shareBonus.model1}${shareBonus.model2 > 0 ? ` + 🌟×${shareBonus.model2}` : ''}`,
                        `Share for reserve credits ⚡×${shareBonus.model1}${shareBonus.model2 > 0 ? ` + 🌟×${shareBonus.model2}` : ''}`
                      )}
                    </a>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Privacy Controls */}
          {session && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                {T(lang, '🔒 隱私設置', '🔒 Privacy Settings')}
              </p>

              {/* Save to History */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={saveHistory}
                    onChange={e => setSaveHistory(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      saveHistory ? 'bg-gold border-gold' : 'bg-transparent border-white/30 group-hover:border-gold/50'
                    }`}
                  >
                    {saveHistory && <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium leading-tight">
                    {T(lang, '儲存到歷史記錄', 'Save to reading history')}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {T(lang, '允許儲存本次解卦結果，可在「歷史」中查看', 'Store this reading in your history for future reference')}
                  </p>
                </div>
              </label>

              {/* Save profile info — only for types with personal birth data */}
              {['bazi', 'ziwei'].includes(type) && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={saveProfile}
                      onChange={e => setSaveProfile(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        saveProfile ? 'bg-gold border-gold' : 'bg-transparent border-white/30 group-hover:border-gold/50'
                      }`}
                    >
                      {saveProfile && <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium leading-tight">
                      {T(lang, '儲存生辰資訊到我的資料', 'Save birth info to my profile')}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {T(lang, '將出生日期、時辰、出生地、性別儲存至個人資料，下次自動填充', 'Store birth date, hour, place & gender in your profile for auto-fill next time')}
                    </p>
                  </div>
                </label>
              )}

              {(!saveHistory && !saveProfile) && (
                <p className="text-amber-400/70 text-xs flex items-center gap-1">
                  <span>⚠️</span>
                  {T(lang, '本次占卜結果不會被儲存，請自行記錄', 'This reading will not be stored anywhere. Please note it down if needed.')}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)}
            className="w-full py-4 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {T(lang, '解卦 →', 'Consult Oracle →')}
          </button>

          {!session && (
            <p className="text-center text-white/50 text-sm">
              {T(lang, '需要登入才能儲存歷史記錄', 'Sign in to save your readings')}
            </p>
          )}
        </motion.form>
      )}

      {loading && (
        <>
          <LoadingOracle />
          <div className="glass-card rounded-xl p-4 mt-4 text-center" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {T(lang,
                '🔮 天機推演中，此過程約需數分鐘。您可先行離開，稍後於「歷史記錄」中查閱結果。',
                '🔮 The oracle is processing your reading — this may take a few minutes. Feel free to step away; your result will be saved to your reading history.'
              )}
            </p>
          </div>
        </>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 sm:p-8"
        >
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-serif text-gold">
              {T(lang, '解卦結果', 'Oracle Reading')}
            </h2>
            <button
              onClick={() => { setResult(null); setReadingId(null) }}
              className="text-white/50 hover:text-gold text-sm"
            >
              {T(lang, '重新占卜', 'New Reading')}
            </button>
          </div>
          <ResultRenderer result={result} type={resultType || type} />

          {/* Feedback widget */}
          {readingId && (
            <div className="mt-6">
              <ReadingFeedback readingId={readingId} />
            </div>
          )}

          {/* Share result */}
          {readingId && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
              {shareUrl ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🔗 {T(lang, '分享連結', 'Share link')}:</span>
                  <code className="text-xs break-all px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--gold)' }}>{shareUrl}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success(T(lang, '已複製', 'Copied!')) }}
                    className="px-3 py-1 text-xs rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)', color: 'var(--gold)', border: '1px solid rgba(212, 168, 83, 0.3)' }}
                  >
                    📋 {T(lang, '複製', 'Copy')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setSharing(true)
                    try {
                      const res = await fetch(`/api/readings/${readingId}/share`, { method: 'POST' })
                      const data = await res.json()
                      if (data.token) {
                        const url = `${window.location.origin}/r/${data.token}`
                        setShareUrl(url)
                        navigator.clipboard.writeText(url)
                        toast.success(T(lang, '連結已複製！可發送給朋友查看', 'Link copied! Share with friends'))
                      }
                    } catch { toast.error('Error') }
                    setSharing(false)
                  }}
                  disabled={sharing}
                  className="px-4 py-2 text-sm rounded-xl transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)', color: 'var(--gold)', border: '1px solid rgba(212, 168, 83, 0.3)' }}
                >
                  {sharing ? '...' : `📤 ${T(lang, '分享結果給朋友', 'Share result with friends')}`}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
