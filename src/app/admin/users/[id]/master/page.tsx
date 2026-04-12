'use client'

/**
 * Admin debug page — /admin/users/[id]/master
 *
 * Read-mostly view of one user's master memory state. Sections A-H from
 * §10.5 of docs/master-portrait-system-plan.md. Every load fetches via
 * /api/admin/master-debug/[userId] which writes a view_master_debug row
 * to AdminAccessLog.
 *
 * Destructive admin actions are gated behind explicit confirmation modals
 * with required reason text. The actions and the access log are surfaced
 * inline so other admins can see what was done.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface DebugPayload {
  target: {
    id: string
    email: string
    name: string | null
    language: string
    createdAt: string
    credits: number
    usageMaster: number
    portraitEnabled: boolean
    masterMemoryDisclosureSeenAt: string | null
  }
  portrait: {
    version: number
    topics: string[]
    preferences: Record<string, unknown>
    lifeContext: string | null
    toneNotes: string | null
    generatedPrompt: string | null
    lastExtractedAt: string
    lastTurnIndexCovered: number
    lastManualEditAt: string | null
    createdAt: string
    updatedAt: string
  } | null
  portraitHistory: Array<{
    id: string
    version: number
    topics: string[]
    trigger: string
    createdAt: string
  }>
  chat: {
    activeSessionId: string | null
    stats: {
      total: number
      userMessages: number
      assistantMessages: number
      archived: number
      totalEstimatedTokens: number
      earliest: string | null
      latest: string | null
      distinctSessions: number
    }
    recentMessages: Array<{
      id: string
      sessionId: string
      turnIndex: number
      role: string
      content: string | null
      tokenCount: number | null
      archivedAt: string | null
      createdAt: string
    }>
  }
  livePreview: {
    systemPrompt: string
    systemPromptLength: number
    compressedHistory: {
      messages: Array<{ role: string; content: string | null }>
      summarized: boolean
      estimatedTokens: number
    }
  }
  llmLogs: Array<{
    id: string
    model: string
    status: string
    errorMessage: string | null
    latencyMs: number
    createdAt: string
    inputPreview: string | null
    outputPreview: string | null
  }>
  accessLog: Array<{
    id: string
    adminUserId: string
    adminEmail: string | null
    action: string
    reason: string | null
    createdAt: string
  }>
}

export default function MasterDebugPage() {
  const { id: userId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [data, setData] = useState<DebugPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action state
  const [resetReason, setResetReason] = useState('')
  const [clearReason, setClearReason] = useState('')
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [dryRun, setDryRun] = useState<{
    rawOutput?: string
    proposed?: unknown
    parseError?: string | null
    llmError?: string | null
  } | null>(null)
  const [dryRunLoading, setDryRunLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/master-debug/${userId}`)
      if (res.status === 403) {
        setError('Admin access required')
        return
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        return
      }
      const payload = (await res.json()) as DebugPayload
      setData(payload)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') load()
  }, [status, router, load])

  const handleResetPortrait = async () => {
    const reason = resetReason.trim()
    if (!reason) {
      toast.error('Reason is required')
      return
    }
    if (!confirm('Permanently delete portrait + history for this user?')) return
    const res = await fetch(`/api/admin/master-debug/${userId}/reset-portrait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      toast.success('Portrait reset')
      setResetReason('')
      await load()
    } else {
      toast.error('Reset failed')
    }
  }

  const handleClearChat = async () => {
    const reason = clearReason.trim()
    if (!reason) {
      toast.error('Reason is required')
      return
    }
    if (!confirm('Permanently delete ALL chat history for this user?')) return
    const res = await fetch(`/api/admin/master-debug/${userId}/clear-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      toast.success('Chat cleared')
      setClearReason('')
      await load()
    } else {
      toast.error('Clear failed')
    }
  }

  const handleDryRun = async () => {
    setDryRunLoading(true)
    setDryRun(null)
    try {
      const res = await fetch(`/api/admin/master-debug/${userId}/extract-dry-run`, { method: 'POST' })
      const payload = await res.json()
      setDryRun(payload)
    } catch (e) {
      toast.error('Dry-run failed: ' + (e as Error).message)
    } finally {
      setDryRunLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>
  if (error) return <div className="p-8 text-sm text-red-400">Error: {error}</div>
  if (!data) return null

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto space-y-6 text-sm" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif" style={{ color: 'var(--gold)' }}>
          Master Debug — {data.target.email}
        </h1>
        <button
          onClick={() => router.push('/admin/users')}
          className="text-xs underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to users
        </button>
      </div>

      {/* A. Identity + flags */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>A. Identity</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div><span style={{ color: 'var(--text-muted)' }}>id:</span> <code>{data.target.id}</code></div>
          <div><span style={{ color: 'var(--text-muted)' }}>email:</span> {data.target.email}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>name:</span> {data.target.name ?? '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>lang:</span> {data.target.language}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>created:</span> {new Date(data.target.createdAt).toLocaleString()}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>credits:</span> {data.target.credits}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>usageMaster:</span> {data.target.usageMaster}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>portraitEnabled:</span> {String(data.target.portraitEnabled)}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>disclosureSeen:</span> {data.target.masterMemoryDisclosureSeenAt ? new Date(data.target.masterMemoryDisclosureSeenAt).toLocaleString() : 'no'}</div>
        </div>
      </section>

      {/* B. Portrait */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>B. Portrait (current)</h2>
        {!data.portrait ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No portrait yet for this user.</p>
        ) : (
          <div className="space-y-2 text-xs">
            <div>v{data.portrait.version} · last extracted {new Date(data.portrait.lastExtractedAt).toLocaleString()}</div>
            <div><strong>Topics:</strong> {data.portrait.topics.join(', ') || '—'}</div>
            <div><strong>Preferences:</strong> <code>{JSON.stringify(data.portrait.preferences)}</code></div>
            {data.portrait.lifeContext && <div><strong>Life context:</strong> {data.portrait.lifeContext}</div>}
            {data.portrait.toneNotes && <div><strong>Tone notes:</strong> {data.portrait.toneNotes}</div>}
            <div style={{ color: 'var(--text-muted)' }}>cursor: turn {data.portrait.lastTurnIndexCovered}</div>
            {data.portrait.generatedPrompt && (
              <details className="mt-2">
                <summary className="cursor-pointer" style={{ color: 'var(--gold)' }}>Generated prompt block</summary>
                <pre className="mt-2 p-3 rounded text-xs whitespace-pre-wrap" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>{data.portrait.generatedPrompt}</pre>
              </details>
            )}
          </div>
        )}
      </section>

      {/* C. Portrait history */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>C. Portrait history ({data.portraitHistory.length})</h2>
        {data.portraitHistory.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No history yet.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {data.portraitHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <span>v{h.version}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--accent-bg)', color: 'var(--gold)' }}>{h.trigger}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleString()}</span>
                <span>topics: {h.topics.join(', ') || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* D. Chat stats + recent */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>D. Chat</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
          <div><span style={{ color: 'var(--text-muted)' }}>active session:</span> <code>{data.chat.activeSessionId ?? 'none'}</code></div>
          <div><span style={{ color: 'var(--text-muted)' }}>distinct sessions:</span> {data.chat.stats.distinctSessions}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>total messages:</span> {data.chat.stats.total}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>archived:</span> {data.chat.stats.archived}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>est. total tokens:</span> {data.chat.stats.totalEstimatedTokens}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>last activity:</span> {data.chat.stats.latest ? new Date(data.chat.stats.latest).toLocaleString() : '—'}</div>
        </div>
        <details>
          <summary className="cursor-pointer text-xs" style={{ color: 'var(--gold)' }}>Recent 50 messages</summary>
          <div className="mt-2 space-y-1 text-[11px]">
            {data.chat.recentMessages.map((m) => (
              <div key={m.id} className="flex gap-2">
                <span style={{ color: 'var(--text-muted)' }}>[{m.turnIndex}]</span>
                <span style={{ color: m.role === 'user' ? 'var(--gold)' : 'var(--text-secondary, #d0d0d0)' }}>{m.role}:</span>
                <span className="flex-1 truncate">{m.content?.slice(0, 200) ?? '—'}</span>
                {m.archivedAt && <span style={{ color: 'var(--text-muted)' }}>(archived)</span>}
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* E. Live preview */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>E. Live preview (what the master would see right now)</h2>
        <div className="text-xs mb-2">
          Compressed history: {data.livePreview.compressedHistory.messages.length} messages,{' '}
          ~{data.livePreview.compressedHistory.estimatedTokens} tokens
          {data.livePreview.compressedHistory.summarized && ' (summarized)'}
        </div>
        <button
          onClick={() => setShowSystemPrompt((s) => !s)}
          className="text-xs underline"
          style={{ color: 'var(--gold)' }}
        >
          {showSystemPrompt ? 'Hide' : 'Show'} system prompt ({data.livePreview.systemPromptLength} chars)
        </button>
        {showSystemPrompt && (
          <pre className="mt-2 p-3 rounded text-[11px] whitespace-pre-wrap max-h-96 overflow-y-auto" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            {data.livePreview.systemPrompt}
          </pre>
        )}
      </section>

      {/* F. LLM logs */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>F. LLM logs (last 20 master calls)</h2>
        {data.llmLogs.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No master endpoint calls logged.</p>
        ) : (
          <div className="space-y-1 text-[11px]">
            {data.llmLogs.map((l) => (
              <div key={l.id} className="flex gap-3">
                <span style={{ color: l.status === 'success' ? '#22c55e' : '#ff8a8a' }}>{l.status}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(l.createdAt).toLocaleString()}</span>
                <span>{l.latencyMs}ms</span>
                <span>{l.model}</span>
                <span className="flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{l.errorMessage || l.inputPreview?.slice(0, 100)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* G. Admin actions — collapsed by default to prevent accidental clicks */}
      <section className="rounded-xl p-4" style={{ border: '1px solid #dc2626' }}>
        <details>
        <summary className="font-serif text-base cursor-pointer list-none flex items-center justify-between" style={{ color: '#ff8a8a' }}>
          <span>G. Admin actions</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>▼ expand</span>
        </summary>

        <div className="space-y-4 mt-3">
          {/* Dry-run extraction */}
          <div>
            <button
              onClick={handleDryRun}
              disabled={dryRunLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: 'var(--gold)', color: '#000' }}
            >
              {dryRunLoading ? 'Running…' : 'Dry-run portrait extraction (preview only)'}
            </button>
            {dryRun && (
              <details className="mt-2" open>
                <summary className="cursor-pointer text-xs" style={{ color: 'var(--gold)' }}>Dry-run result</summary>
                <pre className="mt-2 p-3 rounded text-[11px] whitespace-pre-wrap max-h-96 overflow-y-auto" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  {JSON.stringify(dryRun, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <hr style={{ borderColor: 'var(--card-border)' }} />

          {/* Reset portrait */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Reason for resetting portrait (required, recorded in audit log):
            </label>
            <input
              type="text"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-xs mb-2"
              style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
              placeholder="e.g. user requested via support ticket #1234"
            />
            <button
              onClick={handleResetPortrait}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#dc2626', color: '#fff' }}
            >
              Reset portrait + history
            </button>
          </div>

          <hr style={{ borderColor: 'var(--card-border)' }} />

          {/* Clear chat */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Reason for clearing chat (required):
            </label>
            <input
              type="text"
              value={clearReason}
              onChange={(e) => setClearReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-xs mb-2"
              style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
              placeholder="e.g. user reported master is stuck on bad context"
            />
            <button
              onClick={handleClearChat}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#dc2626', color: '#fff' }}
            >
              Clear all chat history
            </button>
          </div>
        </div>
        </details>
      </section>

      {/* H. Access log */}
      <section className="rounded-xl p-4" style={{ border: '1px solid var(--card-border)' }}>
        <h2 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>H. Admin access log for this user</h2>
        {data.accessLog.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No admin access logged yet.</p>
        ) : (
          <div className="space-y-1 text-[11px]">
            {data.accessLog.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <span style={{ color: 'var(--text-muted)' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                <span>{entry.adminEmail ?? entry.adminUserId}</span>
                <span style={{ color: 'var(--gold)' }}>{entry.action}</span>
                {entry.reason && <span style={{ color: 'var(--text-muted)' }}>"{entry.reason}"</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
