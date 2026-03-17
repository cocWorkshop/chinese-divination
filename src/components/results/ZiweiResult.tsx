'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ZiweiData {
  mainStars: { name: string; palace: string; element: string }[]
  palaces: Record<string, { stars: string[]; analysis: string }>
  sections: { overview: string; career: string; marriage: string; wealth: string }
  keyAdvice: string[]
  luckyInfo: { numbers: number[]; colors: string[]; directions: string[] }
}

const PALACE_ORDER = ['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫','迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫']

const sectionTabs = [
  { key: 'overview', label: '总览' },
  { key: 'career', label: '事业' },
  { key: 'marriage', label: '婚姻' },
  { key: 'wealth', label: '财运' },
]

export default function ZiweiResult({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ZiweiData
  const [activeSection, setActiveSection] = useState('overview')

  const palaces = d.palaces || {}

  return (
    <div className="space-y-6">
      {/* Main Stars */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border border-gold/20">
        <h3 className="text-gold font-serif mb-3">主星配置</h3>
        <div className="flex flex-wrap gap-2">
          {(d.mainStars || []).map((star, i) => (
            <div key={i} className="px-3 py-1.5 rounded-lg border border-gold/30 bg-gold/10 text-center">
              <div className="text-gold font-serif text-sm">{star.name}</div>
              <div className="text-white/50 text-xs">{star.palace}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Palace Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5 border border-gold/20">
        <h3 className="text-gold font-serif mb-3">十二宫位</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {PALACE_ORDER.map((palaceName) => {
            const p = palaces[palaceName]
            const hasStars = p && p.stars && p.stars.length > 0
            return (
              <div key={palaceName} className={`rounded-lg p-2 border text-center ${hasStars ? 'border-gold/30 bg-gold/5' : 'border-white/10 bg-white/2'}`}>
                <div className="text-white/60 text-xs mb-1">{palaceName}</div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {(p?.stars || []).slice(0, 3).map((star, i) => (
                    <span key={i} className="text-gold text-xs">{star}</span>
                  ))}
                  {!p?.stars?.length && <span className="text-white/20 text-xs">—</span>}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Sections */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex gap-1 mb-4">
          {sectionTabs.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${activeSection === s.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/60 hover:text-gold border border-gold/20'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="glass-card rounded-xl p-5 border border-gold/20 text-white/80 text-sm leading-relaxed whitespace-pre-wrap"
          >
            {d.sections?.[activeSection as keyof typeof d.sections] || '暂无内容'}
          </motion.div>
        </AnimatePresence>
      </motion.div>

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
