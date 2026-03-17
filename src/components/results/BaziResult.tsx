'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TenGodEntry { stem: string; god: string }
interface Pillar {
  stem: string; branch: string; element: string; nayin: string
  hiddenStems?: string[]
  tenGods?: TenGodEntry[]
}
interface TrueSolarTimeInfo {
  originalTime: string
  correctedTime: string
  correctionMinutes: number
  longitude: number
  shichen: string
  shichenChanged: boolean
}
interface ShenShaEntry { name: string; description: string }
interface BaziData {
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: { stem: string; element: string; yinYang?: string; strength: string; strengthLabel: string }
  fiveElements: { metal: number; wood: number; water: number; fire: number; earth: number }
  luckyElements: string[]
  avoidElements: string[]
  sections: { overview: string; career: string; marriage: string; wealth: string; health: string; periods: string }
  keyAdvice: string[]
  luckyInfo: { numbers: number[]; colors: string[]; directions: string[] }
  shenSha?: ShenShaEntry[]
  trueSolarTime?: TrueSolarTimeInfo
}

const elementColor: Record<string, string> = {
  金: 'text-gray-300', 木: 'text-green-400', 水: 'text-blue-400', 火: 'text-red-400', 土: 'text-yellow-500',
  metal: 'text-gray-300', wood: 'text-green-400', water: 'text-blue-400', fire: 'text-red-400', earth: 'text-yellow-500',
}
const elementBg: Record<string, string> = {
  金: 'bg-gray-300/10 border-gray-300/30', 木: 'bg-green-400/10 border-green-400/30',
  水: 'bg-blue-400/10 border-blue-400/30', 火: 'bg-red-400/10 border-red-400/30', 土: 'bg-yellow-500/10 border-yellow-500/30',
}

const sectionsList = [
  { key: 'overview', label: '总览', icon: '☰' },
  { key: 'career', label: '事业', icon: '💼' },
  { key: 'marriage', label: '婚姻', icon: '💕' },
  { key: 'wealth', label: '财运', icon: '💰' },
  { key: 'health', label: '健康', icon: '🌿' },
  { key: 'periods', label: '大运', icon: '🔮' },
]

