'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import LoadingOracle from '@/components/LoadingOracle'
import ResultRenderer from '@/components/results/ResultRenderer'
import ReadingFeedback from '@/components/ReadingFeedback'
import BirthplaceInput from '@/components/BirthplaceInput'
import { POPULAR_CITIES } from '@/lib/cities'
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

/**
 * Mutate-in-place helper for assembling the streaming partial result.
 * Walks `path`, creating intermediate objects/arrays as needed, then
 * applies `transform` to the leaf — the transform receives the existing
 * value (or undefined) and returns the new value. Used both for
 * appending chars to a partial string (`value_chunk`) and for setting
 * a final value (`value_done`).
 *
 * Mutates `root` directly; callers serialize via `JSON.stringify(root)`
 * to feed the renderer. We accept the mutation because path-tagged
 * events arrive at high frequency (1-3 chars per event during a 200-
 * char section) and shallow-cloning the entire tree per char would
 * stall the React reconciler.
 */
function mutateAtPath(
  root: Record<string, unknown>,
  path: (string | number)[],
  transform: (existing: unknown) => unknown,
): void {
  if (path.length === 0) return
  let cur = root as Record<string | number, unknown>
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    const nextKey = path[i + 1]
    const wantArray = typeof nextKey === 'number'
    const existing = cur[key]
    if (existing === undefined || existing === null) {
      const fresh = wantArray ? [] : {}
      cur[key] = fresh
      cur = fresh as Record<string | number, unknown>
    } else {
      cur = existing as Record<string | number, unknown>
    }
  }
  const lastKey = path[path.length - 1]
  cur[lastKey] = transform(cur[lastKey])
}

