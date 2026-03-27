'use client'

import { useEffect, useState, useCallback } from 'react'

interface AffectedUser {
  user: { id: string; email: string; name: string | null }
  llmErrors: Array<{ id: string; endpoint: string; errorMessage: string | null; createdAt: string }>
  frontendErrors: Array<{ id: string; endpoint: string; error: string; createdAt: string }>
}

interface Compensation {
  id: string; email: string; userId: string | null; reason: string
  sourceType: string; divinationCredits: number; chatCredits: number
  bonusModel1: number; bonusModel2: number; bonusChat: number
  token: string; status: string; createdAt: string; sentAt: string | null; claimedAt: string | null
}

interface DraftItem {
  email: string; userId?: string; reason: string; sourceType: string; sourceIds?: string
  credits: number
  selected: boolean
}

type Tab = 'create' | 'history'

export default function AdminCompensation() {
  const [tab, setTab] = useState<Tab>('create')

  // Affected users
  const [affected, setAffected] = useState<AffectedUser[]>([])
  const [loadingAffected, setLoadingAffected] = useState(false)
  const [sinceDays, setSinceDays] = useState(7)

  // Draft items
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [manualEmail, setManualEmail] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [defaultCredits, setDefaultCredits] = useState(3)

  // History
  const [compensations, setCompensations] = useState<Compensation[]>([])
  const [histPage, setHistPage] = useState(1)
  const [histPages, setHistPages] = useState(1)
  const [histTotal, setHistTotal] = useState(0)
  const [histLoading, setHistLoading] = useState(false)
  const [histFilter, setHistFilter] = useState('')

  // Send state
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const fetchAffected = useCallback(() => {
    setLoadingAffected(true)
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
    fetch(`/api/admin/compensation?action=affected-users&since=${since}`)
      .then(r => r.json())
      .then(d => {
        setAffected(d.affected || [])
      })
      .finally(() => setLoadingAffected(false))
  }, [sinceDays])

  const fetchHistory = useCallback((page: number) => {
    setHistLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (histFilter) params.set('status', histFilter)
    fetch(`/api/admin/compensation?${params}`)
      .then(r => r.json())
      .then(d => {
        setCompensations(d.compensations || [])
        setHistTotal(d.total || 0)
        setHistPage(d.page || 1)
        setHistPages(d.pages || 1)
      })
      .finally(() => setHistLoading(false))
  }, [histFilter])

  useEffect(() => { fetchAffected() }, [fetchAffected])
  useEffect(() => { if (tab === 'history') fetchHistory(1) }, [tab, fetchHistory])

  const addAffectedToDraft = (au: AffectedUser) => {
    if (drafts.find(d => d.email === au.user.email)) return
    const errorCount = au.llmErrors.length + au.frontendErrors.length
    const allIds = [...au.llmErrors.map(e => e.id), ...au.frontendErrors.map(e => e.id)]
    setDrafts(prev => [...prev, {
      email: au.user.email,
      userId: au.user.id,
      reason: `系統錯誤補償（${errorCount} 次錯誤）`,
      sourceType: 'error_log',
      sourceIds: allIds.join(','),
      credits: defaultCredits,
      selected: true,
    }])
  }

  const addManual = () => {
    if (!manualEmail.trim()) return
    if (drafts.find(d => d.email === manualEmail.trim())) return
    setDrafts(prev => [...prev, {
      email: manualEmail.trim(),
      reason: manualReason || '管理員補償',
      sourceType: 'manual',
      credits: defaultCredits,
      selected: true,
    }])
    setManualEmail('')
    setManualReason('')
  }

  const removeDraft = (email: string) => {
    setDrafts(prev => prev.filter(d => d.email !== email))
  }

  const updateDraft = (email: string, field: keyof DraftItem, value: number | string | boolean) => {
    setDrafts(prev => prev.map(d => d.email === email ? { ...d, [field]: value } : d))
  }

  const createAndSend = async () => {
    const selected = drafts.filter(d => d.selected)
    if (!selected.length) return

    setCreating(true)
    setMessage(null)

    try {
      // Create
      const apiItems = selected.map(d => ({ ...d, divinationCredits: d.credits, chatCredits: 0 }))
      const createRes = await fetch('/api/admin/compensation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: apiItems }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || 'Failed to create')

      const ids = createData.created.map((c: Compensation) => c.id)

      // Send emails
      setSending(true)
      const sendRes = await fetch('/api/admin/compensation/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const sendData = await sendRes.json()

      const successCount = sendData.results?.filter((r: { success: boolean }) => r.success).length || 0
      const failCount = sendData.results?.filter((r: { success: boolean }) => !r.success).length || 0

      if (failCount > 0) {
        setMessage({ text: `已發送 ${successCount} 封，${failCount} 封失敗`, type: 'error' })
      } else {
        setMessage({ text: `已成功發送 ${successCount} 封補償郵件`, type: 'success' })
      }

      // Remove sent items from draft
      setDrafts(prev => prev.filter(d => !d.selected))
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : '操作失敗', type: 'error' })
    } finally {
      setCreating(false)
      setSending(false)
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', label: '待發送' },
      sent: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: '已發送' },
      claimed: { bg: 'bg-green-400/10', text: 'text-green-400', label: '已領取' },
      expired: { bg: 'bg-red-400/10', text: 'text-red-400', label: '已過期' },
    }
    const m = map[s] || { bg: 'bg-white/10', text: 'text-white/50', label: s }
    return <span className={`px-2 py-0.5 rounded-full text-xs ${m.bg} ${m.text}`}>{m.label}</span>
  }

  const selectedCount = drafts.filter(d => d.selected).length

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-gold">用戶補償</h1>
        <p className="text-white/40 text-sm mt-1">User Compensation</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-navy-900/50 rounded-xl w-fit border border-gold/10">
        {[
          { key: 'create' as Tab, label: '🎁 建立補償' },
          { key: 'history' as Tab, label: '📋 補償記錄', count: histTotal },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gold/20 text-gold shadow-sm' : 'text-white/50 hover:text-white/70'
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-xs opacity-60">({t.count})</span> : null}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-green-400/10 text-green-400 border border-green-400/20'
            : 'bg-red-400/10 text-red-400 border border-red-400/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* ===== CREATE TAB ===== */}
      {tab === 'create' && (
        <>
          {/* Default amounts */}
          <div className="glass-card rounded-xl p-4 border border-gold/15 mb-5">
            <div className="text-white/60 text-xs mb-3 uppercase tracking-wider">預設補償額度</div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <span>💰 額度</span>
                <input type="number" min={0} value={defaultCredits} onChange={e => setDefaultCredits(parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 rounded-lg bg-navy-900 border border-gold/20 text-white text-center text-sm" />
              </label>
            </div>
          </div>

          {/* Affected users from errors */}
          <div className="glass-card rounded-xl p-4 border border-gold/15 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/60 text-xs uppercase tracking-wider">受影響用戶（系統錯誤）</div>
              <div className="flex items-center gap-2">
                <select value={sinceDays} onChange={e => setSinceDays(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-navy-900 border border-gold/20 text-white/70 text-xs">
                  <option value={1}>近 1 天</option>
                  <option value={3}>近 3 天</option>
                  <option value={7}>近 7 天</option>
                  <option value={30}>近 30 天</option>
                </select>
                <button onClick={fetchAffected} disabled={loadingAffected}
                  className="px-3 py-1 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors disabled:opacity-50">
                  {loadingAffected ? '載入中...' : '🔄 刷新'}
                </button>
              </div>
            </div>

            {affected.length === 0 ? (
              <div className="text-white/30 text-sm text-center py-4">✅ 暫無受影響用戶</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {affected.map(au => {
                  const inDraft = drafts.some(d => d.email === au.user.email)
                  return (
                    <div key={au.user.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-navy-900/50 border border-gold/10">
                      <div className="flex-1 min-w-0">
                        <div className="text-white/80 text-sm truncate">{au.user.name || au.user.email}</div>
                        <div className="text-white/40 text-xs">{au.user.email}</div>
                        <div className="flex gap-3 mt-1 text-xs">
                          {au.llmErrors.length > 0 && <span className="text-red-400">🔴 LLM 錯誤 ×{au.llmErrors.length}</span>}
                          {au.frontendErrors.length > 0 && <span className="text-orange-400">🟠 前端錯誤 ×{au.frontendErrors.length}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => addAffectedToDraft(au)}
                        disabled={inDraft}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          inDraft ? 'bg-green-400/10 text-green-400 cursor-default' : 'bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20'
                        }`}
                      >
                        {inDraft ? '✓ 已加入' : '+ 加入'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Manual add */}
          <div className="glass-card rounded-xl p-4 border border-gold/15 mb-5">
            <div className="text-white/60 text-xs mb-3 uppercase tracking-wider">手動添加</div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-white/40 text-xs">電郵</label>
                <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-navy-900 border border-gold/20 text-white text-sm mt-1" />
              </div>
              <div className="flex-1">
                <label className="text-white/40 text-xs">原因</label>
                <input type="text" value={manualReason} onChange={e => setManualReason(e.target.value)}
                  placeholder="補償原因"
                  className="w-full px-3 py-2 rounded-lg bg-navy-900 border border-gold/20 text-white text-sm mt-1" />
              </div>
              <button onClick={addManual} disabled={!manualEmail.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors disabled:opacity-30">
                + 添加
              </button>
            </div>
          </div>

          {/* Draft list */}
          {drafts.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-gold/15 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/60 text-xs uppercase tracking-wider">補償列表 ({drafts.length} 人)</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDrafts(prev => prev.map(d => ({ ...d, selected: true })))}
                    className="text-xs text-gold/60 hover:text-gold">全選</button>
                  <button
                    onClick={() => setDrafts(prev => prev.map(d => ({ ...d, selected: false })))}
                    className="text-xs text-white/40 hover:text-white/60">取消全選</button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {drafts.map(d => (
                  <div key={d.email} className={`px-3 py-3 rounded-lg border transition-colors ${
                    d.selected ? 'bg-gold/5 border-gold/20' : 'bg-navy-900/30 border-white/5'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <input type="checkbox" checked={d.selected}
                        onChange={e => updateDraft(d.email, 'selected', e.target.checked)}
                        className="accent-[#d4a853]" />
                      <span className="text-white/80 text-sm flex-1">{d.email}</span>
                      <span className="text-white/30 text-xs">{d.sourceType}</span>
                      <button onClick={() => removeDraft(d.email)} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
                    </div>
                    <div className="flex gap-3 items-center ml-6">
                      <input type="text" value={d.reason}
                        onChange={e => updateDraft(d.email, 'reason', e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-navy-900/50 border border-white/10 text-white/60 text-xs" />
                      <div className="flex gap-2 items-center text-xs">
                        <label className="flex items-center gap-1 text-white/50">
                          💰<input type="number" min={0} value={d.credits}
                            onChange={e => updateDraft(d.email, 'credits', parseInt(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 rounded bg-navy-900 border border-gold/15 text-white text-center" />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Send button */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-white/40 text-xs">已選 {selectedCount} 人</span>
                <button
                  onClick={createAndSend}
                  disabled={selectedCount === 0 || creating || sending}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #d4a853, #b8912e)', color: '#0a0f1e' }}
                >
                  {creating ? '建立中...' : sending ? '發送中...' : `📧 確認發送 (${selectedCount})`}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== HISTORY TAB ===== */}
      {tab === 'history' && (
        <>
          <div className="flex gap-1.5 mb-4">
            {['', 'pending', 'sent', 'claimed', 'expired'].map(f => (
              <button key={f}
                onClick={() => { setHistFilter(f); }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  histFilter === f ? 'bg-gold text-navy-950 font-semibold' : 'text-white/50 border border-gold/15 hover:text-gold hover:border-gold/30'
                }`}>
                {f === '' ? '全部' : f === 'pending' ? '待發送' : f === 'sent' ? '已發送' : f === 'claimed' ? '已領取' : '已過期'}
              </button>
            ))}
          </div>

          {histLoading ? (
            <div className="text-gold animate-pulse p-8 text-center">Loading...</div>
          ) : compensations.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-white/40">暫無補償記錄</div>
          ) : (
            <div className="space-y-2">
              {compensations.map(c => (
                <div key={c.id} className="glass-card rounded-xl p-4 border border-gold/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {statusBadge(c.status)}
                      <span className="text-white/70 text-sm">{c.email}</span>
                    </div>
                    <span className="text-white/25 text-xs">{new Date(c.createdAt).toLocaleString('zh-TW')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="text-white/30">{c.reason}</span>
                    <span className="ml-auto">
                      💰 +{(c.divinationCredits || 0) + (c.chatCredits || 0) + (c.bonusModel1 || 0) + (c.bonusChat || 0)}
                    </span>
                  </div>
                  {c.claimedAt && (
                    <div className="text-green-400/60 text-xs mt-1">
                      ✅ 已於 {new Date(c.claimedAt).toLocaleString('zh-TW')} 領取
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {histPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => fetchHistory(histPage - 1)} disabled={histPage <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gold/20 text-white/60 hover:text-gold disabled:opacity-30">←</button>
              <span className="px-3 py-1.5 text-sm text-white/40">{histPage} / {histPages}</span>
              <button onClick={() => fetchHistory(histPage + 1)} disabled={histPage >= histPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gold/20 text-white/60 hover:text-gold disabled:opacity-30">→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