export default function BaziResult({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as BaziData
  const [activeSection, setActiveSection] = useState('overview')

  const pillars = [
    { label: '年柱', data: d.pillars?.year },
    { label: '月柱', data: d.pillars?.month },
    { label: '日柱', data: d.pillars?.day },
    { label: '时柱', data: d.pillars?.hour },
  ]

  const fe = d.fiveElements || {}
  const feEntries: [string, number][] = [
    ['木', fe.wood || 0], ['火', fe.fire || 0], ['土', fe.earth || 0], ['金', fe.metal || 0], ['水', fe.water || 0],
  ]
  const feMax = Math.max(...feEntries.map(([, v]) => v), 1)

  const tst = d.trueSolarTime

  return (
    <div className="space-y-6">
      {/* True Solar Time Info Bar */}
      {tst && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 border border-blue-400/30 bg-blue-400/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-sm">🕐 真太阳时校正</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-white/40">标准时间：</span>
              <span className="text-white/80">{tst.originalTime}</span>
            </div>
            <div>
              <span className="text-white/40">真太阳时：</span>
              <span className="text-white/80">{tst.correctedTime}</span>
            </div>
            <div>
              <span className="text-white/40">出生经度：</span>
              <span className="text-white/80">{tst.longitude}°E</span>
            </div>
            <div>
              <span className="text-white/40">时差修正：</span>
              <span className={`${tst.correctionMinutes >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                {tst.correctionMinutes >= 0 ? '+' : ''}{tst.correctionMinutes.toFixed(1)}分钟
              </span>
            </div>
          </div>
          {tst.shichenChanged && (
            <div className="mt-2 text-orange-400 text-xs font-semibold">
              ⚠️ 真太阳时校正后时辰发生变化，已自动调整为{tst.shichen}
            </div>
          )}
        </motion.div>
      )}

      {/* Four Pillars */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
        <h3 className="text-gold font-serif text-lg mb-4 text-center">四柱命盘</h3>
        <div className="grid grid-cols-4 gap-3">
          {pillars.map(({ label, data: p }) => {
            const stemTenGod = p?.tenGods?.find(t => t.stem === p.stem)
            return (
              <div key={label} className={`rounded-xl border p-3 text-center ${p ? elementBg[p.element] || 'border-gold/20' : 'border-gold/20'}`}>
                <div className="text-white/50 text-xs mb-2">{label}</div>
                <div className={`text-2xl font-serif font-bold ${p ? elementColor[p.element] : 'text-white'}`}>
                  {p?.stem || '?'}
                </div>
                {stemTenGod && label !== '日柱' && (
                  <div className="text-white/40 text-[10px]">({stemTenGod.god})</div>
                )}
                {label === '日柱' && (
                  <div className="text-gold text-[10px]">(日主)</div>
                )}
                <div className={`text-xl font-serif mt-1 ${p ? elementColor[p.element] : 'text-white'}`}>
                  {p?.branch || '?'}
                </div>
                {/* Hidden Stems */}
                {p?.hiddenStems && p.hiddenStems.length > 0 && (
                  <div className="text-white/30 text-[10px] mt-1">
                    藏干: {p.hiddenStems.join(' ')}
                  </div>
                )}
                <div className="text-white/50 text-xs mt-1">{p?.element || ''}</div>
                <div className="text-white/40 text-[10px]">{p?.nayin || ''}</div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Day Master + Five Elements */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 text-center border border-gold/20">
          <h3 className="text-gold font-serif text-sm mb-3">日主</h3>
          <div className={`text-4xl font-serif font-bold mb-1 ${elementColor[d.dayMaster?.element || '']}`}>{d.dayMaster?.stem}</div>
          <div className={`text-sm ${elementColor[d.dayMaster?.element || '']}`}>
            {d.dayMaster?.yinYang || ''}{d.dayMaster?.element}
          </div>
          <div className="mt-3 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs inline-block">
            {d.dayMaster?.strengthLabel || d.dayMaster?.strength}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-gold/20">
          <h3 className="text-gold font-serif text-sm mb-3">五行分布</h3>
          <div className="space-y-2">
            {feEntries.map(([el, count]) => (
              <div key={el} className="flex items-center gap-2">
                <div className={`w-5 text-xs ${elementColor[el]}`}>{el}</div>
                <div className="flex-1 bg-navy-900 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${el === '木' ? 'bg-green-400' : el === '火' ? 'bg-red-400' : el === '土' ? 'bg-yellow-500' : el === '金' ? 'bg-gray-300' : 'bg-blue-400'}`}
                    style={{ width: `${(count / feMax) * 100}%` }}
                  />
                </div>
                <div className="text-white/50 text-xs w-6 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Lucky/Avoid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-4 border border-gold/20 flex gap-6 flex-wrap">
        <div>
          <span className="text-white/50 text-xs mr-2">喜用神:</span>
          {(d.luckyElements || []).map(el => (
            <span key={el} className={`inline-block px-2 py-0.5 rounded-full border text-xs mr-1 ${elementBg[el] || ''} ${elementColor[el] || ''}`}>{el}</span>
          ))}
        </div>
        <div>
          <span className="text-white/50 text-xs mr-2">忌神:</span>
          {(d.avoidElements || []).map(el => (
            <span key={el} className="inline-block px-2 py-0.5 rounded-full border border-red-400/30 bg-red-400/10 text-red-400 text-xs mr-1">{el}</span>
          ))}
        </div>
      </motion.div>

      {/* Shen Sha */}
      {d.shenSha && d.shenSha.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
          className="glass-card rounded-xl p-4 border border-gold/20">
          <h3 className="text-gold font-serif text-sm mb-3">神煞</h3>
          <div className="flex flex-wrap gap-2">
            {d.shenSha.map((ss, i) => (
              <div key={i} className="group relative px-3 py-1.5 rounded-lg border border-gold/20 bg-gold/5 text-gold text-xs cursor-default">
                {ss.name}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy-800 border border-gold/30 rounded text-white/70 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {ss.description}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sections Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex overflow-x-auto gap-1 mb-4 pb-1">
          {sectionsList.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-all ${activeSection === s.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/60 hover:text-gold border border-gold/20'}`}
            >
              {s.icon} {s.label}
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
                <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm flex items-center justify-center flex-shrink-0 font-serif">{i + 1}</span>
                <p className="text-white/80 text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lucky Info */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
            <div className="text-white/40 text-xs mb-1">吉数</div>
            <div className="text-gold font-serif">{(d.luckyInfo.numbers || []).join(' · ')}</div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
            <div className="text-white/40 text-xs mb-1">吉色</div>
            <div className="text-gold font-serif text-sm">{(d.luckyInfo.colors || []).join(' ')}</div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
            <div className="text-white/40 text-xs mb-1">吉方</div>
            <div className="text-gold font-serif text-sm">{(d.luckyInfo.directions || []).join(' ')}</div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
