'use client'

/**
 * /profile/portrait — User-facing portrait management page.
 *
 * Sections:
 *   1. Toggle (enable/disable master memory)
 *   2. Current portrait fields (editable)
 *   3. Generated prompt preview (read-only — what the LLM actually sees)
 *   4. History (collapsible)
 *   5. Action buttons: Save / Pause / Delete (visually distinct)
 *
 * Privacy posture: this page lets users see EXACTLY what the master remembers
 * about them. No hidden state. They can edit any field, pause extraction
 * without losing data, or hard-delete the portrait + history entirely.
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
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Editable form state
  const [topicsInput, setTopicsInput] = useState('')
  const [tone, setTone] = useState<'direct' | 'gentle' | 'neutral' | ''>('')
  const [depth, setDepth] = useState<'concise' | 'balanced' | 'detailed' | ''>('')
  const [lifeContext, setLifeContext] = useState('')
  const [toneNotes, setToneNotes] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      // Load both portrait and the user's portraitEnabled flag in parallel
      const [portraitRes, masterRes] = await Promise.all([
        fetch('/api/profile/portrait'),
        fetch('/api/master'),
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
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') loadAll()
  }, [status, router, loadAll])

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
      toast.success(
        next
          ? T(lang, '記憶功能已啟用', 'Memory enabled')
          : T(lang, '記憶功能已暫停', 'Memory paused'),
      )
    }
  }

  const handleDelete = async () => {
    setConfirmDelete(false)
    const res = await fetch('/api/profile/portrait', { method: 'DELETE' })
    if (res.ok) {
      toast.success(T(lang, '記憶已刪除', 'Memory deleted'))
      setPortrait(null)
      setHistory([])
      setTopicsInput('')
      setTone('')
      setDepth('')
      setLifeContext('')
      setToneNotes('')
    } else {
      toast.error(T(lang, '刪除失敗', 'Delete failed'))
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 px-4 py-12 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <MysticalLoader lang={lang} />
      </div>
    )
  }

  return (
    <div className="flex-1 px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
              {T(lang, '玄機大師的記憶', 'Master Xuanji Memory')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {T(
                lang,
                '玄機大師對你的了解，全部在這裡。你可以隨時查看、編輯、暫停或刪除。',
                "Everything Master Xuanji remembers about you, in one place. View, edit, pause, or delete anytime.",
              )}
            </p>
          </div>
          <a
            href="/divination"
            className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            {T(lang, '💬 試試大師', '💬 Try the Master')}
          </a>
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
                  ? T(
                      lang,
                      '已啟用 — 大師會自動從對話中學習你的偏好',
                      'Enabled — the Master learns your preferences from conversations',
                    )
                  : T(
                      lang,
                      '已暫停 — 已存的記憶會保留，但不會更新',
                      'Paused — existing memory is kept but not updated',
                    )}
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

        {/* Generated prompt preview */}
        {portrait?.generatedPrompt && (
          <section
            className="glass-card rounded-xl p-5"
            style={{ border: '1px solid var(--card-border)' }}
          >
            <h2 className="font-serif text-lg mb-2" style={{ color: 'var(--gold)' }}>
              {T(lang, '大師看到的提示', 'What the Master sees')}
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {T(
                lang,
                '這是大師收到的個人化上下文塊（系統提示的一部分）。',
                "This is the personalized context block injected into the master's system prompt.",
              )}
            </p>
            <div
              className="text-xs leading-relaxed whitespace-pre-line p-4 rounded-lg font-serif"
              style={{
                background: 'linear-gradient(135deg, rgba(212,168,83,0.05), rgba(212,168,83,0.02))',
                color: 'var(--text-secondary, #d0d0d0)',
                border: '1px solid var(--border-gold, rgba(212,175,55,0.2))',
              }}
            >
              {portrait.generatedPrompt}
            </div>
          </section>
        )}

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

        {/* Danger zone */}
        <section
          className="glass-card rounded-xl p-5"
          style={{ border: '1px solid #dc2626' }}
        >
          <h2 className="font-serif text-lg mb-2" style={{ color: '#ff8a8a' }}>
            {T(lang, '危險操作', 'Danger zone')}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {T(
              lang,
              '永久刪除大師對你的所有記憶，包括所有歷史版本。你的占卜歷史和個人檔案不受影響。',
              "Permanently delete all memory the Master has of you, including all history versions. Your reading history and profile are not affected.",
            )}
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#dc2626', color: '#fff' }}
          >
            {T(lang, '永久刪除記憶', 'Permanently delete memory')}
          </button>
        </section>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="max-w-md rounded-xl p-6"
            style={{
              background: 'var(--card-bg, #1a1a2e)',
              border: '1px solid #dc2626',
            }}
          >
            <h3 className="font-serif text-lg mb-3" style={{ color: '#ff8a8a' }}>
              {T(lang, '確定要刪除？', 'Are you sure?')}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary, #d0d0d0)' }}>
              {T(
                lang,
                '這將永久刪除大師對你的所有記憶（{count} 個歷史版本）。無法復原。',
                "This will permanently delete all memory the Master has of you ({count} history versions). Cannot be undone.",
              ).replace('{count}', String(history.length))}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--card-border)',
                }}
              >
                {T(lang, '取消', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                {T(lang, '確認刪除', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
