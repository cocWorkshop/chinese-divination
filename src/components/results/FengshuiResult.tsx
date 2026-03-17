'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FengshuiData {
  flyingStar: { facing: string; period: string; mountainStar: string; waterStar: string }
  rooms: { room: string; energy: string; suggestion: string }[]
  sections: { overall: string; wealth: string; health: string; relationships: string }
  remedies: { issue: string; solution: string }[]
  keyAdvice: string[]
}

const energyColor: Record<string, string> = {
  '旺': 'bg-green-400',
  '平': 'bg-yellow-400',
  '衰': 'bg-orange-400',
  '煞': 'bg-red-500',
}

const accordionSections = [
  { key: 'overall', label: '整体格局', icon: '🏯' },
  { key: 'wealth', label: '财位分析', icon: '💰' },
  { key: 'health', label: '健康能量', icon: '🌿' },
  { key: 'relationships', label: '人际感情', icon: '💕' },
]

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const ZH_DIR: Record<string, string> = { N:'北', NE:'东北', E:'东', SE:'东南', S:'南', SW:'西南', W:'西', NW:'西北' }

export default function FengshuiResult({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as FengshuiData
  const [openSection, setOpenSection] = useState<string | null>('overall')

  const facing = d.flyingStar?.facing || ''
  // detect which direction to highlight
  const highlightDir = DIRECTIONS.find(dir => facing.includes(ZH_DIR[dir] || dir)) || null

  return (
    <div className="space-y-6">
      {/* Compass + Flying Star */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border border-gold/20">
        <h3 className="text-gold font-serif mb-4 text-center">飞星盘</h3>
        
        {/* Simple octagonal compass */}
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full border-2 border-gold/30 flex items-center justify-center">
              <div className="text-gold/40 text-xs">罗盘</div>
            </div>
            {DIRECTIONS.map((dir, i) => {
              const angle = i * 45
              const rad = (angle - 90) * Math.PI / 180
              const r = 46
              const x = 50 + r * Math.cos(rad)
              const y = 50 + r * Math.sin(rad)
              const isHighlight = dir === highlightDir
              return (
                <div
                  key={dir}
                  className={`absolute text-xs font-serif transform -translate-x-1/2 -translate-y-1/2 ${isHighlight ? 'text-gold font-bold text-base' : 'text-white/40'}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {ZH_DIR[dir]}
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-center text-white/60 text-sm mb-4">{facing}</div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-center">
            <div className="text-white/40 text-xs mb-1">运期</div>
            <div className="text-gold font-serif">{d.flyingStar?.period || '—'}</div>
          </div>
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-center">
            <div className="text-white/40 text-xs mb-1">山星</div>
            <div className="text-gold font-serif text-xl">{d.flyingStar?.mountainStar || '—'}</div>
          </div>
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-center">
            <div className="text-white/40 text-xs mb-1">向星</div>
            <div className="text-gold font-serif text-xl">{d.flyingStar?.waterStar || '—'}</div>
          </div>
        </div>
      </motion.div>

      {/* Rooms */}
      {d.rooms && d.rooms.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5 border border-gold/20">
          <h3 className="text-gold font-serif mb-3">各室能量</h3>
          <div className="space-y-3">
            {d.rooms.map((room, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex items-center gap-2 w-20 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${energyColor[room.energy] || 'bg-gray-400'}`} />
                  <span className="text-white/70 text-sm">{room.room}</span>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{room.suggestion}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Remedies */}
      {d.remedies && d.remedies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5 border border-gold/20">
          <h3 className="text-gold font-serif mb-3">化解方案</h3>
          <div className="space-y-2">
            {d.remedies.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-yellow-400">⚡</span>
                <span className="text-white/60">{r.issue}：</span>
                <span className="text-white/80">{r.solution}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Accordion */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
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
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-4 text-white/70 text-sm leading-relaxed border-t border-gold/10 pt-3 whitespace-pre-wrap">
                    {d.sections?.[s.key as keyof typeof d.sections] || '暂无内容'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      {/* Key Advice */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