export default function DivinationFormPage() {
  const { type } = useParams<{ type: string }>()
  const { data: session } = useSession()
  const { lang } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()

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
    ichingLines: '', // same shape as liuyaoLines — proper three-coin cast (replaces legacy single-number `hexagram` field)
    subType: 'meihua',
    lunarToggle: 'solar',
    birthEnvironment: '',
    timeMode: 'fuzzy',
    exactTime: '',
  })
  const [loading, setLoading] = useState(false)
  // True while SSE is actively pushing partial result chunks. Drives the
  // result panel into "streaming mode" where sections show typing-dot
  // placeholders for fields not yet arrived.
  const [streaming, setStreaming] = useState(false)
  // Flips true on the first value_chunk — until then, LoadingOracle stays
  // visible so the user doesn't stare at empty "玄機正在書寫…" placeholders
  // during the (potentially long) LLM reasoning phase.
  const [hasLLMContent, setHasLLMContent] = useState(false)
  // Track streaming duration for timeout warnings
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [readingId, setReadingId] = useState<string | null>(null)
  const [saveProfile, setSaveProfile] = useState(true)
  const [saveHistory, setSaveHistory] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const selfProfileRef = useRef<{ birthDate: string; birthTime: string; birthPlace: string; gender: string; lunarToggle: string; timeMode: string; exactTime: string; birthEnvironment: string; birthLat: number | null; birthLng: number | null } | null>(null)
  // True once the query-param hydration effect has seeded the form from
  // the master's CTA card. Used to prevent /api/init's profile auto-fill
  // from clobbering hydrated values (especially when target=family).
  const paramsHydratedRef = useRef(false)
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
  const [newMemberRelationDetail, setNewMemberRelationDetail] = useState('')
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

        // Profile auto-fill (bazi & ziwei only). Skipped when the form has
        // already been hydrated from CTA query params — otherwise we would
        // overwrite prefilled values (e.g. a father's birth info) with the
        // authenticated user's own profile.
        if (!profileLoaded && ['bazi', 'ziwei'].includes(type) && data.profile && !paramsHydratedRef.current) {
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

  // Query-param hydration — runs once on mount. Used by the master's
  // prefill_divination_form tool to seed the form when the user is
  // redirected here from a CTA card in the Xuanji Master chat.
  useEffect(() => {
    if (paramsHydratedRef.current) return
    if (!searchParams || searchParams.toString() === '') return
    paramsHydratedRef.current = true

    const updates: Record<string, string> = {}
    const formKeys = [
      'birthDate', 'birthTime', 'exactTime', 'timeMode', 'birthPlace',
      'gender', 'question',
    ] as const
    for (const k of formKeys) {
      const v = searchParams.get(k)
      if (v) updates[k] = v
    }
    // calendarType → lunarToggle field
    const ct = searchParams.get('calendarType')
    if (ct) updates.lunarToggle = ct
    if (Object.keys(updates).length > 0) {
      setForm(f => ({ ...f, ...updates }))
    }

    // Resolve birthPlace to lat/lng from the POPULAR_CITIES preset list.
    // Without this, submission with timeMode=precise fails the birthLat
    // null-check because BirthplaceInput only sets lat/lng when a user
    // manually picks from the search dropdown. For cities not in presets,
    // the user can still edit the birthplace field to pick from search.
    const bp = updates.birthPlace
    if (bp) {
      const q = bp.trim().toLowerCase()
      const match =
        POPULAR_CITIES.find((c) => c.name_zh === bp.trim() || c.name_en.toLowerCase() === q) ??
        POPULAR_CITIES.find((c) => bp.includes(c.name_zh) || q.includes(c.name_en.toLowerCase()))
      if (match) {
        setBirthLat(match.lat)
        setBirthLng(match.lon)
      }
    }

    // Target (self / family) and family member selection
    const target = searchParams.get('target')
    if (target === 'family') {
      setTargetType('family')
      const fid = searchParams.get('familyMemberId')
      if (fid) setSelectedMemberId(fid)
      if (fid === '__new__') {
        const rel = searchParams.get('relation')
        if (rel) setNewMemberRelation(rel)
        const relDetail = searchParams.get('relationDetail')
        if (relDetail) setNewMemberRelationDetail(relDetail)
        const nm = searchParams.get('memberName')
        if (nm) setNewMemberName(nm)
      }
    } else if (target === 'self') {
      setTargetType('self')
    }

    if (Object.keys(updates).length > 0 || target) {
      toast(T(lang, '已從玄機大師對話中自動填入資訊', 'Fields pre-filled from Master Xuanji'), { icon: '✨', duration: 3000 })
    }
  }, [searchParams, lang])

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

  // Reset the cast (used by 重新起卦 button on iching panel).
  const resetIchingCast = () => {
    setField('ichingLines', '')
    setField('hexagram', '')
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
    setHasLLMContent(false)
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
          newFamilyMember: targetType === 'family' && selectedMemberId === '__new__' ? { relation: newMemberRelation, relationDetail: newMemberRelationDetail || undefined, name: newMemberName || undefined } : undefined,
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

    // Step 2: Streaming SSE — receive section-by-section LLM output. The
    // route emits `chart_ready` (deterministic chart from calculator),
    // `value_chunk` / `value_done` (path-tagged JSON value events while
    // the LLM types), and a final `done` (full saved reading). The
    // streaming UX makes 60-120s waits feel continuous instead of blank.
    //
    // Polling-by-id fallback retained for cases where SSE truly fails
    // (Cloudflare 524, network drop) — same recovery as before.
    try {
      const fetchController = new AbortController()
      const fetchTimeout = setTimeout(() => fetchController.abort(), llmTimeoutMs + 10000)
      const res = await fetch('/api/divination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
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

      const ct = res.headers.get('content-type') || ''
      if (!res.ok || !ct.includes('text/event-stream')) {
        // Server fell back to JSON (e.g. local proxy doesn't support
        // streaming) or returned an error — use the legacy single-shot
        // path. Try to parse the body either way.
        clearTimeout(fetchTimeout)
        let data: { reading?: { id: string; result: string }; error?: string; cached?: boolean } | null = null
        try { data = await res.json() } catch { /* see polling fallback below */ }
        if (res.ok && data?.reading) {
          setResult(data.reading.result)
          setResultType(type)
          const savedId = data.reading.id || pendingReadingId || null
          setReadingId(savedId)
          if (savedId && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('xuanji:readingComplete', { detail: { readingId: savedId, type } }))
          }
          if (data.cached) {
            toast.success(T(lang, '已使用之前的八字分析結果', 'Using cached BaZi analysis'), { icon: '📦' })
          }
          fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
        } else if (data?.error) {
          toast.error(data.error)
          reportError({ endpoint: '/api/divination', status: res.status, error: data.error, context: `type=${type}` })
        } else if (pendingReadingId) {
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
          }
        } else {
          toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
        }
        setLoading(false)
        return
      }

      // SSE happy path. Build the partial result object as path-tagged
      // events arrive; on `done` the server sends the final structured
      // result (with merge-injected calculator fields), which replaces the
      // partial in one shot.
      const reader = res.body?.getReader()
      if (!reader) {
        clearTimeout(fetchTimeout)
        toast.error(T(lang, '網絡錯誤，請重試', 'Network error, please retry'))
        setLoading(false)
        return
      }
      const decoder = new TextDecoder()
      let buffer = ''
      const partial: Record<string, unknown> = {}
      let finalReading: { id: string | null; result: string } | null = null
      let streamError: string | null = null
      let hasLLMContentRef = false

      // Begin showing the result panel as soon as the first byte arrives —
      // the renderer reads `result` (which we keep updating with the
      // serialized partial) and reveals sections progressively.
      setResult(JSON.stringify(partial))
      setResultType(type)
      setStreaming(true)
      setStreamStartTime(Date.now())

      // Throttle re-renders to one per animation frame. Without this, a
      // 200-char section emits ~200 value_chunk events in a few seconds —
      // setState'ing on every char would cause noticeable jank on mobile.
      // RAF caps us at ~60 fps regardless of event rate.
      let rafScheduled = false
      const scheduleRender = () => {
        if (rafScheduled) return
        rafScheduled = true
        requestAnimationFrame(() => {
          rafScheduled = false
          setResult(JSON.stringify(partial))
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload) continue
          let evt: { type: string; path?: (string | number)[]; text?: string; value?: unknown; seed?: Record<string, unknown>; error?: string; reading?: { id: string | null; result: string } } | null = null
          try { evt = JSON.parse(payload) } catch { continue }
          if (!evt) continue

          if (evt.type === 'chart_ready' && evt.seed) {
            // Backend pre-merged the deterministic chart into the same
            // shape the renderer consumes (pillars / dayMaster / etc. at
            // root). Spread it into our partial so paipan + structural
            // chart data are visible at t=0.
            for (const [k, v] of Object.entries(evt.seed)) {
              ;(partial as Record<string, unknown>)[k] = v
            }
            scheduleRender()
          } else if (evt.type === 'value_chunk' && evt.path && typeof evt.text === 'string') {
            if (!hasLLMContentRef) { hasLLMContentRef = true; setHasLLMContent(true); setStreamStartTime(null) }
            mutateAtPath(partial, evt.path, (cur) => (typeof cur === 'string' ? cur : '') + evt.text)
            scheduleRender()
          } else if (evt.type === 'value_done' && evt.path) {
            mutateAtPath(partial, evt.path, () => evt.value)
            scheduleRender()
          } else if (evt.type === 'done' && evt.reading) {
            finalReading = evt.reading
          } else if (evt.type === 'error' && evt.error) {
            streamError = evt.error
          }
        }
      }
      clearTimeout(fetchTimeout)
      setStreaming(false)

      if (streamError) {
        toast.error(streamError)
        reportError({ endpoint: '/api/divination', error: streamError, context: `type=${type}, stream` })
      } else if (finalReading) {
        // Replace partial with the server-validated final result (Zod-
        // approved + merge-injected fields like trueSolarTime).
        setResult(finalReading.result)
        const savedId = finalReading.id || pendingReadingId || null
        setReadingId(savedId)
        if (savedId && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xuanji:readingComplete', { detail: { readingId: savedId, type } }))
        }
        fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
      } else if (pendingReadingId) {
        // Stream ended without `done` event — fall back to polling.
        const found = await pollForReadingById(pendingReadingId)
        if (found && found.status === 'completed') {
          setResult(found.result)
          setReadingId(found.id)
          toast.success(T(lang, '結果已就緒', 'Result ready!'))
          fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
        } else {
          toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      setStreaming(false)
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
      router.push(`/login?next=${encodeURIComponent(`/divination/${type}`)}`)
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
    // For bazi/ziwei: check if existing readings exist before proceeding
    if (type === 'bazi' || type === 'ziwei') {
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
      toast.success(T(lang,
        type === 'ziwei' ? '已載入歷史紫微分析' : '已載入歷史八字分析',
        type === 'ziwei' ? 'Loaded previous Zi Wei reading' : 'Loaded previous BaZi reading'
      ), { icon: '📦' })
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
      {/* Inline cache banner — replaces the old blocking modal. Sits above
          the form, non-blocking, so users can still edit fields or ignore. */}
      {showCacheDialog && cachedReading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-serif" style={{ color: 'var(--gold)' }}>
              📦 {T(lang,
                `已有 ${cachedReading.count} 筆相同分析（${new Date(cachedReading.createdAt).toLocaleDateString('zh-TW')}）`,
                `${cachedReading.count} existing reading(s) found (${new Date(cachedReading.createdAt).toLocaleDateString('en-US')})`
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleViewCached}
              className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              {T(lang, '查看歷史', 'View History')}
            </button>
            <button
              onClick={() => setShowCacheDialog(false)}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="text-5xl mb-3">{type === 'iching' ? <YinYangIcon size={48} /> : info.symbol}</div>
        <h1 className="text-3xl font-serif text-gold">{lang === 'en' ? info.enName : info.twName}</h1>
      </motion.div>

      {/* Back link */}
      {!result && !loading && (
        <button
          type="button"
          onClick={() => router.push('/divination')}
          className="mb-4 text-sm transition-colors hover:text-gold flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          ← {T(lang, '返回占卜列表', 'Back to Divination')}
        </button>
      )}

      {!result && !loading && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-4 sm:p-8 space-y-4 sm:space-y-5"
        >
          {/* Mode switch — Full Reading vs Chart Only */}
          {session && ['bazi', 'ziwei', 'qimen', 'meihua'].includes(type) && (
            <div className="flex rounded-full border overflow-hidden w-fit mx-auto" style={{ borderColor: 'var(--border-gold)' }}>
              <button type="button" onClick={() => setPaipanOnly(false)}
                className={`px-4 sm:px-4 py-2 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors ${!paipanOnly ? 'bg-gold text-navy-950' : ''}`}
                style={paipanOnly ? { color: 'var(--text-muted)' } : {}}
              >{T(lang, '完整解盤', 'Full Reading')}</button>
              <button type="button" onClick={() => setPaipanOnly(true)}
                className={`px-4 sm:px-4 py-2 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors ${paipanOnly ? 'bg-gold text-navy-950' : ''}`}
                style={!paipanOnly ? { color: 'var(--text-muted)' } : {}}
              >{T(lang, '只排盤（免費）', 'Chart Only (free)')}</button>
            </div>
          )}

          {/* Target Person Selection — locked placeholder when signed out so
              the form's vertical layout matches the signed-in state */}
          {['bazi', 'ziwei'].includes(type) && !session && (
            <button
              type="button"
              onClick={() => router.push(`/login?next=${encodeURIComponent(`/divination/${type}`)}`)}
              className="w-full text-left border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-2 opacity-60 hover:opacity-80 hover:border-gold/40 transition-all cursor-pointer"
            >
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                👤 {T(lang, '預測對象', 'Reading For')}
              </p>
              <p className="text-white/50 text-sm">
                🔒 {T(lang, '登入後可為自己或家人起卦', 'Sign in to read for yourself or family members')}
              </p>
            </button>
          )}

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
                      {newMemberRelation === 'other' && (
                        <div>
                          <label className={labelCls}>
                            {T(lang, '具體關係', 'Specific Relationship')}
                            <span className="text-red-400 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            className={inputCls}
                            value={newMemberRelationDetail}
                            onChange={e => setNewMemberRelationDetail(e.target.value)}
                            placeholder={T(lang, '例：岳父、合作夥伴', 'e.g. father-in-law, business partner')}
                            required
                          />
                        </div>
                      )}
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

          {/* I Ching — proper three-coin cast (six tosses, supports changing lines + variant) */}
          {type === 'iching' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '請詳述您想詢問的事情...', 'Describe your question in detail...')} />
            </div>
            <div className="border border-gold/20 rounded-xl p-3 sm:p-4 bg-navy-900/50 space-y-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                🪙 {T(lang, '起卦（三枚銅錢法）', 'Cast Hexagram (Three Coin Method)')}
              </p>
              <p className="text-white/40 text-xs leading-relaxed">
                {T(lang,
                  '靜心默念所問，每次擲三枚銅錢——字面為陰（值2），背面為陽（值3）。三枚合計：6=老陰（變爻）、7=少陽、8=少陰、9=老陽（變爻）。共擲六次，從初爻到上爻。',
                  'Focus on your question. Toss 3 coins: Heads=2 (Yin), Tails=3 (Yang). Sum: 6=Old Yin (changing), 7=Young Yang, 8=Young Yin, 9=Old Yang (changing). Toss 6 times, from bottom to top.'
                )}
              </p>
              {(() => {
                const lines: { coins: number[]; value: number }[] = form.ichingLines ? JSON.parse(form.ichingLines) : []
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
                  const coins: number[] = [0, 0, 0].map(() => Math.random() < 0.5 ? 2 : 3)
                  const value = coins.reduce((a, b) => a + b, 0)
                  const newLines = [...lines, { coins, value }]
                  setField('ichingLines', JSON.stringify(newLines))
                }

                return (
                  <div className="space-y-3">
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

                    <div className="flex items-center gap-3">
                      {currentLine < 6 ? (
                        <button type="button" onClick={tossCoins}
                          className="flex-1 px-5 py-3 border border-gold/50 text-gold rounded-xl hover:border-gold hover:bg-gold/10 transition-all text-center">
                          🪙 {T(lang, `擲第${currentLine + 1}次 — ${yaoNames[currentLine]}`, `Toss #${currentLine + 1} — ${yaoNamesEn[currentLine]}`)}
                        </button>
                      ) : (
                        <div className="flex-1 px-5 py-3 border border-gold/40 bg-gold/10 text-gold rounded-xl text-center text-sm">
                          ✓ {T(lang, '六爻已成，可以解卦', 'Six lines cast — ready to consult')}
                        </div>
                      )}
                      {currentLine > 0 && (
                        <button type="button" onClick={resetIchingCast}
                          className="px-3 py-3 text-white/40 hover:text-white/70 text-xs">
                          {T(lang, '重起', 'Reset')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}
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
              <label className={labelCls}>{T(lang, '占算時間', 'Divination Time')}</label>
              <input type="datetime-local" className={inputCls} value={form.readingDateTime} onChange={e => setField('readingDateTime', e.target.value)} />
              <p className="text-white/40 text-xs mt-1">{T(lang,
                '默認為當下（看當前局勢）；若您要擇吉時行動，可改為計劃行動的時刻。',
                'Defaults to now (read current situation). If choosing an auspicious time to act, set it to your planned action time.'
              )}</p>
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

          {/* Credits — locked placeholder when signed out */}
          {!session && (
            <button
              type="button"
              onClick={() => router.push(`/login?next=${encodeURIComponent(`/divination/${type}`)}`)}
              className="w-full text-left border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-2 opacity-60 hover:opacity-80 hover:border-gold/40 transition-all cursor-pointer"
            >
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                ✨ {T(lang, '機緣', 'Karma')}
              </p>
              <p className="text-white/50 text-sm">
                🔒 {T(lang, '登入後查看剩餘機緣與本次消耗', 'Sign in to see your Karma balance and cost')}
              </p>
            </button>
          )}

          {/* Credits display.
              In paipanOnly mode the backend skips both checkCredits + early-
              returns before deductCredits (see /api/divination/route.ts:106,
              :215), so no Karma is consumed. We swap the "本次消耗 X 點"
              subscript for a "本次免費" tag so the UI matches reality. */}
          {session && credits && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  {T(lang, '✨ 機緣', '✨ Karma')}
                </span>
                <span className="text-gold font-mono font-bold">
                  {credits.credits === 999 ? '∞' : (credits.credits ?? 0)}
                  {paipanOnly ? (
                    <span className="text-emerald-400/80 text-xs ml-1 font-sans font-normal">
                      ({T(lang, '本次免費', 'free this time')})
                    </span>
                  ) : credits.costs && credits.costs[type] ? (
                    <span className="text-white/40 text-xs ml-1">
                      ({T(lang, `本次消耗 ${credits.costs[type]} 點`, `costs ${credits.costs[type]} pts`)})
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          )}

          {/* Privacy Controls — locked placeholder when signed out */}
          {!session && (
            <button
              type="button"
              onClick={() => router.push(`/login?next=${encodeURIComponent(`/divination/${type}`)}`)}
              className="w-full text-left border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-2 opacity-60 hover:opacity-80 hover:border-gold/40 transition-all cursor-pointer"
            >
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                🔒 {T(lang, '隱私設置', 'Privacy Settings')}
              </p>
              <p className="text-white/50 text-sm">
                🔒 {T(lang, '登入後可選擇是否儲存歷史記錄與生辰資訊', 'Sign in to choose what to save (history & birth info)')}
              </p>
            </button>
          )}

          {/* Privacy Controls — collapsed by default to reduce form length */}
          {session && (
            <details className="border border-gold/20 rounded-xl bg-navy-900/50 group">
              <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between text-white/60 text-xs font-semibold uppercase tracking-wider hover:text-white/80 transition-colors">
                <span>{T(lang, '🔒 隱私設置', '🔒 Privacy Settings')}</span>
                <span className="text-gold/40 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 space-y-3">

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
            </details>
          )}

          {/* PaipanOnly — locked placeholder when signed out (only for the
              types that support it server-side) */}
          {!session && ['bazi', 'ziwei', 'qimen', 'meihua'].includes(type) && (
            <label
              className="flex items-center gap-2 opacity-50 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                router.push(`/login?next=${encodeURIComponent(`/divination/${type}`)}`)
              }}
            >
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 rounded border-gold/30 accent-gold cursor-pointer"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                🔒 {T(lang, '只排盤模式（登入後可用）', 'Paipan-only mode (sign in to enable)')}
              </span>
            </label>
          )}

          {/* paipanOnly toggle moved to top of form as mode switch */}

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
                disabled={(isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)) || (type === 'liuyao' && (!form.liuyaoLines || (JSON.parse(form.liuyaoLines || '[]')).length < 6)) || (type === 'iching' && (!form.ichingLines || (JSON.parse(form.ichingLines || '[]')).length < 6))}
                className="w-full py-4 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!session
                  ? T(lang, '🔒 登入並解卦 →', '🔒 Sign in & Consult →')
                  : paipanOnly
                    ? T(lang, '排盤 →', 'Calculate →')
                    : (!isAdmin
                      ? `${T(lang, '解卦', 'Consult Oracle')} (${cost} ${T(lang, '點', 'pts')}) →`
                      : T(lang, '解卦 →', 'Consult Oracle →'))
                }
              </button>
            )
          })()}

        </motion.form>
      )}

      {/* Loading state: shown until the first LLM content token arrives.
          During the streaming reasoning phase (chart_ready received but no
          value_chunk yet) the user would otherwise stare at empty "玄機正在
          書寫…" placeholders for minutes — the loading animation is a better
          experience. For non-streaming (blocking) calls, this stays until
          result is set. */}
      {((loading && !streaming && !result) || (streaming && !hasLLMContent)) && (
        <div className="flex-1 flex flex-col">
          <LoadingOracle divinationType={type} startTime={streamStartTime || undefined} />
        </div>
      )}

      {(hasLLMContent || (!streaming && result)) && (
        <div className={`relative rounded-2xl ${streaming ? 'p-[1px] overflow-hidden' : ''}`}>
          {/* Mystical rotating border glow during streaming */}
          {streaming && (<>
            {/* Outer glow layer — slow rotation */}
            <div
              className="absolute -inset-[2px] rounded-2xl animate-[borderSpin_6s_linear_infinite] blur-[2px]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(212,168,83,0.7) 8%, transparent 16%, rgba(212,168,83,0.4) 35%, transparent 45%, rgba(212,168,83,0.8) 55%, transparent 65%, rgba(212,168,83,0.3) 80%, transparent 90%)',
              }}
            />
            {/* Inner sharp border — counter-rotate for shimmer */}
            <div
              className="absolute inset-0 rounded-2xl animate-[borderSpin_4s_linear_infinite_reverse]"
              style={{
                background: 'conic-gradient(from 180deg, transparent 0%, rgba(212,168,83,0.6) 5%, transparent 15%, rgba(212,168,83,0.5) 50%, transparent 60%, rgba(212,168,83,0.7) 80%, transparent 90%)',
              }}
            />
          </>)}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative glass-card rounded-2xl p-4 sm:p-8 w-full max-w-full overflow-x-hidden transition-shadow duration-700 ${streaming ? 'shadow-[0_0_40px_rgba(212,168,83,0.12)]' : ''}`}
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
          <ResultRenderer
            result={result ?? '{}'}
            type={resultType || type}
            readingId={readingId}
            streaming={streaming}
            subjectName={
              targetType === 'family' && selectedMemberId && selectedMemberId !== '__new__'
                ? (() => {
                    const m = familyMembers.find(m => m.id === selectedMemberId)
                    return m?.name || m?.relation || null
                  })()
                : session?.user?.name || null
            }
            birthInfo={{
              birthDate: form.birthDate,
              birthTime: form.birthTime,
              gender: form.gender,
              calendarType: form.lunarToggle,
              birthPlace: form.birthPlace,
              exactTime: form.timeMode === 'precise' ? form.exactTime : undefined,
            }}
            createdAt={new Date().toISOString()}
          />

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
                    } catch { toast.error(T(lang, '分享失敗', 'Share failed')) }
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
        </div>
      )}

      {/* Streaming mystical border animation */}
      <style jsx global>{`
        @keyframes borderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Floating Ask Master FAB — appears when result is visible */}
      {result && !streaming && (
        <button
          type="button"
          onClick={() => document.getElementById('xuanji-qa')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
          style={{ background: 'var(--gold)', color: '#0a0f1e' }}
          title={T(lang, '問問大師', 'Ask the Master')}
        >
          ☯
        </button>
      )}
    </div>
  )
}
