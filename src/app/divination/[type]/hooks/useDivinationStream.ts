'use client'

import { useState, useRef, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { reportError, catchAndReport } from '@/lib/errorReporter'
import { mutateAtPath } from '../lib/mutateAtPath'
import {
  T,
  type DivinationFormState,
  type CreditsInfo,
  type CachedReading,
} from '../constants'

interface StreamDeps {
  type: string
  lang: string
  session: unknown
  form: DivinationFormState
  birthLat: number | null
  birthLng: number | null
  isSouthernHemisphere: boolean
  targetType: 'self' | 'family'
  selectedMemberId: string
  newMemberRelation: string
  newMemberRelationDetail: string
  newMemberName: string
  saveProfile: boolean
  saveHistory: boolean
  paipanOnly: boolean
  llmTimeoutMs: number
  setCredits: Dispatch<SetStateAction<CreditsInfo | null>>
}

/**
 * Owns the reading lifecycle: the two-step submit (init → streaming SSE),
 * the path-tagged partial-result assembly, polling fallback, and the
 * bazi/ziwei cache dialog. Returns the state the result/loading stages
 * render plus the handlers the form's submit button calls.
 */
export function useDivinationStream(deps: StreamDeps) {
  const {
    type, lang, session, form, birthLat, birthLng, isSouthernHemisphere,
    targetType, selectedMemberId, newMemberRelation, newMemberRelationDetail,
    newMemberName, saveProfile, saveHistory, paipanOnly, llmTimeoutMs, setCredits,
  } = deps
  const router = useRouter()

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
  const [readingId, setReadingId] = useState<string | null>(null)
  // Bazi cache dialog
  const [showCacheDialog, setShowCacheDialog] = useState(false)
  const [cachedReading, setCachedReading] = useState<CachedReading | null>(null)

  // Cancellation: when the user backs out of the result view we abort any
  // in-flight stream and tell the post-stream / catch logic to bail so it
  // doesn't re-populate the result or fire an error toast.
  const abortRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

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
    cancelledRef.current = false
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
    // Notify the global Xuanji Master widget that a reading just completed, so it
    // releases its "reading in progress" state, swaps the CTA card, and pulls the
    // new reading into context. MUST fire on every success path — including the
    // polling fallbacks below, which previously left the master stuck waiting.
    const notifyReadingComplete = (id: string | null) => {
      if (id && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xuanji:readingComplete', { detail: { readingId: id, type } }))
      }
    }

    try {
      const fetchController = new AbortController()
      abortRef.current = fetchController
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
          notifyReadingComplete(savedId)
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
            notifyReadingComplete(found.id)
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
        if (cancelledRef.current) break
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

      if (cancelledRef.current) { setLoading(false); return }
      if (streamError) {
        toast.error(streamError)
        reportError({ endpoint: '/api/divination', error: streamError, context: `type=${type}, stream` })
      } else if (finalReading) {
        // Replace partial with the server-validated final result (Zod-
        // approved + merge-injected fields like trueSolarTime).
        setResult(finalReading.result)
        const savedId = finalReading.id || pendingReadingId || null
        setReadingId(savedId)
        notifyReadingComplete(savedId)
        fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
      } else if (pendingReadingId) {
        // Stream ended without `done` event — fall back to polling.
        const found = await pollForReadingById(pendingReadingId)
        if (found && found.status === 'completed') {
          setResult(found.result)
          setReadingId(found.id)
          notifyReadingComplete(found.id)
          toast.success(T(lang, '結果已就緒', 'Result ready!'))
          fetch('/api/credits').then(r => r.json()).then(setCredits).catch(catchAndReport('/api/credits'))
        } else {
          toast.error(T(lang, '請求超時，請重試', 'Request timed out, please retry'))
        }
      }
    } catch (e) {
      if (cancelledRef.current) { setLoading(false); return }
      const msg = e instanceof Error ? e.message : 'Network error'
      setStreaming(false)
      if (pendingReadingId) {
        toast(T(lang, '⏳ 連接中斷，等待伺服器處理結果...', '⏳ Connection lost, waiting for server result...'), { icon: '🔄', duration: 5000 })
        const found = await pollForReadingById(pendingReadingId)
        if (found && found.status === 'completed') {
          setResult(found.result)
          setResultType(type)
          setReadingId(found.id)
          notifyReadingComplete(found.id)
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

  // Back out of the result/generating view to the (still-filled) form.
  // Aborts any in-flight stream and clears all result + generating state so
  // the stage gate (showResult / showGenerating) falls back to stage 1.
  const resetToForm = () => {
    cancelledRef.current = true
    abortRef.current?.abort()
    setLoading(false)
    setStreaming(false)
    setHasLLMContent(false)
    setStreamStartTime(null)
    setResult(null)
    setResultType('')
    setReadingId(null)
    setShowCacheDialog(false)
  }

  const handleNewReading = () => {
    setShowCacheDialog(false)
    doSubmit()
  }

  return {
    loading, streaming, hasLLMContent, streamStartTime,
    result, setResult, resultType, readingId, setReadingId,
    showCacheDialog, setShowCacheDialog, cachedReading,
    doSubmit, handleSubmit, handleViewCached, handleNewReading, resetToForm,
  }
}

export type UseDivinationStream = ReturnType<typeof useDivinationStream>
