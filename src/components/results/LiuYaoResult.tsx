'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../LanguageContext'
import dynamic from 'next/dynamic'
const XuanjiChat = dynamic(() => import('./XuanjiChat'), { ssr: false })

interface LiuYaoLine {
  position: number; yaoName: string; value: number
  isYang: boolean; isChanging: boolean
  branch: string; element: string; sixRelative: string
  isShiYao: boolean; isYingYao: boolean
}

interface HexagramData {
  name: string; fullName: string; number: number
  palace?: string; palaceElement?: string
  upperTrigram?: { name: string; symbol: string; element: string; nature: string }
  lowerTrigram?: { name: string; symbol: string; element: string; nature: string }
  lines: LiuYaoLine[]
}

interface LiuYaoData {
  originalHexagram?: HexagramData
  changedHexagram?: HexagramData | null
  changingLines?: number[]
  guaCi?: string; yaoCi?: string; interpretation?: string
  sixRelativeAnalysis?: string; shiYingAnalysis?: string
  changingAnalysis?: string; timing?: string; advice?: string
  outcome?: string; keyPoints?: string[]
}

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

const elementColor: Record<string, string> = {
  '金': 'text-gray-300', '木': 'text-green-400', '水': 'text-blue-400',
  '火': 'text-red-400', '土': 'text-yellow-500',
}

const sixRelativeColor: Record<string, string> = {
  '父母': 'text-purple-400', '兄弟': 'text-cyan-400', '子孙': 'text-green-400',
  '妻财': 'text-yellow-400', '官鬼': 'text-red-400',
}

const outcomeColor: Record<string, string> = {
  '大吉': 'text-jade border-jade/40 bg-jade/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
  '小凶': 'text-orange-300 border-orange-300/40 bg-orange-300/10',
}

