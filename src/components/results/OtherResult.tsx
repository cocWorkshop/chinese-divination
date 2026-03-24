'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'
import { useLang } from '../LanguageContext'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

interface MeihuaTrigram {
  name: string
  symbol: string
  element: string
  lines: number[]
}

interface MeihuaHexagram {
  name: string
  upper: MeihuaTrigram
  lower: MeihuaTrigram
  lines: number[]
}

interface MeihuaChartInfo {
  lunarYear?: number
  lunarMonth?: number
  lunarDay?: number
  shichen?: number
  yearBranch?: string
  yearNum?: number
  monthNum?: number
  dayNum?: number
  hourNum?: number
  upperNum?: number
  lowerNum?: number
  changingLine?: number
  benGua?: MeihuaHexagram
  huGua?: MeihuaHexagram
  bianGua?: MeihuaHexagram
  tiGua?: MeihuaTrigram
  yongGua?: MeihuaTrigram
  tiYongRelation?: string
  tiYongAnalysis?: string
}

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
  meihuaChart?: MeihuaChartInfo
}

const outcomeColor: Record<string, string> = {
  '大吉': 'text-green-300 border-green-300/40 bg-green-300/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
}

const elementColor: Record<string, string> = {
  '金': 'text-gray-300', '木': 'text-green-400', '水': 'text-blue-400', '火': 'text-red-400', '土': 'text-yellow-500',
}

const relationColor: Record<string, string> = {
  '用生体': 'text-green-400 border-green-400/40 bg-green-400/10',
  '体克用': 'text-blue-400 border-blue-400/40 bg-blue-400/10',
  '体用比和': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '体生用': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '用克体': 'text-red-400 border-red-400/40 bg-red-400/10',
}

// Render a single hexagram line
function HexagramLine({ yang, isChanging, index }: { yang: boolean; isChanging: boolean; index: number }) {
  return (
    <div className="flex items-center gap-1 justify-center" key={index}>
      {yang ? (
        <div className={`h-[4px] sm:h-[5px] rounded-full flex-1 ${isChanging ? 'bg-red-400' : 'bg-gold'}`} />
      ) : (
        <>
          <div className={`h-[4px] sm:h-[5px] rounded-full flex-1 ${isChanging ? 'bg-red-400' : 'bg-gold'}`} />
          <div className="w-2 sm:w-3" />
          <div className={`h-[4px] sm:h-[5px] rounded-full flex-1 ${isChanging ? 'bg-red-400' : 'bg-gold'}`} />
        </>
      )}
      {isChanging && <span className="text-red-400 text-[8px] ml-1">动</span>}
    </div>
  )
}

// Render a full hexagram (6 lines from top to bottom visually, but data is bottom-to-top)
function HexagramDisplay({ hexagram, changingLine, label, lang }: { hexagram: MeihuaHexagram; changingLine?: number; label: string; lang: string }) {
  const lines = hexagram.lines || []
  return (
    <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 sm:p-4 text-center">
      <div className="text-white/40 text-xs mb-2">{label}</div>
      <div className="text-gold font-serif text-sm sm:text-base mb-2">{hexagram.name}</div>
      <div className="flex flex-col gap-1.5 w-16 sm:w-20 mx-auto">
        {/* Render from top (line 6) to bottom (line 1) */}
        {[...lines].reverse().map((line, i) => {
          const lineNum = lines.length - i // 6 down to 1
          return <HexagramLine key={i} yang={line === 1} isChanging={changingLine === lineNum} index={i} />
        })}
      </div>
      <div className="flex justify-center gap-2 mt-2">
        <div>
          <span className={`text-xs ${elementColor[hexagram.upper?.element || ''] || 'text-gold'}`}>
            {hexagram.upper?.name}({hexagram.upper?.element})
          </span>
        </div>
        <div>
          <span className={`text-xs ${elementColor[hexagram.lower?.element || ''] || 'text-gold'}`}>
            {hexagram.lower?.name}({hexagram.lower?.element})
          </span>
        </div>
      </div>
    </div>
  )
}

