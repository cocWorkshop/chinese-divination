'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'

interface OtherData {
  subType: string
  trigrams: {
    upper: { name: string; symbol: string; element: string }
    lower: { name: string; symbol: string; element: string }
    transformed: { name: string; symbol: string; element: string }
  }
  sections: { situation: string; inquiry: string; interaction: string; timeline: string }
  outcome: string
  keyAdvice: string[]
}

const outcomeColor: Record<string, string> = {
  '大吉': 'text-green-300 border-green-300/40 bg-green-300/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
}

const accordionSections = [
  { key: 'situation', label: '體卦分析', icon: '☰' },
  { key: 'inquiry', label: '用卦分析', icon: '☯' },
  { key: 'interaction', label: '體用關係', icon: '⚡' },
  { key: 'timeline', label: '时间推断', icon: '⏰' },
]

export default function OtherResult({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as OtherData
  const [openSection, setOpenSection] = useState<string | null>('situation')

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']

  const trigrams = [
    { label: '體卦(上)', data: d.trigrams?.upper },
    { label: '用卦(下)', data: d.trigrams?.lower },
    { label: '变卦', data: d.trigrams?.transformed },
  ]

  return (
    <div className="space-y-6">
      {/* Trigrams */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border border-gold/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gold font-serif">{d.subType === 'liuren' ? '六壬神课' : '梅花易数'}</h3>
          <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {trigrams.map(({ label, data: t }) => (
            <div key={label} className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-center">
              <div className="text-white/40 text-xs mb-2">{label}</div>
              <div className="text-4xl mb-1">{t?.symbol || '☰'}</div>
              <div className="text-gold font-serif">{t?.name || '?'}</div>
              <div className="text-white/50 text-xs">{t?.element}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Accordion */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
        {accordionSections.map(s => (
          <div key={s.key} className="glass-card rounded-xl border border-gold/20 overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === s.key ? null : s.key)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <span className="text-gold font-serif">{s.icon === '☯' ? <><YinYangIcon size={16} /> </> : s.icon} {s.label}</span>
              <span className="text-white/40">{openSection === s.key ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {openSection === s.key && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-4 text-white/70 text-sm leading-relaxed border-t border-gold/10 pt-3 whitespace-pre-wrap">
                    {d.sections?.[s.key as keyof typeof d.sections] || '暫無內容'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      {/* Key Advice */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-gold font-serif mb-3">核心建議</h3>
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