function HexagramVisual({ hex, label, showDetails }: { hex: HexagramData; label?: string; showDetails?: boolean }) {
  return (
    <div className="text-center">
      {label && <div className="text-white/40 text-xs mb-2">{label}</div>}
      <h3 className="text-gold font-serif text-xl mb-1">{hex.fullName}</h3>
      {hex.palace && <div className="text-white/50 text-xs mb-3">{hex.palace}宫 · {hex.palaceElement}</div>}

      {/* Lines — displayed bottom to top */}
      <div className="flex flex-col items-center gap-1 my-4">
        {[...hex.lines].reverse().map((line, ri) => {
          const isChanging = line.isChanging
          return (
            <div key={ri} className={`flex items-center gap-2 sm:gap-3 w-full max-w-xs mx-auto px-1 py-0.5 rounded ${isChanging ? 'bg-amber-500/5' : ''}`}>
              {/* Six relative */}
              {showDetails && (
                <span className={`text-[10px] sm:text-xs w-8 text-right flex-shrink-0 ${sixRelativeColor[line.sixRelative] || 'text-white/50'}`}>
                  {line.sixRelative}
                </span>
              )}
              {/* Line visual */}
              <div className="flex items-center gap-0.5 flex-1 justify-center">
                {line.isYang ? (
                  <div className={`w-16 sm:w-20 h-2 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/70'}`} />
                ) : (
                  <>
                    <div className={`w-6 sm:w-8 h-2 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/50'}`} />
                    <div className="w-2 sm:w-3" />
                    <div className={`w-6 sm:w-8 h-2 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/50'}`} />
                  </>
                )}
                {isChanging && <span className="text-amber-400 text-[10px] ml-0.5">✕</span>}
              </div>
              {/* Branch & Element */}
              {showDetails && (
                <span className={`text-[10px] sm:text-xs w-12 flex-shrink-0 ${elementColor[line.element] || 'text-white/50'}`}>
                  {line.branch}{line.element}
                  {line.isShiYao && <span className="text-gold ml-0.5">世</span>}
                  {line.isYingYao && <span className="text-white/40 ml-0.5">应</span>}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Trigrams */}
      {hex.upperTrigram && hex.lowerTrigram && (
        <div className="flex justify-center gap-6 mt-3">
          {[
            { t: hex.upperTrigram, label: '上卦' },
            { t: hex.lowerTrigram, label: '下卦' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-lg">{item.t.symbol}</div>
              <div className="text-gold text-xs">{item.t.name}({item.t.nature})</div>
              <div className="text-white/30 text-[10px]">{item.label} · {item.t.element}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LiuYaoResult({ data, rawResult, isShared }: { data: Record<string, unknown>; rawResult?: string; isShared?: boolean }) {
  const { lang } = useLang()
  const d = data as unknown as LiuYaoData
  const [activeTab, setActiveTab] = useState<string>('interpretation')

  const tabs = [
    { key: 'interpretation', label: T(lang, '卦象解讀', 'Interpretation'), icon: '📖' },
    { key: 'sixRelative', label: T(lang, '六親分析', 'Six Relatives'), icon: '👥' },
    { key: 'shiYing', label: T(lang, '世應分析', 'Shi-Ying'), icon: '⚖️' },
    ...(d.changingAnalysis ? [{ key: 'changing', label: T(lang, '變卦分析', 'Changing'), icon: '🔄' }] : []),
    { key: 'advice', label: T(lang, '建議', 'Advice'), icon: '💡' },
  ]

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hexagram Display */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 sm:p-6 border border-gold/20">

        {d.changedHexagram ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            <div>
              <HexagramVisual hex={d.originalHexagram!} label={T(lang, '本卦', 'Original')} showDetails />
            </div>
            <div>
              <HexagramVisual hex={d.changedHexagram} label={T(lang, '變卦', 'Changed')} showDetails />
            </div>
          </div>
        ) : d.originalHexagram ? (
          <HexagramVisual hex={d.originalHexagram} showDetails />
        ) : null}

        {/* Outcome Badge */}
        <div className="text-center mt-4">
          <span className={`inline-block px-4 py-1.5 rounded-full border text-sm font-semibold ${ocClass}`}>
            {oc}
          </span>
        </div>
      </motion.div>

      {/* Gua Ci & Yao Ci */}
      {(d.guaCi || d.yaoCi) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {d.guaCi && (
            <div className="glass-card rounded-xl p-4 sm:p-5 border border-gold/20">
              <h4 className="text-gold font-serif text-sm mb-2">卦辭</h4>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{d.guaCi}</p>
            </div>
          )}
          {d.yaoCi && (
            <div className="glass-card rounded-xl p-4 sm:p-5 border border-gold/20">
              <h4 className="text-gold font-serif text-sm mb-2">爻辭</h4>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{d.yaoCi}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Timing */}
      {d.timing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="glass-card rounded-xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/5">
          <h4 className="text-amber-400 font-serif text-sm mb-2">⏳ {T(lang, '應期', 'Timing')}</h4>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{d.timing}</p>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex flex-wrap gap-1 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                activeTab === t.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/60 hover:text-gold border border-gold/20'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}

        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <div className="glass-card rounded-xl p-4 sm:p-5 border border-gold/20 text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
              {activeTab === 'interpretation' && (d.interpretation || T(lang, '暫無內容', 'No content'))}
              {activeTab === 'sixRelative' && (d.sixRelativeAnalysis || T(lang, '暫無內容', 'No content'))}
              {activeTab === 'shiYing' && (d.shiYingAnalysis || T(lang, '暫無內容', 'No content'))}
              {activeTab === 'changing' && (d.changingAnalysis || T(lang, '暫無內容', 'No content'))}
              {activeTab === 'advice' && (d.advice || T(lang, '暫無內容', 'No content'))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Xuanji Chat */}
      {!isShared && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="glass-card rounded-xl p-4 sm:p-6 border-2 border-gold/30">
            <h3 className="flex items-center gap-2 text-gold font-serif text-base sm:text-lg mb-3">
              <span className="text-xl">☯</span>
              <span className="bg-gradient-to-r from-amber-400 to-gold bg-clip-text text-transparent font-semibold">
                {T(lang, '玄機破', 'Xuanji Po')}
              </span>
            </h3>
            <XuanjiChat readingResult={rawResult || ''} readingType="liuyao" />
          </div>
        </motion.div>
      )}

      {/* Key Points */}
      {d.keyPoints && d.keyPoints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-4 sm:p-5 border border-gold/20">
          <h4 className="text-gold font-serif mb-3">{T(lang, '要點', 'Key Points')}</h4>
          <ul className="space-y-2">
            {d.keyPoints.map((pt, i) => (
              <li key={i} className="flex gap-2 text-white/70 text-sm">
                <span className="text-gold flex-shrink-0">☯</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