export default function OtherResult({ data }: { data: Record<string, unknown> }) {
  const { lang } = useLang()
  const d = data as unknown as OtherData
  const [openSection, setOpenSection] = useState<string | null>('situation')

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']
  const mc = d.meihuaChart
  const hasMeihuaData = !!mc?.benGua

  const accordionSections = [
    { key: 'situation', label: '體卦分析', en: 'Ti Trigram Analysis', icon: '☰' },
    { key: 'inquiry', label: '用卦分析', en: 'Yong Trigram Analysis', icon: '☯' },
    { key: 'interaction', label: '體用關係', en: 'Ti-Yong Relationship', icon: '⚡' },
    { key: 'timeline', label: '時間推斷', en: 'Timing Prediction', icon: '⏰' },
  ]

  return (
    <div className="space-y-6">
      {/* Meihua Chart Info */}
      {hasMeihuaData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-3 sm:p-4 border border-amber-400/30 bg-amber-400/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 text-xs sm:text-sm">{T(lang, '梅花易數 · 時間起卦', 'Meihua Yishu · Time-based Casting')}</span>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <div>
              <span className="text-white/40">{T(lang, '農曆：', 'Lunar: ')}</span>
              <span className="text-white/80">{mc.lunarYear}{T(lang, '年', '/')}{mc.lunarMonth}{T(lang, '月', '/')}{mc.lunarDay}{T(lang, '日', '')}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '年支：', 'Year Branch: ')}</span>
              <span className="text-white/80">{mc.yearBranch}{T(lang, '（數', ' (num ')}{mc.yearNum}{T(lang, '）', ')')}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '上卦數：', 'Upper #: ')}</span>
              <span className="text-white/80">{mc.yearNum}+{mc.monthNum}+{mc.dayNum}=%8→{mc.upperNum}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '下卦數：', 'Lower #: ')}</span>
              <span className="text-white/80">+{mc.hourNum}=%8→{mc.lowerNum}</span>
            </div>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs">
            <span className="text-white/40">{T(lang, '動爻：', 'Changing Line: ')}</span>
            <span className="text-red-400">{T(lang, `第${mc.changingLine}爻`, `Line ${mc.changingLine}`)}</span>
          </div>
        </motion.div>
      )}

      {/* Hexagram Visualization */}
      {hasMeihuaData && mc.benGua && mc.huGua && mc.bianGua ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card rounded-xl p-4 sm:p-5 border border-gold/20">
          <h3 className="text-gold font-serif mb-4 text-center">{T(lang, '卦象', 'Hexagrams')}</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <HexagramDisplay hexagram={mc.benGua} changingLine={mc.changingLine} label={T(lang, '本卦', 'Original')} lang={lang} />
            <HexagramDisplay hexagram={mc.huGua} label={T(lang, '互卦', 'Mutual')} lang={lang} />
            <HexagramDisplay hexagram={mc.bianGua} label={T(lang, '變卦', 'Changed')} lang={lang} />
          </div>
        </motion.div>
      ) : (
        /* Fallback: original trigram cards */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 border border-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gold font-serif">{d.subType === 'liuren' ? T(lang, '六壬神課', 'Liu Ren Oracle') : T(lang, '梅花易數', 'Meihua Yishu')}</h3>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: T(lang, '體卦(上)', 'Ti (Upper)'), data: d.trigrams?.upper },
              { label: T(lang, '用卦(下)', 'Yong (Lower)'), data: d.trigrams?.lower },
              { label: T(lang, '变卦', 'Changed'), data: d.trigrams?.transformed },
            ].map(({ label, data: t }) => (
              <div key={label} className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-center">
                <div className="text-white/40 text-xs mb-2">{label}</div>
                <div className="text-4xl mb-1">{t?.symbol || '☰'}</div>
                <div className="text-gold font-serif">{t?.name || '?'}</div>
                <div className="text-white/50 text-xs">{t?.element}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 体用关系 */}
      {hasMeihuaData && mc.tiGua && mc.yongGua && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 border border-gold/20">
          <h3 className="text-gold font-serif text-sm mb-3">{T(lang, '體用關係', 'Ti-Yong Relationship')}</h3>
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '體卦', 'Ti Trigram')}</div>
              <div className={`text-lg font-serif ${elementColor[mc.tiGua.element] || 'text-gold'}`}>
                {mc.tiGua.symbol} {mc.tiGua.name}
              </div>
              <div className={`text-xs ${elementColor[mc.tiGua.element] || 'text-white/50'}`}>{mc.tiGua.element}</div>
            </div>
            <div className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${relationColor[mc.tiYongRelation || ''] || 'border-gold/30 text-gold'}`}>
              {mc.tiYongRelation}
            </div>
            <div className="text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '用卦', 'Yong Trigram')}</div>
              <div className={`text-lg font-serif ${elementColor[mc.yongGua.element] || 'text-gold'}`}>
                {mc.yongGua.symbol} {mc.yongGua.name}
              </div>
              <div className={`text-xs ${elementColor[mc.yongGua.element] || 'text-white/50'}`}>{mc.yongGua.element}</div>
            </div>
          </div>
          {mc.tiYongAnalysis && (
            <div className="text-white/60 text-xs text-center">{mc.tiYongAnalysis}</div>
          )}
        </motion.div>
      )}

      {/* Accordion */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
        {accordionSections.map(s => (
          <div key={s.key} className="glass-card rounded-xl border border-gold/20 overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === s.key ? null : s.key)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <span className="text-gold font-serif">{s.icon === '☯' ? <><YinYangIcon size={16} /> </> : s.icon} {lang === 'en' ? s.en : s.label}</span>
              <span className="text-white/40">{openSection === s.key ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {openSection === s.key && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-4 text-white/70 text-sm leading-relaxed border-t border-gold/10 pt-3 whitespace-pre-wrap">
                    {d.sections?.[s.key as keyof typeof d.sections] || T(lang, '暫無內容', 'No content')}
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
    </div>
  )
}
