'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import type { DivinationResultProps, QimenData, QimenPalace, QimenPattern } from '@/types/divination'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

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

function adaptPaipanData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data.paipanOnly || !(data.qimenChart || data.qimen)) return data
  const qData = (data.qimenChart || data.qimen) as Record<string, unknown>
  return { qimenChart: qData, paipanOnly: true, sections: { situation: '（只排盤模式，無AI解盤）' } }
}

export default function QimenResult({ data, isShared, rawResult, readingId, chatMessages }: DivinationResultProps) {
  const { lang } = useLang()
  const d = adaptPaipanData(data) as unknown as QimenData
  const [openSection, setOpenSection] = useState<string | null>('situation')
  const [selectedPalace, setSelectedPalace] = useState<QimenPalace | null>(null)
  const [showChart, setShowChart] = useState(!!d.paipanOnly)

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']
  const chart = d.qimenChart
  const hasProgrammaticData = !!chart?.palaces?.length

  const accordionSections = [
    { key: 'situation', label: '當前局勢', en: 'Current Situation', icon: '⚡' },
    { key: 'trend', label: '事態走向', en: 'Trend', icon: '🔮' },
    { key: 'timing', label: '最佳時機', en: 'Best Timing', icon: '⏰' },
    { key: 'strategy', label: '行動策略', en: 'Strategy', icon: '🎯' },
  ]

  return (
    <div className="space-y-6">
      {/* ═══ CHART DATA (Collapsible) ═══ */}
      <button onClick={() => setShowChart(!showChart)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm"
        style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)', color: 'var(--gold)' }}>
        <span className="font-serif flex items-center gap-2">⚡ {T(lang, '奇門排盤', 'Qi Men Chart')}</span>
        <motion.span animate={{ rotate: showChart ? 180 : 0 }} transition={{ duration: 0.2 }}>▼</motion.span>
      </button>

      <AnimatePresence initial={false}>
      {showChart && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 overflow-hidden"
        >

      {/* Chart Info Bar */}
      {hasProgrammaticData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-3 sm:p-4 border border-cyan-400/30 bg-cyan-400/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 text-xs sm:text-sm">{T(lang, '奇門遁甲盤', 'Qi Men Dun Jia Chart')}</span>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <div>
              <span className="text-white/40">{T(lang, '干支：', 'Stems: ')}</span>
              <span className="text-white/80">{chart.year} {chart.month} {chart.day} {chart.hour}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '節氣：', 'Solar Term: ')}</span>
              <span className="text-white/80">{chart.solarTerm}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '局數：', 'Formation: ')}</span>
              <span className="text-cyan-300 font-semibold">{chart.roundLabel}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '值符/值使：', 'Duty Star/Door: ')}</span>
              <span className="text-yellow-300">{chart.zhiFu}</span>
              <span className="text-white/40"> / </span>
              <span className="text-blue-300">{chart.zhiShi}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Patterns / 格局 */}
      {chart?.patterns && chart.patterns.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-3 sm:p-4 border border-gold/20">
          <h3 className="text-gold font-serif text-sm mb-2">{T(lang, '⚡ 奇門格局', '⚡ Patterns')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {chart.patterns.map((p, i) => (
              <span
                key={i}
                className={`group relative px-2 py-1 rounded-lg border text-xs font-medium cursor-default ${
                  p.type === 'auspicious'
                    ? 'border-green-400/30 bg-green-400/10 text-green-300'
                    : p.type === 'inauspicious'
                    ? 'border-red-400/30 bg-red-400/10 text-red-300'
                    : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                }`}
              >
                {p.name}
                {p.palace && <span className="text-white/30 ml-1">@{p.palace}</span>}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-navy-800 border border-gold/30 rounded text-white/70 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-[200px] text-wrap">
                  {p.description}
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* 9-Palace Grid */}
      {hasProgrammaticData && chart.grid ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="glass-card rounded-xl p-3 sm:p-5 border border-gold/20">
          <h3 className="text-gold font-serif mb-3">{T(lang, '九宮盤', 'Nine Palace Chart')}</h3>
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
                        <span className="text-[9px] sm:text-[10px] text-cyan-400/70">{T(lang, '天', 'H')}{palace.heavenStem}</span>
                      )}
                      {palace.earthStem && (
                        <span className="text-[9px] sm:text-[10px] text-orange-400/60">{T(lang, '地', 'E')}{palace.earthStem}</span>
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
            <h3 className="text-gold font-serif">{T(lang, '奇門格局', 'Qi Men Formation')}</h3>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: T(lang, '问事宫', 'Inquiry'), value: d.palace?.inquiry },
              { label: T(lang, '结果宫', 'Outcome'), value: d.palace?.outcome },
              { label: T(lang, '值符神', 'Divinity'), value: d.palace?.god },
              { label: T(lang, '值符星', 'Star'), value: d.palace?.star },
              { label: T(lang, '当值门', 'Door'), value: d.palace?.door },
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
              <button onClick={() => setSelectedPalace(null)} className="text-white/40 text-xs hover:text-white/60">{T(lang, '收起', 'Close')}</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">{T(lang, '八神', 'Divinity')}</div>
                <div className={`font-serif ${divinityColor[selectedPalace.divinity] || 'text-white/60'}`}>{selectedPalace.divinity || '—'}</div>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">{T(lang, '八門', 'Door')}</div>
                <div className={`font-serif ${doorColor[selectedPalace.door] || 'text-gold'}`}>{selectedPalace.door || '—'}</div>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">{T(lang, '九星', 'Star')}</div>
                <div className="text-white/70 font-serif">{selectedPalace.star || '—'}</div>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-1">{T(lang, '天干', 'Stems')}</div>
                <div className="font-serif">
                  <span className="text-cyan-400">{T(lang, '天', 'H')}{selectedPalace.heavenStem}</span>
                  {' '}
                  <span className="text-orange-400">{T(lang, '地', 'E')}{selectedPalace.earthStem}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Palace summary cards (when programmatic data exists) */}
      {hasProgrammaticData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card rounded-xl p-4 border border-gold/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gold font-serif text-sm">{T(lang, '格局要素', 'Formation Elements')}</h3>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: T(lang, '问事宫', 'Inquiry'), value: d.palace?.inquiry },
              { label: T(lang, '结果宫', 'Outcome'), value: d.palace?.outcome },
              { label: T(lang, '值符', 'Duty Star'), value: chart.zhiFu },
              { label: T(lang, '值使', 'Duty Door'), value: chart.zhiShi },
              { label: T(lang, '当值门', 'Door'), value: d.palace?.door },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                <div className="text-white/40 text-[10px] mb-0.5">{label}</div>
                <div className="text-gold font-serif text-xs sm:text-sm">{value || '—'}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

        </motion.div>
      )}
      </AnimatePresence>

      {/* Accordion Sections (Analysis) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
        {accordionSections.map(s => (
          <div key={s.key} className="glass-card rounded-xl border border-gold/20 overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === s.key ? null : s.key)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <span className="text-gold font-serif">{s.icon} {lang === 'en' ? s.en : s.label}</span>
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
                  <div className="px-5 pb-4 text-white/70 text-sm leading-relaxed border-t border-gold/10 pt-3 ziwei-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {d.sections?.[s.key as keyof typeof d.sections] || T(lang, '暫無內容', 'No content')}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      {/* Key Advice */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif mb-3">{T(lang, '核心建議', 'Key Advice')}</h3>
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

      {/* Lucky Info */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3">
          {d.luckyInfo.timing && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '吉時', 'Auspicious Time')}</div>
              <div className="text-gold text-sm">{d.luckyInfo.timing}</div>
            </div>
          )}
          {d.luckyInfo.direction && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '吉方', 'Auspicious Direction')}</div>
              <div className="text-gold text-sm">{d.luckyInfo.direction}</div>
            </div>
          )}
        </motion.div>
      )}

      {/* 玄機問答 */}
      <XuanjiChatCard readingResult={rawResult || ''} readingType="qimen" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.1} />

    </div>
  )
}
