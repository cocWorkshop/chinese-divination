'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface QimenData {
  palace: { inquiry: string; outcome: string; god: string; star: string; door: string }
  sections: { situation: string; trend: string; timing: string; strategy: string }
  outcome: string
  keyAdvice: string[]
  luckyInfo: { timing: string; direction: string }
}

const outcomeColor: Record<string, string> = {
  '大吉': 'text-green-300 border-green-300/40 bg-green-300/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
}

const accordionSections = [
  { key: 'situation', label: '当前局势', icon: '⚡' },
  { key: 'trend', label: '事态走向', icon: '🔮' },
  { key: 'timing', label: '最佳时机', icon: '⏰' },
  { key: 'strategy', label: '行动策略', icon: '🎯' },
]

export default function QimenResult({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as QimenData
  const [openSection, setOpenSection] = useState<string | null>('situation')

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']

  const palaceCards = [
    { label: '问事宫', value: d.palace?.inquiry },
    { label: '结果宫', value: d.palace?.outcome },
    { label: '值符神', value: d.palace?.god },
    { label: '值符星', value: d.palace?.star },
    { label: '当值门', value: d.palace?.door },
  ]

  return (
    <div className="space-y-6">
      {/* Palace Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border border-gold/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gold font-serif">奇门格局</h3>
          <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {palaceCards.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
              <div className="text-white/40 text-xs mb-1">{label}</div>
              <div className="text-gold font-serif text-sm">{value || '—'}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Accordion Sections */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
        {accordionSections.map(s => (
          <div key={s.key} className="glass-card rounded-xl border border-gold/20 overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === s.key ? null : s.key)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <span className="text-gold font-serif">{s.icon} {s.label}</span>
              <span className="text-white/40">{openSection === s.key ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {openSection === s.key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-white/70 text-sm leading-relaxed border-t border-gold/10 pt-3 whitespace-pre-wrap">
                    {d.sections?.[s.key as keyof typeof d.sections] || '暂无内容'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      {/* Lucky Info */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3">
          {d.luckyInfo.timing && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">吉时</div>
              <div className="text-gold text-sm">{d.luckyInfo.timing}</div>
            </div>
          )}
          {d.luckyInfo.direction && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">吉方</div>
              <div className="text-gold text-sm">{d.luckyInfo.direction}</div>
            </div>
          )}
        </motion.div>
      )}

      {/* Key Advice */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="text-gold font-serif mb-3">核心建议</h3>
          <div className="grid gap-3">
            {d.keyAdvice.map((advice, i) => (
              <div key={i} className="glass-card rounded-xl p-4 border border-gold/20 flex gap-3">
                <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <p className="text-white/80 text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
