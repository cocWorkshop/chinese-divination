'use client'

/**
 * View 3 of the /start ad funnel — the value-delivery moment.
 *
 * Streams the bazi reading via /api/divination (auth via funnel cookie).
 * Renders progressively:
 *   1. chart_ready event → show pillars + dayMaster + fiveElements (instant)
 *   2. value_chunk path=['sections','overview'] → stream overview text
 *   3. value_chunk path=['sections','career']   → stream career text
 *   4. After overview is done, show 5 LOCKED sections (婚姻/財運/健康/大運/建議)
 *      with blur + 🔒. They serve as visible proof of "more value behind
 *      the paywall" without showing actual content.
 *
 * The streaming infrastructure is already path-aware on the server side
 * (`StreamingJsonParser` in /api/divination/handlers/_streamingJsonParser.ts)
 * — this view just routes the relevant SSE events into a flat React state.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'

interface Pillar { stem: string; branch: string; element?: string; nayin?: string }
interface ChartSeed {
  pillars?: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster?: { stem: string; element: string; yinYang: string; strengthLabel?: string }
  fiveElements?: Record<string, number>
  formation?: { name: string; analysis?: string }
}

const ELEMENT_COLORS: Record<string, string> = {
  metal: 'text-yellow-400', wood: 'text-emerald-400', water: 'text-blue-400',
  fire: 'text-rose-400', earth: 'text-amber-600',
  金: 'text-yellow-400', 木: 'text-emerald-400', 水: 'text-blue-400',
  火: 'text-rose-400', 土: 'text-amber-600',
}

const LOCKED_SECTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'marriage', label: '婚姻運', icon: '💞' },
  { key: 'wealth', label: '財運', icon: '💰' },
  { key: 'health', label: '健康', icon: '🌿' },
  { key: 'daYun', label: '大運精批（八步流年）', icon: '🔮' },
  { key: 'keyAdvice', label: '核心建議（3-5條）', icon: '✨' },
]

export default function StartReadingPage() {
  const router = useRouter()
  const params = useParams()
  const readingId = params?.id as string

  const [chart, setChart] = useState<ChartSeed | null>(null)
  const [overview, setOverview] = useState('')
  const [career, setCareer] = useState('')
  const [streamPhase, setStreamPhase] = useState<'casting' | 'overview' | 'career' | 'done' | 'error'>('casting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    // Strict-mode dev double-effect guard.
    if (startedRef.current) return
    startedRef.current = true

    const ac = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/api/divination', {
          method: 'POST',
          signal: ac.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            readingId,
            // type + inputData hydrated server-side from the Reading row.
            language: 'zh-TW',
            saveProfile: false,
            saveHistory: true,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Request failed' }))
          setErrorMsg(data.error || '排盤失敗，請稍後再試')
          setStreamPhase('error')
          return
        }
        const reader = res.body?.getReader()
        if (!reader) {
          setErrorMsg('No response stream')
          setStreamPhase('error')
          return
        }
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6)
            if (!raw) continue
            try {
              const ev = JSON.parse(raw) as {
                type: string
                seed?: ChartSeed
                path?: (string | number)[]
                text?: string
                value?: unknown
                error?: string
              }
              if (ev.type === 'chart_ready' && ev.seed) {
                setChart(ev.seed)
              } else if (ev.type === 'value_chunk' && ev.path && ev.text) {
                if (ev.path[0] === 'sections' && ev.path[1] === 'overview') {
                  setOverview((prev) => prev + ev.text!)
                  if (streamPhase === 'casting') setStreamPhase('overview')
                } else if (ev.path[0] === 'sections' && ev.path[1] === 'career') {
                  setCareer((prev) => prev + ev.text!)
                  setStreamPhase('career')
                }
              } else if (ev.type === 'done') {
                setStreamPhase('done')
              } else if (ev.type === 'error') {
                setErrorMsg(ev.error || '解讀中斷')
                setStreamPhase('error')
              }
            } catch { /* ignore malformed frames */ }
          }
        }
        // If the stream closed without a 'done' event but we have content,
        // treat it as done. The `error` phase handles real failures.
        setStreamPhase((p) => (p === 'error' ? p : 'done'))
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setErrorMsg((e as Error).message || '連線失敗')
        setStreamPhase('error')
      }
    })()

    return () => ac.abort()
  }, [readingId, streamPhase])

  return (
    <main className="flex-1 px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full pb-32">
      {/* ── Programmatic chart (renders the moment chart_ready arrives) ─────── */}
      {chart && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-2xl p-5 mb-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <h3 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>
            您的命盤已成
          </h3>

          {chart.pillars && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(['year', 'month', 'day', 'hour'] as const).map((k, pillarIdx) => {
                const labels: Record<string, string> = { year: '年', month: '月', day: '日', hour: '時' }
                const p = chart.pillars![k]
                // Ink-wipe reveal — each pillar's stem and branch are
                // unveiled top→bottom via clip-path, with a brief golden
                // drop-shadow glow that fades as the character settles.
                // Visually: ink soaking onto rice paper, then drying. Stagger
                // pillar (年→月→日→時) and within each pillar stem→branch.
                const baseDelay = pillarIdx * 0.18
                return (
                  <div key={k} className="text-center">
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{labels[k]}柱</div>
                    <div className="font-serif">
                      <motion.span
                        initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0, filter: 'drop-shadow(0 0 10px currentColor)' }}
                        animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1, filter: 'drop-shadow(0 0 0px currentColor)' }}
                        transition={{ duration: 0.6, delay: baseDelay, ease: 'easeOut' }}
                        className={`block text-lg ${ELEMENT_COLORS[p.element || ''] || ''}`}
                        style={{ willChange: 'clip-path, filter' }}
                      >
                        {p.stem}
                      </motion.span>
                      <motion.span
                        initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0, filter: 'drop-shadow(0 0 10px currentColor)' }}
                        animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1, filter: 'drop-shadow(0 0 0px currentColor)' }}
                        transition={{ duration: 0.6, delay: baseDelay + 0.1, ease: 'easeOut' }}
                        className={`block text-lg ${ELEMENT_COLORS[p.element || ''] || ''}`}
                        style={{ willChange: 'clip-path, filter' }}
                      >
                        {p.branch}
                      </motion.span>
                    </div>
                    {p.nayin && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: baseDelay + 0.32 }}
                        className="text-[9px] mt-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {p.nayin}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {chart.dayMaster && (
            <div className="text-xs flex flex-wrap gap-x-3 gap-y-1" style={{ color: 'var(--text-secondary)' }}>
              <span>日主：<span className={`font-serif ${ELEMENT_COLORS[chart.dayMaster.element] || ''}`}>{chart.dayMaster.stem}{chart.dayMaster.element}</span></span>
              {chart.dayMaster.strengthLabel && <span>{chart.dayMaster.strengthLabel}</span>}
            </div>
          )}

          {chart.formation?.name && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid var(--border-gold)' }}>
              <span className="text-xs font-serif font-bold" style={{ color: 'var(--gold)' }}>{chart.formation.name}</span>
            </div>
          )}
        </motion.section>
      )}

      {/* ── Casting placeholder (before chart arrives) ──────────────────────── */}
      {!chart && streamPhase === 'casting' && (
        <div className="glass-card rounded-2xl p-8 mb-5 text-center" style={{ border: '1px solid var(--card-border)' }}>
          <div className="inline-flex gap-1 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_infinite]" />
            <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.2s_infinite]" />
            <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-[dotPulse_1.4s_ease_0.4s_infinite]" />
          </div>
          <p className="font-serif text-sm" style={{ color: 'var(--text-secondary)' }}>正為您起八字命盤…</p>
        </div>
      )}

      {/* ── Overview section (streams in) ───────────────────────────────────── */}
      {(overview || streamPhase === 'overview') && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-5 mb-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <h3 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>📜 命盤總覽</h3>
          <p className="text-sm leading-relaxed font-serif" style={{ color: 'var(--text-primary)' }}>
            {overview || '…'}
          </p>
        </motion.section>
      )}

      {/* ── Career section (streams in after overview) ──────────────────────── */}
      {(career || streamPhase === 'career') && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-5 mb-5"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <h3 className="font-serif text-base mb-3" style={{ color: 'var(--gold)' }}>💼 事業運</h3>
          <p className="text-sm leading-relaxed font-serif" style={{ color: 'var(--text-primary)' }}>
            {career || '…'}
          </p>
        </motion.section>
      )}

      {/* ── Locked sections (always visible — they advertise the unlock value).
          Each row has a slow scanning shimmer to feel "diagnostic / scanning"
          rather than "broken / placeholder". ──────────────────────────────── */}
      <section className="space-y-2 mb-5">
        <h3 className="font-serif text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          您命中還有 {LOCKED_SECTIONS.length} 個面向待解讀…
        </h3>
        {LOCKED_SECTIONS.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 * i }}
            className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px dashed var(--card-border)' }}
          >
            <div className="flex items-center gap-2 mb-1.5 relative z-10">
              <span className="text-base">{s.icon}</span>
              <span className="font-serif text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <span
                className="ml-auto text-xs"
                style={{ animation: 'xjLockPulse 3s ease-in-out infinite' }}
              >🔒</span>
            </div>
            <div
              className="h-12 rounded-md relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)',
                filter: 'blur(2px)',
              }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.18) 50%, transparent 100%)',
                  animation: `xjScan 4.5s ease-in-out ${i * 0.6}s infinite`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </section>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {streamPhase === 'error' && (
        <div className="glass-card rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-sm text-red-400">{errorMsg}</p>
          <button
            onClick={() => router.push('/start/cast')}
            className="mt-3 px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--gold)', border: '1px solid var(--border-gold)' }}
          >
            重新填寫
          </button>
        </div>
      )}

      {/* ── Bottom CTA (appears once enough has streamed) ───────────────────── */}
      {(streamPhase === 'done' || streamPhase === 'career') && chart && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-30 p-4 backdrop-blur-md border-t"
          style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              這只是命盤的開端 — 玄機大師還能逐段細看
            </p>
            <button
              onClick={() => router.push(`/start/master/${readingId}`)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-sm transition-all hover:shadow-[0_0_18px_rgba(212,175,55,0.4)]"
              style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
            >
              繼續：與玄機大師對話 →
            </button>
          </div>
        </motion.div>
      )}

      <style jsx global>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes xjScan {
          0% { transform: translateX(0); }
          50% { transform: translateX(420%); }
          100% { transform: translateX(420%); }
        }
        @keyframes xjLockPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  )
}
