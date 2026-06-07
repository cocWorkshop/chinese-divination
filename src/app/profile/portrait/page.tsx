'use client'

/**
 * /profile/portrait — User-facing memory settings page.
 *
 * Sections:
 *   1. Toggle (enable/disable master memory)
 *   2. Current portrait fields (editable)
 *   3. Portrait history (collapsible — version history of extracted portraits)
 *   4. Chat sessions (collapsible — view transcripts, delete archived sessions)
 *
 * The hard-delete action for all memory lives under /profile (Account tab).
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'

const T = (lang: string, zh: string, en: string) => (lang === 'en' ? en : zh)

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

export default function PortraitPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { lang } = useLang()
  const isEn = lang === 'en'

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

  // Keep the 暫停／啟用 button in sync when memory is toggled elsewhere (the
  // master chat's memory gate also writes User.portraitEnabled). Without this,
  // accepting/declining the gate would leave this page's button stale until a
  // reload. Listens to the same event the page's own toggle dispatches.
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ enabled: boolean }>).detail
      if (!detail || typeof detail.enabled !== 'boolean') return
      setPortraitEnabled(detail.enabled)
    }
    window.addEventListener('xuanji:portraitEnabledChanged', handler as EventListener)
    return () => window.removeEventListener('xuanji:portraitEnabledChanged', handler as EventListener)
  }, [])

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
      // Notify the master chat widget so its memory-gate state refreshes without
      // waiting for the next page load. Without this, pausing memory here would
      // not block the master widget until the user reloads.
      window.dispatchEvent(
        new CustomEvent('xuanji:portraitEnabledChanged', { detail: { enabled: next } }),
      )
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
    // Fetch transcript if not already cached.
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
      // Notify the master widget — if the deleted session happened to be
      // the active one, its in-memory transcript / greeting state needs to
      // refresh. Reuses the readings-change event since both trigger
      // loadHistory() in MasterChatContext.
      window.dispatchEvent(new CustomEvent('xuanji:readingsChanged'))
    } catch {
      toast.error(T(lang, '刪除失敗', 'Delete failed'))
    } finally {
      setDeletingSessionId(null)
      setConfirmingDeleteId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 px-4 py-12 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <MysticalLoader lang={lang} />
      </div>
    )
  }

  // Only the 記憶功能 (enable/pause) card is shown to users for now. The other
  // cards (current memory editor, history, chat sessions) are hidden behind
  // this flag — kept in code so they can be re-enabled without rewriting.
  const SHOW_MEMORY_DETAILS: boolean = false

  return (
    <div className="flex-1 px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif" style={{ color: 'var(--gold)' }}>
            {T(lang, '記憶設定', 'Memory Settings')}
          </h1>
        </div>

        {/* Toggle */}
        <section
          className="glass-card rounded-xl p-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg" style={{ color: 'var(--gold)' }}>
                {T(lang, '記憶功能', 'Memory feature')}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {portraitEnabled
                  ? T(lang, '已啟用', 'Enabled')
                  : T(lang, '已暫停', 'Paused')}
              </p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: portraitEnabled ? 'var(--gold)' : 'transparent',
                color: portraitEnabled ? '#000' : 'var(--text-muted)',
                border: portraitEnabled ? 'none' : '1px solid var(--card-border)',
              }}
            >
              {portraitEnabled ? T(lang, '暫停', 'Pause') : T(lang, '啟用', 'Enable')}
            </button>
          </div>
        </section>

        {SHOW_MEMORY_DETAILS && (
        <>
        {/* Editable portrait */}
        <section
          className="glass-card rounded-xl p-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <h2 className="font-serif text-lg mb-4" style={{ color: 'var(--gold)' }}>
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
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '儲存編輯', 'Save edits')}
              </button>
            </div>
          </div>
        </section>

        {/* History */}
        <section
          className="glass-card rounded-xl p-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-serif text-lg" style={{ color: 'var(--gold)' }}>
              {T(lang, '歷史版本', 'History')} ({history.length})
            </h2>
            <span style={{ color: 'var(--text-muted)' }}>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="mt-4 space-y-3">
              {history.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {T(lang, '尚無歷史記錄', 'No history yet')}
                </p>
              )}
              {history.map((h) => {
                const triggerInfo = TRIGGER_LABELS[h.trigger] ?? TRIGGER_LABELS.auto
                return (
                  <div
                    key={h.id}
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--text-primary)' }}>v{h.version}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: triggerInfo.color, color: '#fff' }}
                        >
                          {isEn ? triggerInfo.en : triggerInfo.zh}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {h.topics.length > 0 && (
                      <div style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                        {T(lang, '主題：', 'Topics: ')}
                        {h.topics.join(', ')}
                      </div>
                    )}
                    {h.lifeContext && (
                      <div className="mt-1" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
                        {h.lifeContext.slice(0, 120)}
                        {h.lifeContext.length > 120 && '…'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Chat sessions */}
        <section
          className="glass-card rounded-xl p-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <button
            onClick={() => setShowSessions((s) => !s)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-serif text-lg" style={{ color: 'var(--gold)' }}>
              {T(lang, '對話歷史', 'Chat sessions')} ({sessions.length})
            </h2>
            <span style={{ color: 'var(--text-muted)' }}>{showSessions ? '▲' : '▼'}</span>
          </button>
          {showSessions && (
            <div className="mt-4 space-y-3">
              {sessions.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {T(lang, '尚無對話', 'No chat sessions yet')}
                </p>
              )}
              {sessions.map((s) => {
                const isExpanded = expandedSessionId === s.sessionId
                const isDeleting = deletingSessionId === s.sessionId
                const isConfirming = confirmingDeleteId === s.sessionId
                const loadingTranscript = transcriptLoadingId === s.sessionId
                const transcript = transcripts[s.sessionId]
                return (
                  <div
                    key={s.sessionId}
                    className="rounded-lg text-xs relative overflow-hidden"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    {isDeleting && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                        <span className="flex items-center gap-2 text-xs text-red-300">
                          <span className="inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                          {T(lang, '刪除中…', 'Deleting…')}
                        </span>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          {s.isActive ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ background: 'rgba(212,175,55,0.2)', color: 'var(--gold)' }}
                            >
                              {T(lang, '進行中', 'Active')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {new Date(s.endedAt).toLocaleString()}
                            </span>
                          )}
                          <span style={{ color: 'var(--text-muted)' }}>
                            {s.userTurns} {T(lang, '問', 'Q')} · {s.totalTurns} {T(lang, '則', 'turns')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTranscript(s.sessionId)}
                            disabled={isDeleting}
                            className="text-[11px] px-2 py-1 rounded transition-colors hover:bg-white/5"
                            style={{ color: 'var(--text-secondary, #d0d0d0)', border: '1px solid var(--card-border)' }}
                          >
                            {isExpanded ? T(lang, '收合', 'Collapse') : T(lang, '查看內容', 'View')}
                          </button>
                          {!s.isActive && (
                            isConfirming ? (
                              <>
                                <button
                                  onClick={() => handleDeleteSession(s.sessionId)}
                                  disabled={isDeleting}
                                  className="text-[11px] px-2 py-1 rounded font-medium transition-colors"
                                  style={{ background: '#dc2626', color: '#fff' }}
                                >
                                  {T(lang, '確認刪除', 'Confirm')}
                                </button>
                                <button
                                  onClick={() => setConfirmingDeleteId(null)}
                                  disabled={isDeleting}
                                  className="text-[11px] px-2 py-1 rounded transition-colors"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {T(lang, '取消', 'Cancel')}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmingDeleteId(s.sessionId)}
                                className="text-[11px] px-2 py-1 rounded transition-colors hover:bg-red-500/10"
                                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                              >
                                {T(lang, '刪除', 'Delete')}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      {s.firstUserMessage && (
                        <div
                          className="leading-relaxed"
                          style={{ color: 'var(--text-secondary, #d0d0d0)' }}
                        >
                          {s.firstUserMessage.length > 100
                            ? s.firstUserMessage.slice(0, 100) + '…'
                            : s.firstUserMessage}
                        </div>
                      )}
                      {isExpanded && (
                        <div
                          className="mt-3 pt-3 space-y-2 max-h-[360px] overflow-y-auto"
                          style={{ borderTop: '1px solid var(--card-border)' }}
                        >
                          {loadingTranscript && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {T(lang, '載入中…', 'Loading…')}
                            </p>
                          )}
                          {!loadingTranscript && transcript && transcript.length === 0 && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {T(lang, '此對話無可顯示內容', 'No visible turns')}
                            </p>
                          )}
                          {!loadingTranscript && transcript && transcript.map((t) => (
                            <div
                              key={t.turnIndex}
                              className="text-[11px] leading-relaxed"
                            >
                              <div
                                className="font-medium mb-0.5"
                                style={{
                                  color: t.role === 'user' ? 'var(--gold)' : 'var(--text-secondary, #d0d0d0)',
                                }}
                              >
                                {t.role === 'user'
                                  ? T(lang, '我', 'You')
                                  : T(lang, '玄機大師', 'Master')}
                              </div>
                              <div
                                className="whitespace-pre-wrap"
                                style={{ color: 'var(--text-primary, #e0e0e0)' }}
                              >
                                {t.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
        </>
        )}

      </div>
    </div>
  )
}
