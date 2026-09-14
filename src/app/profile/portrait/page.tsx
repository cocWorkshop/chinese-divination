'use client'

/**
 * /profile/portrait — User-facing memory settings page.
 *
 * Sections:
 *   1. Top Navigation & Breadcrumbs Bar (Dual-path returns to Master & Divination)
 *   2. Contextual Arrival Banner (active connection to Master Xuanji)
 *   3. Toggle (enable/disable master memory) with .oriental-sanctuary-card
 *   4. Current portrait fields (editable, gated)
 *   5. Portrait history (collapsible, gated)
 *   6. Chat sessions (collapsible, gated)
 *   7. Mobile Sticky Bottom Bar (Thumb Zone ergonomics)
 */

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { publish, subscribe } from '@/lib/events'
import { useLang } from '@/components/LanguageContext'
import { useMasterChat } from '@/components/master/MasterChatContext'
import MysticalLoader from '@/components/MysticalLoader'
import { MasterSageIcon, DivinationIcon } from '@/components/DivinationIcons'
import { T } from '@/lib/i18n'

interface PortraitData {
  version: number
  topics: string[]
  preferences: {
    tone?: 'direct' | 'gentle' | 'neutral'
    depth?: 'concise' | 'balanced' | 'detailed'
    language?: 'zh-TW' | 'en'
  }
  lifeContext: string | null
  toneNotes: string | null
  generatedPrompt: string | null
  lastExtractedAt?: string
  lastTurnIndexCovered?: number
  lastManualEditAt?: string | null
}

interface HistoryEntry {
  id: string
  version: number
  topics: string[]
  preferences: PortraitData['preferences']
  lifeContext: string | null
  toneNotes: string | null
  trigger: 'auto' | 'manual' | 'admin' | 'restore'
  createdAt: string
}

interface ChatSessionSummary {
  sessionId: string
  startedAt: string
  endedAt: string
  totalTurns: number
  userTurns: number
  isActive: boolean
  firstUserMessage: string | null
}

interface TranscriptTurn {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  turnIndex: number
}

const TRIGGER_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  auto: { zh: '自動更新', en: 'Auto', color: '#888' },
  manual: { zh: '手動編輯', en: 'Manual edit', color: '#4a9eff' },
  admin: { zh: '管理員', en: 'Admin', color: '#f59e0b' },
  restore: { zh: '還原', en: 'Restore', color: '#22c55e' },
}

function PortraitContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const returnUrl = searchParams.get('returnUrl')

  const { data: session, status } = useSession()
  const { lang } = useLang()
  const isEn = lang === 'en'
  const { setShape } = useMasterChat()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portraitEnabled, setPortraitEnabled] = useState(true)
  const [portrait, setPortrait] = useState<PortraitData | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Chat-session management state
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptTurn[]>>({})
  const [transcriptLoadingId, setTranscriptLoadingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  // Editable form state
  const [topicsInput, setTopicsInput] = useState('')
  const [tone, setTone] = useState<'direct' | 'gentle' | 'neutral' | ''>('')
  const [depth, setDepth] = useState<'concise' | 'balanced' | 'detailed' | ''>('')
  const [lifeContext, setLifeContext] = useState('')
  const [toneNotes, setToneNotes] = useState('')

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/master/sessions', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { sessions?: ChatSessionSummary[] }
      setSessions(data.sessions ?? [])
    } catch {
      /* non-fatal — the section renders empty */
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      // Load portrait, master flags, and chat sessions in parallel
      const [portraitRes, masterRes] = await Promise.all([
        fetch('/api/profile/portrait'),
        fetch('/api/master'),
        loadSessions(),
      ])
      if (portraitRes.ok) {
        const data = await portraitRes.json()
        setPortrait(data.portrait)
        setHistory(data.history ?? [])
        if (data.portrait) {
          setTopicsInput((data.portrait.topics ?? []).join(', '))
          setTone(data.portrait.preferences?.tone ?? '')
          setDepth(data.portrait.preferences?.depth ?? '')
          setLifeContext(data.portrait.lifeContext ?? '')
          setToneNotes(data.portrait.toneNotes ?? '')
        }
      }
      if (masterRes.ok) {
        const m = await masterRes.json()
        setPortraitEnabled(m.portraitEnabled ?? true)
      }
    } finally {
      setLoading(false)
    }
  }, [loadSessions])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') loadAll()
  }, [status, router, loadAll])

  // Keep the 暫停／啟用 button in sync when memory is toggled elsewhere
  useEffect(() => {
    return subscribe('xuanji:portraitEnabledChanged', (detail) => {
      if (typeof detail?.enabled !== 'boolean') return
      setPortraitEnabled(detail.enabled)
    })
  }, [])

  const handleReturnToMaster = () => {
    setShape('expanded')
    if (returnUrl) {
      router.push(returnUrl)
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/divination')
    }
  }

  const handleReturnToDivination = () => {
    router.push('/divination')
  }

  const handleBack = () => {
    if (from === 'master') {
      handleReturnToMaster()
      return
    }
    if (returnUrl) {
      router.push(returnUrl)
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/divination')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const topics = topicsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      const res = await fetch('/api/profile/portrait', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics,
          preferences: { tone: tone || undefined, depth: depth || undefined },
          lifeContext: lifeContext || null,
          toneNotes: toneNotes || null,
        }),
      })
      if (res.ok) {
        toast.success(T(lang, '已儲存', 'Saved'))
        await loadAll()
      } else {
        toast.error(T(lang, '儲存失敗', 'Save failed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async () => {
    const next = !portraitEnabled
    setPortraitEnabled(next)
    const res = await fetch('/api/profile/portrait/enabled', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    })
    if (!res.ok) {
      setPortraitEnabled(!next)
      toast.error(T(lang, '切換失敗', 'Toggle failed'))
    } else {
      publish('xuanji:portraitEnabledChanged', { enabled: next })
      toast.success(
        next
          ? T(lang, '記憶功能已啟用', 'Memory enabled')
          : T(lang, '記憶功能已暫停', 'Memory paused'),
      )
    }
  }

  const toggleTranscript = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null)
      return
    }
    setExpandedSessionId(sessionId)
    if (!transcripts[sessionId]) {
      setTranscriptLoadingId(sessionId)
      try {
        const res = await fetch(`/api/master/sessions/${sessionId}`, { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as { messages: TranscriptTurn[] }
          setTranscripts((prev) => ({ ...prev, [sessionId]: data.messages }))
        } else {
          toast.error(T(lang, '載入失敗', 'Load failed'))
          setExpandedSessionId(null)
        }
      } catch {
        toast.error(T(lang, '載入失敗', 'Load failed'))
        setExpandedSessionId(null)
      } finally {
        setTranscriptLoadingId(null)
      }
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSessionId(sessionId)
    try {
      const res = await fetch(`/api/master/sessions/${sessionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      setTranscripts((prev) => {
        const next = { ...prev }
        delete next[sessionId]
        return next
      })
      if (expandedSessionId === sessionId) setExpandedSessionId(null)
      toast.success(T(lang, '已刪除', 'Deleted'))
      publish('xuanji:readingsChanged')
    } catch {
      toast.error(T(lang, '刪除失敗', 'Delete failed'))
    } finally {
      setDeletingSessionId(null)
      setConfirmingDeleteId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 px-4 py-16 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <MysticalLoader lang={lang} />
      </div>
    )
  }

  // Hidden behind flag — preserved for future deep management
  const SHOW_MEMORY_DETAILS: boolean = false

  return (
    <div className="flex-1 px-4 py-8 sm:py-12 pb-32 sm:pb-20" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(212,168,83,0.16)]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif transition-colors hover:bg-[rgba(212,168,83,0.1)] text-[var(--gold)] border border-[rgba(212,168,83,0.25)] min-h-[36px]"
              title={T(lang, '返回上一頁', 'Go back')}
            >
              <span className="text-sm">←</span>
              <span>{T(lang, '返回', 'Back')}</span>
            </button>
            <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-serif" aria-label="Breadcrumb">
              <Link href="/divination" className="hover:text-[var(--gold)] transition-colors">
                {T(lang, '占卜大廳', 'Divination')}
              </Link>
              <span>/</span>
              <button
                onClick={handleReturnToMaster}
                className="hover:text-[var(--gold)] transition-colors inline-flex items-center gap-1 text-[var(--text-muted)]"
              >
                <MasterSageIcon size={13} color="currentColor" />
                <span>{T(lang, '玄機大師', 'Master Xuanji')}</span>
              </button>
              <span>/</span>
              <span className="text-[var(--gold)]">{T(lang, '記憶設定', 'Memory Settings')}</span>
            </nav>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleReturnToMaster}
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all border border-[rgba(212,168,83,0.3)] hover:border-[rgba(212,168,83,0.6)] bg-[rgba(212,168,83,0.06)] text-[var(--gold)] min-h-[36px] hover:shadow-[0_0_12px_rgba(212,168,83,0.15)]"
            >
              <MasterSageIcon size={15} color="var(--gold)" />
              <span>{T(lang, '返回玄機大師', 'Back to Master')}</span>
            </button>
            <Link
              href="/divination"
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all border border-[rgba(212,168,83,0.2)] hover:border-[rgba(212,168,83,0.4)] text-[var(--text-muted)] hover:text-[var(--gold)] min-h-[36px]"
            >
              <DivinationIcon type="bazi" size={14} color="currentColor" />
              <span>{T(lang, '占卜大廳', 'Divination')}</span>
            </Link>
          </div>
        </div>

        {/* Contextual Master Arrival Banner */}
        {(from === 'master' || returnUrl) && (
          <section className="oriental-sanctuary-card p-4 sm:p-5 border border-[rgba(212,168,83,0.3)] bg-gradient-to-r from-[rgba(212,168,83,0.1)] to-[rgba(13,21,38,0.85)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-full bg-[rgba(212,168,83,0.12)] border border-[rgba(212,168,83,0.3)] flex-shrink-0">
                  <MasterSageIcon size={26} color="var(--gold)" />
                </span>
                <div>
                  <div className="font-serif text-sm text-[var(--gold)] font-medium flex items-center gap-2">
                    <span>{T(lang, '玄機大師對談連線中', 'Connected to Master Xuanji')}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {T(
                      lang,
                      '您正在此調整大師記憶權限。調整完成後，可立即返回繼續延續問測心流。',
                      'You are adjusting memory permissions. Once done, return immediately to resume your chat.'
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleReturnToMaster}
                className="px-4 py-2.5 rounded-xl text-xs font-serif font-medium transition-all min-h-[44px] flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.98] flex-shrink-0"
                style={{ background: 'var(--gold)', color: '#080c17' }}
              >
                <span>✦</span>
                <span>{T(lang, '立即返回與大師對話', 'Return to Chat with Master')}</span>
              </button>
            </div>
          </section>
        )}

        {/* Header Title Area */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif text-[var(--gold)]">
            {T(lang, '大師記憶管治', 'Master Memory Governance')}
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-serif tracking-widest">
            {T(lang, '掌造化之機 · 存問道之心 · 守玄門之約', 'Discerning destiny, holding sacred memory')}
          </p>
        </div>

        {/* Memory Toggle Card */}
        <section className="oriental-sanctuary-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-base sm:text-lg text-[var(--gold)]">
                  {T(lang, '記憶功能狀態', 'Memory Feature Status')}
                </h2>
                {portraitEnabled ? (
                  <span className="stamp-gold text-[10px]">{T(lang, '已啟用 · 運作中', 'Active')}</span>
                ) : (
                  <span className="stamp-vermillion text-[10px]">{T(lang, '已暫停 · 封存中', 'Paused')}</span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xl">
                {portraitEnabled
                  ? T(
                      lang,
                      '大師當前正記住您的命盤特質、近期問測主題與對話偏好，提供融貫通達的命理建議。',
                      'The Master remembers your chart traits, topics, and preferences to provide personalized guidance.'
                    )
                  : T(
                      lang,
                      '記憶功能已暫停。大師對話將退回至每次獨立問答狀態，不再讀取或寫入歷史特徵。',
                      'Memory is paused. The Master will operate on a per-session stateless basis.'
                    )}
              </p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className="px-5 py-2.5 rounded-xl text-xs font-serif font-medium transition-all min-h-[44px] flex-shrink-0 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              style={{
                background: portraitEnabled ? 'rgba(192, 57, 43, 0.15)' : 'var(--gold)',
                color: portraitEnabled ? '#ef4444' : '#080c17',
                border: portraitEnabled ? '1px solid rgba(192, 57, 43, 0.4)' : 'none',
              }}
            >
              {portraitEnabled
                ? T(lang, '暫停記憶功能', 'Pause Memory')
                : T(lang, '啟用大師記憶', 'Enable Memory')}
            </button>
          </div>

          <div className="verse-callout text-xs text-[var(--text-muted)] mt-2">
            {T(
              lang,
              '「存神知化，德之盛也。」玄機大師記憶僅用於深化易學諮詢與個人化推演，嚴守道門隱私，絕不作他用，您可隨時在此暫停。若需徹底銷毀所有記憶檔案，可至個人中心執行硬刪除。',
              'Master memory is strictly utilized for contextual astrological interpretation. You may pause anytime. For full deletion, use the Account tab in your profile.'
            )}
          </div>

          {/* Quick Exit Hub within the Card */}
          <div className="pt-4 border-t border-[rgba(212,168,83,0.14)] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-muted)] font-serif">
              {T(lang, '快捷前往：', 'Quick exits:')}
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleReturnToMaster}
                className="px-4 py-2 rounded-xl text-xs font-serif font-medium transition-all min-h-[40px] flex items-center gap-1.5"
                style={{ background: 'var(--gold)', color: '#080c17' }}
              >
                <MasterSageIcon size={16} color="#080c17" />
                <span>{T(lang, '返回玄機大師對話', 'Back to Master')}</span>
              </button>
              <Link
                href="/divination"
                className="px-4 py-2 rounded-xl text-xs font-serif transition-all min-h-[40px] flex items-center gap-1.5 border border-[rgba(212,168,83,0.25)] text-[var(--gold)] hover:bg-[rgba(212,168,83,0.08)]"
              >
                <DivinationIcon type="bazi" size={15} color="currentColor" />
                <span>{T(lang, '前往占卜大廳', 'Go to Divination')}</span>
              </Link>
            </div>
          </div>
        </section>

        {SHOW_MEMORY_DETAILS && (
          <>
            {/* Editable portrait */}
            <section
              className="oriental-sanctuary-card p-5 space-y-4"
              style={{ border: '1px solid var(--card-border)' }}
            >
              <h2 className="font-serif text-lg text-[var(--gold)]">
                {T(lang, '當前記憶', 'Current memory')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {T(lang, '關注主題（用逗號分隔）', 'Topics (comma-separated)')}
                  </label>
                  <input
                    type="text"
                    value={topicsInput}
                    onChange={(e) => setTopicsInput(e.target.value)}
                    placeholder={T(lang, '例如：career, health, family', 'e.g. career, health, family')}
                    disabled={!portraitEnabled}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--card-border)',
                      opacity: portraitEnabled ? 1 : 0.5,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      {T(lang, '回應語氣', 'Tone')}
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as typeof tone)}
                      disabled={!portraitEnabled}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--card-border)',
                        opacity: portraitEnabled ? 1 : 0.5,
                      }}
                    >
                      <option value="">{T(lang, '預設', 'Default')}</option>
                      <option value="direct">{T(lang, '直接', 'Direct')}</option>
                      <option value="gentle">{T(lang, '溫和', 'Gentle')}</option>
                      <option value="neutral">{T(lang, '中性', 'Neutral')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      {T(lang, '回應深度', 'Depth')}
                    </label>
                    <select
                      value={depth}
                      onChange={(e) => setDepth(e.target.value as typeof depth)}
                      disabled={!portraitEnabled}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--card-border)',
                        opacity: portraitEnabled ? 1 : 0.5,
                      }}
                    >
                      <option value="">{T(lang, '預設', 'Default')}</option>
                      <option value="concise">{T(lang, '簡潔', 'Concise')}</option>
                      <option value="balanced">{T(lang, '平衡', 'Balanced')}</option>
                      <option value="detailed">{T(lang, '詳細', 'Detailed')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {T(lang, '生活背景（穩定的事實，不超過 200 字）', 'Life context (stable facts, max ~200 chars)')}
                  </label>
                  <textarea
                    value={lifeContext}
                    onChange={(e) => setLifeContext(e.target.value)}
                    disabled={!portraitEnabled}
                    rows={3}
                    maxLength={600}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--card-border)',
                      opacity: portraitEnabled ? 1 : 0.5,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {T(lang, '回應方式備註（簡短，不超過 100 字）', 'Tone notes (short, max ~100 chars)')}
                  </label>
                  <textarea
                    value={toneNotes}
                    onChange={(e) => setToneNotes(e.target.value)}
                    disabled={!portraitEnabled}
                    rows={2}
                    maxLength={300}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--card-border)',
                      opacity: portraitEnabled ? 1 : 0.5,
                    }}
                  />
                </div>

                {portrait?.lastManualEditAt && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {T(lang, '上次手動編輯：', 'Last manual edit: ')}
                    {new Date(portrait.lastManualEditAt).toLocaleString()}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !portraitEnabled}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: 'var(--gold)',
                      color: '#000',
                      opacity: saving || !portraitEnabled ? 0.5 : 1,
                    }}
                  >
                    {saving ? T(lang, '儲存中…', 'Saving…') : T(lang, '儲存變更', 'Save changes')}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

      </div>

      {/* Mobile Sticky Bottom Bar — Ergonomic Thumb Zone */}
      <aside
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080c17]/95 backdrop-blur-md border-t border-[rgba(212,168,83,0.25)] p-3 px-4 shadow-2xl"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label={T(lang, '快捷導航', 'Quick navigation')}
      >
        <div className="flex items-center gap-2.5 max-w-lg mx-auto">
          <button
            onClick={handleReturnToMaster}
            className="flex-1 min-h-[48px] rounded-xl text-xs font-serif font-medium flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
            style={{ background: 'var(--gold)', color: '#080c17' }}
          >
            <MasterSageIcon size={18} color="#080c17" />
            <span>{T(lang, '返回玄機大師對談', 'Return to Master')}</span>
          </button>
          <button
            onClick={handleReturnToDivination}
            className="min-h-[48px] px-4 rounded-xl text-xs font-serif flex items-center justify-center gap-1.5 transition-all border border-[rgba(212,168,83,0.3)] bg-[rgba(13,21,38,0.8)] text-[var(--gold)] active:scale-[0.98]"
          >
            <DivinationIcon type="bazi" size={16} color="currentColor" />
            <span>{T(lang, '占卜大廳', 'Divination')}</span>
          </button>
        </div>
      </aside>
    </div>
  )
}

export default function PortraitPage() {
  const { lang } = useLang()
  return (
    <Suspense
      fallback={
        <div className="flex-1 px-4 py-16 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <MysticalLoader lang={lang} />
        </div>
      }
    >
      <PortraitContent />
    </Suspense>
  )
}
