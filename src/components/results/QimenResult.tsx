'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface QimenPalace {
  name: string
  number: number
  direction: string
  star: string
  door: string
  divinity: string
  heavenStem: string
  earthStem: string
}

interface QimenChartInfo {
  year?: string
  month?: string
  day?: string
  hour?: string
  solarTerm?: string
  round?: number
  roundLabel?: string
  zhiFu?: string
  zhiShi?: string
  palaces?: QimenPalace[]
  grid?: (QimenPalace | null)[][]
}

interface QimenData {
  palace: { inquiry: string; outcome: string; god: string; star: string; door: string }
  sections: { situation: string; trend: string; timing: string; strategy: string }
  outcome: string
  keyAdvice: string[]
  luckyInfo: { timing: string; direction: string }
  qimenChart?: QimenChartInfo
}

const outcomeColor: Record<string, string> = {
  '大吉': 'text-green-300 border-green-300/40 bg-green-300/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
}

const doorColor: Record<string, string> = {
  '开门': 'text-green-400',
  '生门': 'text-green-300',
  '休门': 'text-blue-400',
  '景门': 'text-yellow-400',
  '杜门': 'text-orange-400',
  '伤门': 'text-orange-300',
  '死门': 'text-red-400',
  '惊门': 'text-red-300',
}

const divinityColor: Record<string, string> = {
  '值符': 'text-yellow-300',
  '九天': 'text-blue-300',
  '九地': 'text-green-300',
  '六合': 'text-cyan-300',
  '太阴': 'text-purple-300',
  '螣蛇': 'text-orange-300',
  '白虎': 'text-white',
  '玄武': 'text-gray-300',
}

const accordionSections = [
  { key: 'situation', label: '當前局勢', icon: '⚡' },
  { key: 'trend', label: '事態走向', icon: '🔮' },
  { key: 'timing', label: '最佳時機', icon: '⏰' },
  { key: 'strategy', label: '行動策略', icon: '🎯' },
]

export default function QimenResult({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as QimenData
  const [openSection, setOpenSection] = useState<string | null>('situation')
  const [selectedPalace, setSelectedPalace] = useState<QimenPalace | null>(null)

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']
  const chart = d.qimenChart
  const hasProgrammaticData = !!chart?.palaces?.length

  return (
    <div className="space-y-6">
      {/* Chart Info Bar */}
      {hasProgrammaticData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-3 sm:p-4 border border-cyan-400/30 bg-cyan-400/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 text-xs sm:text-sm">奇門遁甲盤</span>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <div>
              <span className="text-white/40">干支：</span>
              <span className="text-white/80">{chart.year} {chart.month} {chart.day} {chart.hour}</span>
            </div>
            <div>
              <span className="text-white/40">節氣：</span>
              <span className="text-white/80">{chart.solarTerm}</span>
            </div>
            <div>
              <span className="text-white/40">局數：</span>
              <span className="text-cyan-300 font-semibold">{chart.roundLabel}</span>
            </div>
            <div>
              <span className="text-white/40">值符/值使：</span>
              <span className="text-yellow-300">{chart.zhiFu}</span>
              <span className="text-white/40"> / </span>
              <span className="text-blue-300">{chart.zhiShi}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 9-Palace Grid */}
      {hasProgrammaticData && chart.grid ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card rounded-xl p-3 sm:p-5 border border-gold/20">
          <h3 className="text-gold font-serif mb-3">九宮盤</h3>
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 bg-gold/10 rounded-lg overflow-hidden">
            {chart.grid.map((row, ri) =>
              row.map((palace, ci) => {
                if (!palace) return <div key={`${ri}-${ci}`} className="bg-navy-950/90 p-2" />
                const isCenter = palace.number === 5
                return (
                  <div
                    key={`${ri}-${ci}`}
                    onClick={() => setSelectedPalace(selectedPalace?.number === palace.number ? null : palace)}
                    className={`bg-navy-950/90 p-1.5 sm:p-2.5 cursor-pointer transition-all hover:bg-gold/5 min-h-[80px] sm:min-h-[100px] ${
                      selectedPalace?.number === palace.number ? 'ring-1 ring-gold/50' : ''
                    } ${isCenter ? 'bg-gold/3' : ''}`}
                  >
                    {/* Header: palace name + direction */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/40 text-[9px] sm:text-[10px]">{palace.direction}</span>
                      <span className="text-white/30 text-[9px]">{palace.name}</span>
                    </div>
                    {/* Divinity (八神) */}
                    {palace.divinity && (
                      <div className={`text-[10px] sm:text-xs ${divinityColor[palace.divinity] || 'text-white/50'}`}>
                        {palace.divinity}
                      </div>
                    )}
                    {/* Door (八门) */}
                    {palace.door && (
                      <div className={`text-[11px] sm:text-sm font-serif font-semibold ${doorColor[palace.door] || 'text-gold'}`}>
                        {palace.door}
                      </div>
                    )}
                    {/* Star (九星) */}
                    {palace.star && (
                      <div className="text-[10px] sm:text-xs text-white/60">
                        {palace.star}
                      </div>
                    )}
                    {/* Heaven/Earth stems */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {palace.heavenStem && (
                        <span className="text-[9px] sm:text-[10px] text-cyan-400/70">天{palace.heavenStem}</span>
                      )}
                      {palace.earthStem && (
                        <span className="text-[9px] sm:text-[10px] text-orange-400/60">地{palace.earthStem}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      ) : (
        /* Fallback: original palace cards */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border border-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gold font-serif">奇門格局</h3>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: '问事宫', value: d.palace?.inquiry },
              { label: '结果宫', value: d.palace?.outcome },
              { label: '值符神', value: d.palace?.god },
              { label: '值符星', value: d.palace?.star },
              { label: '当值门', value: d.palace?.door },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-xs mb-1">{label}</div>
                <div className="text-gold font-serif text-sm">{value || '—'}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Selected Palace Detail */}
      <AnimatePresence>
        {selectedPalace && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 border border-cyan-400/30 bg-cyan-400/5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cyan-300 font-serif">{selectedPalace.name} · {selectedPalace.direction}</h3>
              <button onClick={() => setSelectedPalace(null)} className="text-white/40 text-xs hover:text-white/60">收起</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">八神</div>
                <div className={`font-serif ${divinityColor[selectedPalace.divinity] || 'text-white/60'}`}>{selectedPalace.divinity || '—'}</div>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">八門</div>
                <div className={`font-serif ${doorColor[selectedPalace.door] || 'text-gold'}`}>{selectedPalace.door || '—'}</div>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">九星</div>
                <div className="text-white/70 font-serif">{selectedPalace.star || '—'}</div>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">天干</div>
                <div className="font-serif">
                  <span className="text-cyan-400">天{selectedPalace.heavenStem}</span>
                  {' '}
                  <span className="text-orange-400">地{selectedPalace.earthStem}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Palace summary cards (when programmatic data exists) */}
      {hasProgrammaticData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 border border-gold/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gold font-serif text-sm">格局要素</h3>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: '问事宫', value: d.palace?.inquiry },
              { label: '结果宫', value: d.palace?.outcome },
              { label: '值符', value: chart.zhiFu },
              { label: '值使', value: chart.zhiShi },
              { label: '当值门', value: d.palace?.door },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-0.5">{label}</div>
                <div className="text-gold font-serif text-xs sm:text-sm">{value || '—'}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Accordion Sections */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
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
                    {d.sections?.[s.key as keyof typeof d.sections] || '暫無內容'}
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
              <div className="text-white/40 text-xs mb-1">吉時</div>
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
