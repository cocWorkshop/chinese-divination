'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import LoadingOracle from '@/components/LoadingOracle'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import BirthplaceInput from '@/components/BirthplaceInput'
import YinYangIcon from '@/components/YinYangIcon'
import { reportError, catchAndReport } from '@/lib/errorReporter'

const shichen = [
  { value: 'zi_early', zh: '早子時 (00:00-01:00)', en: 'Early Zi (00:00-01:00)' },
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
  { value: 'zi_late', zh: '晚子時 (23:00-00:00)', en: 'Late Zi (23:00-00:00)' },
]

const directions8 = [
  { value: '坎/North', zh: '坎（北）', en: 'Kan (North)' },
  { value: '艮/NE', zh: '艮（东北）', en: 'Gen (NE)' },
  { value: '震/East', zh: '震（东）', en: 'Zhen (East)' },
  { value: '巽/SE', zh: '巽（东南）', en: 'Xun (SE)' },
  { value: '离/South', zh: '离（南）', en: 'Li (South)' },
  { value: '坤/SW', zh: '坤（西南）', en: 'Kun (SW)' },
  { value: '兑/West', zh: '兑（西）', en: 'Dui (West)' },
  { value: '乾/NW', zh: '乾（西北）', en: 'Qian (NW)' },
]

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

