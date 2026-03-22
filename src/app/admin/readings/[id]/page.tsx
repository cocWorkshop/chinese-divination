'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ResultRenderer from '@/components/results/ResultRenderer'
import { catchAndReport } from '@/lib/errorReporter'

interface ReadingDetail {
  id: string
  type: string
  modelTier: string
  question: string | null
  inputData: Record<string, unknown>
  result: string
  calculationData: string | null
  llmPrompt: string | null
  llmRawOutput: string | null
  language: string
  targetType: string
  rating: number | null
  createdAt: string
  user: { id: string; name: string | null; email: string | null }
  familyMember: { name: string | null; relation: string } | null
  feedbacks: { rating: number | null; feedback: string | null; createdAt: string }[]
}

type TabKey = 'result' | 'input' | 'calculation' | 'llmPrompt' | 'llmOutput'

export default function AdminReadingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [reading, setReading] = useState<ReadingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('result')

  useEffect(() => {
    fetch(`/api/admin/readings/${params.id}`)
      .then(r => r.json())
      .then(data => { setReading(data.reading); setLoading(false) })
      .catch(err => { catchAndReport(`/api/admin/readings/${params.id}`)(err); setLoading(false) })
  }, [params.id])

  if (loading) return <div className="p-6 text-white/40">載入中...</div>
  if (!reading) return <div className="p-6 text-white/40">記錄不存在</div>

  const parsedCalc = (() => { try { return reading.calculationData ? JSON.parse(reading.calculationData) : null } catch { return null } })()

  const tabs: { key: TabKey; label: string; icon: string; available: boolean }[] = [
    { key: 'result', label: '解讀結果', icon: '📜', available: true },
    { key: 'input', label: '用戶輸入', icon: '📝', available: true },
    { key: 'calculation', label: '程序計算', icon: '🔢', available: !!reading.calculationData },
    { key: 'llmPrompt', label: 'LLM輸入', icon: '🤖', available: !!reading.llmPrompt },
    { key: 'llmOutput', label: 'LLM輸出', icon: '💬', available: !!reading.llmRawOutput },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gold/60 hover:text-gold text-sm">← 返回</button>
        <h1 className="text-xl font-serif text-gold">占卜詳情</h1>
      </div>

      {/* Meta info */}
      <div className="glass-card rounded-xl p-4 border border-gold/20 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-white/40 text-xs block">用戶</span>
            <span className="text-white/80">{reading.user.name || reading.user.email?.split('@')[0]}</span>
            <span className="text-white/30 text-xs block">{reading.user.email}</span>
          </div>
          <div>
            <span className="text-white/40 text-xs block">類型</span>
            <span className="text-gold">{reading.type}</span>
            <span className="text-white/30 text-xs block">{reading.modelTier === 'model2' ? '✨ Premium' : 'Standard'}</span>
          </div>
          <div>
            <span className="text-white/40 text-xs block">對象</span>
            <span className="text-white/80">
              {reading.targetType === 'family' && reading.familyMember
                ? `${reading.familyMember.relation} ${reading.familyMember.name || ''}`
                : '本人'}
            </span>
          </div>
          <div>
            <span className="text-white/40 text-xs block">時間</span>
            <span className="text-white/80">{new Date(reading.createdAt).toLocaleString('zh-TW')}</span>
            {reading.rating && <span className="text-xs block mt-0.5">{'⭐'.repeat(reading.rating)}</span>}
          </div>
        </div>
        {reading.question && (
          <div className="mt-3 pt-3 border-t border-gold/10">
            <span className="text-white/40 text-xs">問題：</span>
            <span className="text-white/70 text-sm ml-1">{reading.question}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            disabled={!tab.available}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-gold text-navy-950 font-semibold'
                : tab.available
                  ? 'text-white/60 hover:text-gold border border-gold/20'
                  : 'text-white/20 border border-white/5 cursor-not-allowed'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-card rounded-xl border border-gold/20 overflow-hidden">
        {activeTab === 'result' && (
          <div className="p-4">
            <ResultRenderer type={reading.type} result={reading.result} />
          </div>
        )}

        {activeTab === 'input' && (
          <div className="p-4">
            <pre className="text-white/70 text-sm whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(reading.inputData, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'calculation' && parsedCalc && (
          <div className="p-4">
            <pre className="text-white/70 text-sm whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
              {JSON.stringify(parsedCalc, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'llmPrompt' && reading.llmPrompt && (
          <div className="p-4">
            <pre className="text-white/70 text-sm whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
              {reading.llmPrompt}
            </pre>
          </div>
        )}

        {activeTab === 'llmOutput' && reading.llmRawOutput && (
          <div className="p-4">
            <pre className="text-white/70 text-sm whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
              {reading.llmRawOutput}
            </pre>
          </div>
        )}


      </div>

      {/* Feedback */}
      {reading.feedbacks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-gold font-serif mb-3">用戶反饋</h3>
          {reading.feedbacks.map((fb, i) => (
            <div key={i} className="glass-card rounded-xl p-4 border border-gold/10 mb-2">
              {fb.rating && <span>{'⭐'.repeat(fb.rating)}</span>}
              {fb.feedback && <p className="text-white/70 text-sm mt-1">{fb.feedback}</p>}
              <p className="text-white/30 text-xs mt-1">{new Date(fb.createdAt).toLocaleString('zh-TW')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