const typeInfo: Record<string, { zhName: string; twName: string; enName: string; symbol: string }> = {
  bazi: { zhName: '八字命理', twName: '八字命理', enName: 'BaZi Analysis', symbol: '🏛️' },
  iching: { zhName: '易经占卜', twName: '易經占卜', enName: 'I Ching Oracle', symbol: '📖' },
  liuyao: { zhName: '六爻占卜', twName: '六爻占卜', enName: 'Liu Yao Divination', symbol: '🪙' },
  ziwei: { zhName: '紫微斗数', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', symbol: '⭐' },
  qimen: { zhName: '奇门遁甲', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', symbol: '🧭' },
  fengshui: { zhName: '风水布局', twName: '風水佈局', enName: 'Feng Shui Analysis', symbol: '🏯' },
  meihua: { zhName: '梅花易数', twName: '梅花易數', enName: 'Plum Blossom Numerology', symbol: '🌸' },
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
    readingDateTime: (() => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })(),
    liuyaoLines: '', // JSON string of 6 lines, each {coins: [0|1, 0|1, 0|1], value: 6|7|8|9}
    subType: 'meihua',
    lunarToggle: 'solar',
    birthEnvironment: '',
    timeMode: 'fuzzy',
    exactTime: '',
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
  const selfProfileRef = useRef<{ birthDate: string; birthTime: string; birthPlace: string; gender: string; lunarToggle: string; timeMode: string; exactTime: string; birthEnvironment: string; birthLat: number | null; birthLng: number | null } | null>(null)
  // modelTier removed — single model now
  // Bazi cache dialog
  const [showCacheDialog, setShowCacheDialog] = useState(false)
  const [cachedReading, setCachedReading] = useState<{ id: string; result: string; createdAt: string; count: number } | null>(null)
  const [credits, setCredits] = useState<{ divination?: { remaining: number }; chat?: { remaining: number }; credits?: number; costs?: Record<string, number> } | null>(null)
  const [llmTimeoutMs, setLlmTimeoutMs] = useState(240000)
  const [shareBonus, setShareBonus] = useState<{divination: number, chat: number} | null>(null)
  const [paipanOnly, setPaipanOnly] = useState(false)
  const [targetType, setTargetType] = useState<'self' | 'family'>('self')
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [newMemberRelation, setNewMemberRelation] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [birthLat, setBirthLat] = useState<number | null>(null)
  const [birthLng, setBirthLng] = useState<number | null>(null)
  const [isSouthernHemisphere, setIsSouthernHemisphere] = useState(false)
  const [tierChecked, setTierChecked] = useState(false)

  const info = typeInfo[type] || { zhName: '占卜', enName: 'Divination', symbol: '📖' }

  // Tier check — no longer role-gated, just mark as checked
  useEffect(() => {
    setTierChecked(true)
  }, [type, session, lang, router])

  // Unified init fetch — profile, credits, share bonus, family members
  useEffect(() => {
    if (!session) return
    fetch('/api/init')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return

        // Daily bonus toast
        if (data.dailyBonusGranted && data.dailyBonus) {
          const c = data.dailyBonus.credits
          toast.success(T(lang, `🎁 每日登入獎勵：+${c} 點機緣`, `🎁 Daily login bonus: +${c} Karma`), { duration: 4000 })
        }

        // Credits
        if (data.credits) {
          setCredits(data.credits)
          if (data.credits.llmTimeoutSeconds) setLlmTimeoutMs(data.credits.llmTimeoutSeconds * 1000)
        }

        // Share bonus
        if (data.shareBonus) setShareBonus(data.shareBonus)

        // Family members
        if (data.familyMembers) setFamilyMembers(data.familyMembers)

        // Profile auto-fill (bazi & ziwei only)
        if (!profileLoaded && ['bazi', 'ziwei'].includes(type) && data.profile) {
          const p = data.profile
          setForm(f => ({
            ...f,
            birthDate:  p.birthDate  || f.birthDate,
            birthTime:  p.birthTime  || f.birthTime,
            birthPlace: p.birthPlace || f.birthPlace,
            gender:     p.gender     || f.gender,
            lunarToggle: p.calendarType || f.lunarToggle,
            timeMode:   p.timeMode   || f.timeMode,
            exactTime:  p.exactTime  || f.exactTime,
            birthEnvironment: p.birthEnvironment || f.birthEnvironment,
          }))
          if (p.birthLat != null) setBirthLat(p.birthLat)
          if (p.birthLng != null) setBirthLng(p.birthLng)
          selfProfileRef.current = {
            birthDate: p.birthDate || '',
            birthTime: p.birthTime || '',
            birthPlace: p.birthPlace || '',
            gender: p.gender || '',
            lunarToggle: p.calendarType || 'solar',
            timeMode: p.timeMode || 'fuzzy',
            exactTime: p.exactTime || '',
            birthEnvironment: p.birthEnvironment || '',
            birthLat: p.birthLat ?? null,
            birthLng: p.birthLng ?? null,
          }
          setProfileLoaded(true)
          if (p.birthDate || p.birthTime) {
            toast.success(T(lang, '已從檔案自動填充生辰資訊', 'Profile info auto-filled'), { icon: '📋' })
          }
        }
      })
      .catch(catchAndReport('/api/init'))
  }, [session, type, profileLoaded, lang])

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId)
    if (memberId && memberId !== '__new__') {
      const member = familyMembers.find(m => m.id === memberId)
      if (member) {
        setForm(f => ({
          ...f,
          birthDate: member.birthDate || '',
          birthTime: member.birthTime || '',
          birthPlace: member.birthPlace || '',
          gender: member.gender || '',
          lunarToggle: member.calendarType || 'solar',
          timeMode: member.timeMode || 'fuzzy',
          exactTime: member.exactTime || '',
          birthEnvironment: member.birthEnvironment || '',
        }))
        // Use stored geocoded coordinates from family member if available
        setBirthLat(member.birthLat ?? null)
        setBirthLng(member.birthLng ?? null)
      }
    } else if (memberId === '__new__') {
      // Clear form for new member
      setForm(f => ({
        ...f,
        birthDate: '',
        birthTime: '',
        birthPlace: '',
        gender: '',
        lunarToggle: 'solar',
        timeMode: 'fuzzy',
        exactTime: '',
        birthEnvironment: '',
      }))
      setBirthLat(null)
      setBirthLng(null)
    }
  }

  const castHexagram = () => {
    const n = Math.floor(Math.random() * 64) + 1
    setField('hexagram', String(n))
    toast.success(T(lang, `得卦：第${n}卦`, `Hexagram #${n}`))
  }

  // Poll for a reading by ID until it's completed or failed
  const pollForReadingById = async (readingId: string): Promise<{ id: string; result: string; status: string } | null> => {
    const maxPollTime = 600_000 // 600 seconds
    const pollInterval = 5_000 // 5 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxPollTime) {
      await new Promise(r => setTimeout(r, pollInterval))
      try {
        const res = await fetch(`/api/readings/${readingId}`)
        if (!res.ok) continue
        const data = await res.json()
        const r = data.reading
        if (r?.status === 'completed' && r.result && r.result.length > 10) {
          return { id: r.id, result: r.result, status: r.status }
        }
        if (r?.status === 'failed') {
          return { id: r.id, result: r.result || '', status: 'failed' }
        }
        // Still pending, continue polling
      } catch { /* continue polling */ }
    }
    return null
  }

  const doSubmit = async () => {
    setShowCacheDialog(false)
    setCachedReading(null)
    setLoading(true)
    setResult(null)
    setShareUrl(null)
    // Use instant scroll + setTimeout fallback for mobile browsers
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    setTimeout(() => window.scrollTo({ top: 0 }), 100)

    const formData = { ...form }
    if (birthLat !== null) (formData as Record<string, unknown>).birthLat = birthLat
    if (birthLng !== null) (formData as Record<string, unknown>).birthLng = birthLng

    // Step 1: Create pending reading via /api/divination/init (fast, <1s)
    let pendingReadingId: string | null = null
    let resolvedMemberId: string | undefined = targetType === 'family' && selectedMemberId && selectedMemberId !== '__new__' ? selectedMemberId : undefined
    try {
      const initRes = await fetch('/api/divination/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          inputData: formData,
          language: lang,
          question: form.question,
          saveHistory,
          targetType,
          familyMemberId: targetType === 'family' && selectedMemberId && selectedMemberId !== '__new__' ? selectedMemberId : undefined,
          newFamilyMember: targetType === 'family' && selectedMemberId === '__new__' ? { relation: newMemberRelation, name: newMemberName || undefined } : undefined,
          clientTime: new Date().toISOString(),
          ...(paipanOnly ? { paipanOnly: true } : {}),
        }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        toast.error(initData.error || 'Error')
        reportError({ endpoint: '/api/divination/init', status: initRes.status, error: initData.error || 'Unknown error', context: `type=${type}` })
        setLoading(false)
        return
      }
      pendingReadingId = initData.readingId
      // If init created a new family member, use the returned ID for Step 2 (avoid duplicate creation)
      if (initData.familyMemberId && selectedMemberId === '__new__') {
        resolvedMemberId = initData.familyMemberId
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      toast.error(T(lang, '網絡錯誤，請重試', 'Network error, please retry'))
      reportError({ endpoint: '/api/divination/init', error: msg, context: `type=${type}` })
      setLoading(false)
      return
    }

    // Step 2: Fire LLM request + poll by ID as fallback
    try {
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
          saveProfile: saveProfile,
          saveHistory,
          targetType,
          familyMemberId: resolvedMemberId || undefined,
          readingId: pendingReadingId,
          clientTime: new Date().toISOString(),
          ...(paipanOnly ? { paipanOnly: true } : {}),
        }),
        signal: fetchController.signal,
      })
      clearTimeout(fetchTimeout)
      let data
      try {
        data = await res.json()
      } catch {
        // Response is not JSON (e.g. Cloudflare 524 HTML) — fall back to polling by ID
        if (pendingReadingId) {
          toast(T(lang, '⏳ 伺服器仍在處理中，等待結果...', '⏳ Server still processing, waiting for result...'), { icon: '🔄', duration: 5000 })
          const found = await pollForReadingById(pendingReadingId)
          if (found && found.status === 'completed') {
            setResult(found.result)
            setResultType(type)
            setReadingId(found.id)
            toast.success(T(lang, '結果已就緒', 'Result ready!'))
            fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
          } else {
            toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
            reportError({ endpoint: '/api/divination', status: res.status, error: `Polling timeout — readingId=${pendingReadingId}`, context: `type=${type}` })
          }
        } else {
          toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
        }
        setLoading(false)
        return
      }
      if (res.ok) {
        setResult(data.reading.result)
        setResultType(type)
        setReadingId(data.reading.id || pendingReadingId || null)
        if (data.cached) {
          toast.success(T(lang, '已使用之前的八字分析結果', 'Using cached BaZi analysis'), { icon: '📦' })
        }
        // Refresh credits
        fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
      } else {
        toast.error(data.error || 'Error')
        reportError({ endpoint: '/api/divination', status: res.status, error: data.error || 'Unknown error', context: `type=${type}` })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      // Network error or abort — poll by ID as fallback
      if (pendingReadingId) {
        toast(T(lang, '⏳ 連接中斷，等待伺服器處理結果...', '⏳ Connection lost, waiting for server result...'), { icon: '🔄', duration: 5000 })
        const found = await pollForReadingById(pendingReadingId)
        if (found && found.status === 'completed') {
          setResult(found.result)
          setResultType(type)
          setReadingId(found.id)
          toast.success(T(lang, '結果已就緒', 'Result ready!'))
          fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
        } else {
          toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
          reportError({ endpoint: '/api/divination', error: `Polling timeout — readingId=${pendingReadingId}, original: ${msg}`, context: `type=${type}` })
        }
      } else {
        toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
        reportError({ endpoint: '/api/divination', error: `No readingId, original: ${msg}`, context: `type=${type}` })
      }
    }
    setLoading(false)
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
    if (['bazi', 'ziwei'].includes(type) && form.timeMode === 'precise' && !form.birthPlace) {
      toast.error(T(lang, '精確模式需要填寫出生地（用於真太陽時校正）', 'Precise mode requires birthplace for true solar time correction'))
      return
    }
    if (['bazi', 'ziwei'].includes(type) && form.timeMode === 'precise' && birthLat == null) {
      toast.error(T(lang, '請從搜索結果中選擇出生地，以確保時間校正準確', 'Please select birthplace from search results for accurate time correction'))
      return
    }
    // For bazi: check if existing readings exist before proceeding
    if (type === 'bazi') {
      try {
        const checkRes = await fetch('/api/divination/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            targetType,
            familyMemberId: targetType === 'family' && selectedMemberId && selectedMemberId !== '__new__' ? selectedMemberId : undefined,
            inputData: { birthDate: form.birthDate, birthTime: form.birthTime, gender: form.gender },
          }),
        })
        const checkData = await checkRes.json()
        if (checkData.hasExisting) {
          setCachedReading({ id: checkData.latest.id, result: checkData.latest.result, createdAt: checkData.latest.createdAt, count: checkData.count })
          setShowCacheDialog(true)
          return
        }
      } catch { /* proceed normally */ }
    }
    doSubmit()
  }

  const handleViewCached = () => {
    if (cachedReading) {
      setResult(cachedReading.result)
      setResultType(type)
      setReadingId(cachedReading.id)
      setShowCacheDialog(false)
      toast.success(T(lang, '已載入歷史八字分析', 'Loaded previous BaZi reading'), { icon: '📦' })
    }
  }

  const handleNewReading = () => {
    setShowCacheDialog(false)
    doSubmit()
  }

  const inputCls = "w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
  const labelCls = "block text-white/70 text-sm mb-1"

  if (!tierChecked) return null

  return (
    <div className={`flex flex-col py-8 sm:py-12 px-3 sm:px-4 max-w-2xl mx-auto ${loading ? '' : 'min-h-[calc(100vh-4rem)]'}`}>
      {/* Bazi cache dialog */}
      {showCacheDialog && cachedReading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 rounded-xl max-w-md w-full text-center space-y-4"
          >
            <div className="text-4xl mb-2">📦</div>
            <h3 className="text-xl font-serif text-gold">
              {T(lang, '發現歷史八字分析', 'Existing BaZi Reading Found')}
            </h3>
            <p className="text-white/70 text-sm">
              {T(lang,
                `已有 ${cachedReading.count} 筆相同生辰的八字分析記錄。最近一次：${new Date(cachedReading.createdAt).toLocaleDateString('zh-TW')}`,
                `Found ${cachedReading.count} existing reading(s) with the same birth data. Latest: ${new Date(cachedReading.createdAt).toLocaleDateString('en-US')}`
              )}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handleViewCached}
                className="px-5 py-2.5 bg-gold/20 border border-gold/40 rounded-lg text-gold hover:bg-gold/30 transition-colors font-medium"
              >
                {T(lang, '📖 查看歷史', '📖 View History')}
              </button>
              <button
                onClick={handleNewReading}
                className="px-5 py-2.5 bg-gold text-navy-900 rounded-lg hover:bg-gold-light transition-colors font-medium"
              >
                {T(lang, '🔮 重新占卜', '🔮 New Reading')}
              </button>
            </div>
            <button
              onClick={() => setShowCacheDialog(false)}
              className="text-white/40 hover:text-white/60 text-sm transition-colors"
            >
              {T(lang, '取消', 'Cancel')}
            </button>
          </motion.div>
        </div>
      )}

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
          {['bazi', 'ziwei'].includes(type) && session && (
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
                      const { birthLat: sLat, birthLng: sLng, ...rest } = selfProfileRef.current
                      setForm(f => ({ ...f, ...rest }))
                      setBirthLat(sLat)
                      setBirthLng(sLng)
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
            {/* ── Section: Birth Date & Calendar ── */}
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                📅 {T(lang, '生辰信息', 'Birth Information')}
              </p>

              {/* Calendar Toggle + Date on same row (desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                  <div className="flex rounded-full border border-gold/30 overflow-hidden bg-navy-800 w-fit">
                    {([['solar', '公曆', 'Solar'], ['lunar', '農曆', 'Lunar']] as const).map(([val, zh, en]) => (
                      <motion.button
                        key={val}
                        type="button"
                        onClick={() => setField('lunarToggle', val)}
                        className={`px-5 py-2 text-sm font-medium transition-colors relative ${
                          form.lunarToggle === val ? 'text-navy-900' : 'text-white/60 hover:text-white/80'
                        }`}
                      >
                        {form.lunarToggle === val && (
                          <motion.div
                            layoutId="calendarToggle"
                            className="absolute inset-0 rounded-full"
                            style={{ backgroundColor: '#d4a853' }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                        <span className="relative z-10">{T(lang, zh, en)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                  <input type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
                </div>
              </div>

              {/* Time Mode Toggle + Time Input */}
              <div>
                <label className={labelCls}>{T(lang, '出生時間', 'Birth Time')}</label>
                <div className="flex rounded-full border border-gold/30 overflow-hidden bg-navy-800 w-fit mb-3">
                  {([['fuzzy', '模糊（時辰）', 'Fuzzy (Shichen)'], ['precise', '精確（時分）', 'Precise (HH:MM)']] as const).map(([val, zh, en]) => (
                    <motion.button
                      key={val}
                      type="button"
                      onClick={() => setField('timeMode', val)}
                      className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                        form.timeMode === val ? 'text-navy-900' : 'text-white/60 hover:text-white/80'
                      }`}
                    >
                      {form.timeMode === val && (
                        <motion.div
                          layoutId="timeModeToggle"
                          className="absolute inset-0 rounded-full"
                          style={{ backgroundColor: '#d4a853' }}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        />
                      )}
                      <span className="relative z-10">{T(lang, zh, en)}</span>
                    </motion.button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  {form.timeMode === 'fuzzy' ? (
                    <motion.div key="fuzzy" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                      <select className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
                        <option value="">{T(lang, '請選擇時辰', 'Select Shichen')}</option>
                        {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
                      </select>
                      <p className="text-white/40 text-xs mt-1">{T(lang, '自動取時辰中間值，無真太陽時校正', 'Uses midpoint of shichen, no true solar time correction')}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="precise" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                      <input type="time" className={inputCls} value={form.exactTime} onChange={e => setField('exactTime', e.target.value)} required />
                      <p className="text-white/40 text-xs mt-1">{T(lang, '將根據出生地經度進行真太陽時校正', 'True solar time correction based on birthplace longitude')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Gender + Birthplace side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
                  <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
                    <option value="">{T(lang, '請選擇', 'Select')}</option>
                    <option value="male">{T(lang, '男', 'Male')}</option>
                    <option value="female">{T(lang, '女', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    {T(lang, '出生地', 'Birthplace')}
                    {form.timeMode === 'precise' && <span className="text-gold ml-1">*</span>}
                    {form.timeMode === 'fuzzy' && <span className="text-white/40 ml-1">{T(lang, '（可選）', '(optional)')}</span>}
                  </label>
                  <BirthplaceInput
                    value={form.birthPlace}
                    onChange={v => setField('birthPlace', v)}
                    onLatLngChange={(lat, lng) => { setBirthLat(lat); setBirthLng(lng) }}
                    onSouthernHemisphere={setIsSouthernHemisphere}
                    className={inputCls}
                    placeholder={T(lang, '搜尋城市...', 'Search city...')}
                  />
                </div>
              </div>

              {/* Birth environment */}
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

          {/* Liu Yao 六爻 */}
          {type === 'liuyao' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '心中默念所問之事，一事一占，問題越具體越好...', 'Focus on one specific question...')} />
            </div>
            <div className="border border-gold/20 rounded-xl p-3 sm:p-4 bg-navy-900/50 space-y-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                🪙 {T(lang, '搖卦（三枚銅錢法）', 'Cast Hexagram (Three Coin Method)')}
              </p>
              <p className="text-white/40 text-xs leading-relaxed">
                {T(lang,
                  '每次擲三枚銅錢，字面為陰（值2），背面為陽（值3）。三枚合計：6=老陰（變爻）、7=少陽、8=少陰、9=老陽（變爻）。共擲六次，從初爻到上爻。',
                  'Toss 3 coins each time. Heads=2 (Yin), Tails=3 (Yang). Sum: 6=Old Yin (changing), 7=Young Yang, 8=Young Yin, 9=Old Yang (changing). Toss 6 times, from bottom to top.'
                )}
              </p>
              {(() => {
                const lines: { coins: number[]; value: number }[] = form.liuyaoLines ? JSON.parse(form.liuyaoLines) : []
                const currentLine = lines.length
                const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
                const yaoNamesEn = ['1st Line', '2nd Line', '3rd Line', '4th Line', '5th Line', '6th Line']
                const valueLabels: Record<number, { zh: string; en: string; type: string }> = {
                  6: { zh: '老陰 ⚋✕', en: 'Old Yin ⚋✕', type: 'changing' },
                  7: { zh: '少陽 ⚊', en: 'Young Yang ⚊', type: 'stable' },
                  8: { zh: '少陰 ⚋', en: 'Young Yin ⚋', type: 'stable' },
                  9: { zh: '老陽 ⚊✕', en: 'Old Yang ⚊✕', type: 'changing' },
                }

                const tossCoins = () => {
                  const coins: number[] = [0, 0, 0].map(() => Math.random() < 0.5 ? 2 : 3) // 2=yin(字), 3=yang(背)
                  const value = coins.reduce((a, b) => a + b, 0)
                  const newLines = [...lines, { coins, value }]
                  setField('liuyaoLines', JSON.stringify(newLines))
                }

                const resetLines = () => {
                  setField('liuyaoLines', '')
                }

                return (
                  <div className="space-y-3">
                    {/* Cast lines display */}
                    {lines.length > 0 && (
                      <div className="space-y-1.5">
                        {[...lines].reverse().map((line, ri) => {
                          const i = lines.length - 1 - ri
                          const label = valueLabels[line.value]
                          const isChanging = line.value === 6 || line.value === 9
                          return (
                            <div key={i} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg ${isChanging ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-navy-800/50'}`}>
                              <span className="text-white/40 text-xs w-10">{T(lang, yaoNames[i], yaoNamesEn[i])}</span>
                              <div className="flex gap-1">
                                {line.coins.map((c, ci) => (
                                  <span key={ci} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c === 2 ? 'bg-navy-700 text-white/60 border border-white/20' : 'bg-gold/80 text-navy-900'}`}>
                                    {c === 2 ? T(lang, '字', 'H') : T(lang, '背', 'T')}
                                  </span>
                                ))}
                              </div>
                              <span className="text-gold text-xs font-mono">{line.value}</span>
                              <span className={`text-xs ${isChanging ? 'text-amber-400' : 'text-white/50'}`}>
                                {T(lang, label.zh, label.en)}
                              </span>
                              {/* Line visual */}
                              <div className="ml-auto flex items-center gap-0.5">
                                {(line.value === 7 || line.value === 9) ? (
                                  <div className={`w-12 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/60'}`} />
                                ) : (
                                  <>
                                    <div className={`w-5 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/40'}`} />
                                    <div className="w-1.5" />
                                    <div className={`w-5 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/40'}`} />
                                  </>
                                )}
                                {isChanging && <span className="text-amber-400 text-xs ml-1">✕</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Toss button or complete */}
                    <div className="flex items-center gap-3">
                      {currentLine < 6 ? (
                        <button type="button" onClick={tossCoins}
                          className="flex-1 px-5 py-3 border border-gold/50 text-gold rounded-xl hover:border-gold hover:bg-gold/10 transition-all text-center">
                          🪙 {T(lang, `擲第${currentLine + 1}次 — ${yaoNames[currentLine]}`, `Toss #${currentLine + 1} — ${yaoNamesEn[currentLine]}`)}
                        </button>
                      ) : (
                        <div className="flex-1 text-center py-2">
                          <span className="text-jade text-sm font-semibold">✅ {T(lang, '六爻已成，可以解卦', 'All 6 lines cast, ready to divine')}</span>
                        </div>
                      )}
                      {lines.length > 0 && currentLine < 6 && (
                        <button type="button" onClick={resetLines}
                          className="px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors">
                          {T(lang, '重擲', 'Reset')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </>}

          {/* Zi Wei */}
          {type === 'ziwei' && <>
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                📅 {T(lang, '生辰信息', 'Birth Information')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
                  <div className="flex rounded-full border border-gold/30 overflow-hidden bg-navy-800 w-fit">
                    {([['solar', '公曆', 'Solar'], ['lunar', '農曆', 'Lunar']] as const).map(([val, zh, en]) => (
                      <motion.button
                        key={val}
                        type="button"
                        onClick={() => setField('lunarToggle', val)}
                        className={`px-5 py-2 text-sm font-medium transition-colors relative ${
                          form.lunarToggle === val ? 'text-navy-900' : 'text-white/60 hover:text-white/80'
                        }`}
                      >
                        {form.lunarToggle === val && (
                          <motion.div
                            layoutId="ziweiCalendarToggle"
                            className="absolute inset-0 rounded-full"
                            style={{ backgroundColor: '#d4a853' }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                        <span className="relative z-10">{T(lang, zh, en)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
                  <input type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
                </div>
              </div>

              {/* Time Mode Toggle + Time Input */}
              <div>
                <label className={labelCls}>{T(lang, '出生時間', 'Birth Time')}</label>
                <div className="flex rounded-full border border-gold/30 overflow-hidden bg-navy-800 w-fit mb-3">
                  {([['fuzzy', '模糊（時辰）', 'Fuzzy (Shichen)'], ['precise', '精確（時分）', 'Precise (HH:MM)']] as const).map(([val, zh, en]) => (
                    <motion.button
                      key={val}
                      type="button"
                      onClick={() => setField('timeMode', val)}
                      className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                        form.timeMode === val ? 'text-navy-900' : 'text-white/60 hover:text-white/80'
                      }`}
                    >
                      {form.timeMode === val && (
                        <motion.div
                          layoutId="ziweiTimeModeToggle"
                          className="absolute inset-0 rounded-full"
                          style={{ backgroundColor: '#d4a853' }}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        />
                      )}
                      <span className="relative z-10">{T(lang, zh, en)}</span>
                    </motion.button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  {form.timeMode === 'fuzzy' ? (
                    <motion.div key="fuzzy" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                      <select className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
                        <option value="">{T(lang, '請選擇時辰', 'Select Shichen')}</option>
                        {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
                      </select>
                    </motion.div>
                  ) : (
                    <motion.div key="precise" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                      <input type="time" className={inputCls} value={form.exactTime} onChange={e => setField('exactTime', e.target.value)} required />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Gender + Birthplace */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
                  <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
                    <option value="">{T(lang, '請選擇', 'Select')}</option>
                    <option value="male">{T(lang, '男', 'Male')}</option>
                    <option value="female">{T(lang, '女', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{T(lang, '出生地（可選）', 'Birthplace (optional)')}</label>
                  <BirthplaceInput
                    value={form.birthPlace}
                    onChange={v => setField('birthPlace', v)}
                    onLatLngChange={(lat, lng) => { setBirthLat(lat); setBirthLng(lng) }}
                    onSouthernHemisphere={setIsSouthernHemisphere}
                    className={inputCls}
                    placeholder={T(lang, '搜尋城市...', 'Search city...')}
                  />
                </div>
              </div>

              {/* Birth environment */}
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
                {directions8.map(d => <option key={d.value} value={d.value}>{T(lang, d.zh, d.en)}</option>)}
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

          {/* Meihua */}
          {type === 'meihua' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想預測的事項...', 'Describe what you want to predict...')} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '起卦時間', 'Reading Date/Time')}</label>
              <input type="datetime-local" className={inputCls} value={form.readingDateTime} onChange={e => setField('readingDateTime', e.target.value)} />
              <p className="text-white/40 text-xs mt-1">{T(lang, '默認為當前時間，梅花易數以時間起卦', 'Defaults to current time. Meihua uses time-based hexagram casting.')}</p>
            </div>
          </>}

          {/* Other (hidden — kept for legacy/liuren) */}
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

          {/* Credits display */}
          {session && credits && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  {T(lang, '✨ 機緣', '✨ Karma')}
                </span>
                <span className="text-gold font-mono font-bold">
                  {credits.credits === 999 ? '∞' : (credits.credits ?? 0)}
                  {credits.costs && credits.costs[type] ? (
                    <span className="text-white/40 text-xs ml-1">
                      ({T(lang, `本次消耗 ${credits.costs[type]} 點`, `costs ${credits.costs[type]} pts`)})
                    </span>
                  ) : null}
                </span>
              </div>
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

          {/* paipanOnly checkbox (all logged-in users) */}
          {session && credits && ['bazi', 'ziwei', 'qimen', 'meihua'].includes(type) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={paipanOnly}
                onChange={e => setPaipanOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gold/30 accent-gold"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {T(lang, '只排盤（不調用AI解盤，不扣機緣）', 'Paipan only (no AI interpretation, no Karma cost)')}
              </span>
            </label>
          )}

          {(() => {
            const remaining = credits?.credits ?? credits?.divination?.remaining ?? 0
            const cost = credits?.costs?.[type] ?? 5
            const isAdmin = remaining === 999
            const hasEnough = isAdmin || paipanOnly || remaining >= cost
            if (session && credits && !isAdmin && !paipanOnly && !hasEnough) {
              return (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => router.push('/subscribe')}
                    className="w-full py-4 rounded-xl font-semibold text-lg transition-colors bg-gradient-to-r from-amber-600 to-gold text-navy-950 hover:opacity-90"
                  >
                    {T(lang, `機緣不足（需要 ${cost}）· 前往機緣商店 →`, `Not enough Karma (need ${cost}) · Karma Shop →`)}
                  </button>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    {T(lang,
                      '💡 每日登入 +2 | 分享給朋友 +機緣 | 更多方式見機緣商店',
                      '💡 Daily login +2 | Share with friends | More at Credits Store'
                    )}
                  </p>
                </div>
              )
            }
            return (
              <button
                type="submit"
                disabled={(isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)) || (type === 'liuyao' && (!form.liuyaoLines || (JSON.parse(form.liuyaoLines || '[]')).length < 6))}
                className="w-full py-4 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paipanOnly
                  ? T(lang, '排盤 →', 'Calculate →')
                  : (session && !isAdmin
                    ? `${T(lang, '解卦', 'Consult Oracle')} (${remaining} ${T(lang, '點', 'pts')}) →`
                    : T(lang, '解卦 →', 'Consult Oracle →'))
                }
              </button>
            )
          })()}

          {!session && (
            <p className="text-center text-white/50 text-sm">
              {T(lang, '需要登入才能儲存歷史記錄', 'Sign in to save your readings')}
            </p>
          )}
        </motion.form>
      )}

      {loading && (
        <div className="flex-1 flex flex-col">
          <LoadingOracle divinationType={type} />
          <div className="mt-auto pt-8">
            <div className="glass-card rounded-xl p-4 text-center" style={{ borderColor: 'var(--card-border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {T(lang,
                  '🔮 天機推演中，此過程約需數分鐘。您可先行離開，稍後於「歷史記錄」中查閱結果。',
                  '🔮 The oracle is processing your reading — this may take a few minutes. Feel free to step away; your result will be saved to your reading history.'
                )}
              </p>
            </div>
          </div>
        </div>
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
          <ResultRenderer result={result} type={resultType || type} readingId={readingId} />

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
