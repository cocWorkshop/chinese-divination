'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'

interface ZiweiStar {
  name: string
  type?: string
  brightness?: string
  mutagen?: string
}

interface ZiweiPalaceData {
  stars: string[]
  majorStars?: ZiweiStar[]
  minorStars?: ZiweiStar[]
  adjectiveStars?: ZiweiStar[]
  heavenlyStem?: string
  earthlyBranch?: string
  isBodyPalace?: boolean
  changsheng12?: string
  decadal?: { range: number[]; heavenlyStem: string; earthlyBranch: string }
  ages?: number[]
  analysis: string
}

interface ZiweiChartInfo {
  solarDate?: string
  lunarDate?: string
  chineseDate?: string
  time?: string
  timeRange?: string
  zodiac?: string
  gender?: string
  fiveElementsClass?: string
  soul?: string
  body?: string
  siHua?: { star: string; type: string; palace: string }[]
}

interface ZiweiData {
  mainStars: { name: string; palace: string; element?: string; brightness?: string; mutagen?: string }[]
  palaces: Record<string, ZiweiPalaceData>
  sections: { overview: string; career: string; marriage: string; wealth: string }
  keyAdvice: string[]
  luckyInfo: { numbers: number[]; colors: string[]; directions: string[] }
  ziweiChart?: ZiweiChartInfo
}

const mutagenColor: Record<string, string> = {
  '禄': 'text-green-400',
  '权': 'text-blue-400',
  '科': 'text-yellow-400',
  '忌': 'text-red-400',
}

const brightnessColor: Record<string, string> = {
  '庙': 'text-yellow-300',
  '旺': 'text-green-300',
  '得': 'text-blue-300',
  '利': 'text-cyan-300',
  '平': 'text-white/60',
  '不': 'text-white/40',
  '闲': 'text-white/40',
  '陷': 'text-red-300',
}

// Traditional 紫微斗数 12-palace grid layout (4x4 with center empty)
// Layout follows the traditional Chinese astrological chart:
//   巳    午    未    申
//   辰              酉
//   卯              戌
//   寅    丑    子    亥
const GRID_POSITIONS: { row: number; col: number; branch: string }[] = [
  { row: 0, col: 0, branch: '巳' },
  { row: 0, col: 1, branch: '午' },
  { row: 0, col: 2, branch: '未' },
  { row: 0, col: 3, branch: '申' },
  { row: 1, col: 0, branch: '辰' },
  { row: 1, col: 3, branch: '酉' },
  { row: 2, col: 0, branch: '卯' },
  { row: 2, col: 3, branch: '戌' },
  { row: 3, col: 0, branch: '寅' },
  { row: 3, col: 1, branch: '丑' },
  { row: 3, col: 2, branch: '子' },
  { row: 3, col: 3, branch: '亥' },
]

// Fallback for matching palace names with different character variants
// English annotations for palace names
const PALACE_EN: Record<string, string> = {
  '命宫': 'Life', '兄弟宫': 'Siblings', '夫妻宫': 'Spouse', '子女宫': 'Children',
  '财帛宫': 'Wealth', '疾厄宫': 'Health', '迁移宫': 'Travel', '奴仆宫': 'Friends',
  '官禄宫': 'Career', '田宅宫': 'Property', '福德宫': 'Fortune', '父母宫': 'Parents',
}

// Zodiac English
const ZODIAC_EN: Record<string, string> = {
  '鼠': 'Rat', '牛': 'Ox', '虎': 'Tiger', '兔': 'Rabbit', '龙': 'Dragon', '蛇': 'Snake',
  '马': 'Horse', '羊': 'Goat', '猴': 'Monkey', '鸡': 'Rooster', '狗': 'Dog', '猪': 'Pig',
  '龍': 'Dragon', '馬': 'Horse', '雞': 'Rooster', '豬': 'Pig',
}

// Helper: translate palace name
const palaceLabel = (name: string, lang: string) => {
  if (lang !== 'en') return name
  const en = PALACE_EN[name]
  return en ? `${name} (${en})` : name
}

// Helper: translate zodiac
const zodiacLabel = (zodiac: string, lang: string) => {
  if (lang !== 'en' || !zodiac) return zodiac
  const en = ZODIAC_EN[zodiac]
  return en ? `${zodiac} (${en})` : zodiac
}

const PALACE_NAME_VARIANTS: Record<string, string[]> = {
  '命宫': ['命宫', '命宮'],
  '兄弟宫': ['兄弟宫', '兄弟宮'],
  '夫妻宫': ['夫妻宫', '夫妻宮'],
  '子女宫': ['子女宫', '子女宮'],
  '财帛宫': ['财帛宫', '財帛宮', '财帛宮'],
  '疾厄宫': ['疾厄宫', '疾厄宮'],
  '迁移宫': ['迁移宫', '遷移宮', '迁移宮'],
  '奴仆宫': ['奴仆宫', '奴僕宮', '交友宫', '交友宮', '僕役宮', '仆役宫'],
  '官禄宫': ['官禄宫', '官祿宮', '官禄宮'],
  '田宅宫': ['田宅宫', '田宅宮'],
  '福德宫': ['福德宫', '福德宮'],
  '父母宫': ['父母宫', '父母宮'],
}

function findPalace(palaces: Record<string, ZiweiPalaceData>, canonicalName: string): ZiweiPalaceData | undefined {
  const variants = PALACE_NAME_VARIANTS[canonicalName] || [canonicalName]
  for (const v of variants) {
    if (palaces[v]) return palaces[v]
  }
  return undefined
}

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

const sectionTabs = [
  { key: 'overview', label: '總覽', en: 'Overview' },
  { key: 'career', label: '事業', en: 'Career' },
  { key: 'marriage', label: '婚姻', en: 'Marriage' },
  { key: 'wealth', label: '財運', en: 'Wealth' },
]

export default function ZiweiResult({ data, isShared, rawResult, readingId, chatMessages }: { data: Record<string, unknown>; isShared?: boolean; rawResult?: string; readingId?: string | null; chatMessages?: { role: 'user' | 'assistant'; content: string }[] }) {
  const { lang } = useLang()
  const d = data as unknown as ZiweiData
  const [activeSection, setActiveSection] = useState('overview')
  const [selectedPalace, setSelectedPalace] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(false)

  const palaces = d.palaces || {}
  const chart = d.ziweiChart
  const hasProgrammaticData = !!chart

  // Build a branch→palace mapping for grid layout
  const branchToPalace: Record<string, { palaceName: string; data: ZiweiPalaceData }> = {}
  const palaceNames = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '奴仆宫', '官禄宫', '田宅宫', '福德宫', '父母宫']

  for (const name of palaceNames) {
    const p = findPalace(palaces, name)
    if (p?.earthlyBranch) {
      branchToPalace[p.earthlyBranch] = { palaceName: name, data: p }
    }
  }

  // Also try mapping all palaces by their earthlyBranch
  for (const [pName, pData] of Object.entries(palaces)) {
    if (pData.earthlyBranch && !branchToPalace[pData.earthlyBranch]) {
      branchToPalace[pData.earthlyBranch] = { palaceName: pName, data: pData }
    }
  }

  const selectedPalaceData = selectedPalace ? findPalace(palaces, selectedPalace) || palaces[selectedPalace] : null

  return (
    <div className="space-y-6">
      {/* ═══ CHART DATA (Collapsible, default collapsed) ═══ */}
      <button onClick={() => setShowChart(!showChart)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm"
        style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)', color: 'var(--gold)' }}>
        <span className="font-serif flex items-center gap-2">⭐ {T(lang, '紫微命盤', 'Zi Wei Chart')}</span>
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
          className="glass-card rounded-xl p-3 sm:p-4 border border-purple-400/30 bg-purple-400/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400 text-xs sm:text-sm">{T(lang, '命盤資訊', 'Chart Info')}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <div>
              <span className="text-white/40">{T(lang, '農曆：', 'Lunar: ')}</span>
              <span className="text-white/80">{chart.lunarDate}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '干支：', 'Stems: ')}</span>
              <span className="text-white/80">{chart.chineseDate}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '時辰：', 'Hour: ')}</span>
              <span className="text-white/80">{chart.time} ({chart.timeRange})</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '生肖：', 'Zodiac: ')}</span>
              <span className="text-white/80">{zodiacLabel(chart.zodiac || '', lang)}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '五行局：', 'Five Elements: ')}</span>
              <span className="text-purple-300 font-semibold">{chart.fiveElementsClass}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '命主：', 'Soul Lord: ')}</span>
              <span className="text-gold">{chart.soul}</span>
            </div>
            <div>
              <span className="text-white/40">{T(lang, '身主：', 'Body Lord: ')}</span>
              <span className="text-gold">{chart.body}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 四化 (Four Transformations) */}
      {chart?.siHua && chart.siHua.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="glass-card rounded-xl p-4 border border-gold/20">
          <h3 className="text-gold font-serif text-sm mb-3">{T(lang, '四化飛星', 'Four Transformations')}</h3>
          <div className="flex flex-wrap gap-2">
            {chart.siHua.map((sh) => (
              <div key={`${sh.star}-${sh.type}`} className={`px-3 py-1.5 rounded-lg border border-gold/20 bg-gold/5 text-center`}>
                <span className={`font-serif text-sm ${mutagenColor[sh.type] || 'text-gold'}`}>
                  {sh.star}化{sh.type}
                </span>
                <span className="text-white/40 text-xs ml-1">({palaceLabel(sh.palace, lang)})</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Stars - shown when no programmatic data or as compact view */}
      {!hasProgrammaticData && (d.mainStars || []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5 border border-gold/20">
          <h3 className="text-gold font-serif mb-3">{T(lang, '主星配置', 'Main Stars')}</h3>
          <div className="flex flex-wrap gap-2">
            {(d.mainStars || []).map((star) => (
              <div key={star.name} className="px-3 py-1.5 rounded-lg border border-gold/30 bg-gold/10 text-center">
                <div className="text-gold font-serif text-sm">
                  {star.name}
                  {star.mutagen && <span className={`ml-1 ${mutagenColor[star.mutagen] || ''}`}>({star.mutagen})</span>}
                </div>
                <div className="text-white/50 text-xs">{palaceLabel(star.palace, lang)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Traditional 12-Palace Grid (4x4 with center area) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass-card rounded-xl p-3 sm:p-5 border border-gold/20">
        <h3 className="text-gold font-serif mb-3">{T(lang, '命盤', 'Natal Chart')}</h3>
        <div className="grid grid-cols-4 gap-[2px] sm:gap-1 bg-gold/10 rounded-lg overflow-hidden">
          {[0, 1, 2, 3].map(row => (
            [0, 1, 2, 3].map(col => {
              const gridPos = GRID_POSITIONS.find(g => g.row === row && g.col === col)
              const isCenter = (row === 1 || row === 2) && (col === 1 || col === 2)

              if (isCenter) {
                // Center area — show chart info in the combined center
                if (row === 1 && col === 1) {
                  return (
                    <div key={`${row}-${col}`} className="col-span-2 row-span-2 bg-navy-950/90 p-2 sm:p-3 flex flex-col items-center justify-center text-center">
                      <div className="text-gold font-serif text-sm sm:text-base mb-1">{T(lang, '紫微斗數', 'Zi Wei Dou Shu')}</div>
                      {hasProgrammaticData && (
                        <>
                          <div className="text-white/50 text-[10px] sm:text-xs">{chart.fiveElementsClass}</div>
                          <div className="text-white/40 text-[10px] sm:text-xs mt-1">{T(lang, '命主', 'Soul')} {chart.soul} · {T(lang, '身主', 'Body')} {chart.body}</div>
                        </>
                      )}
                    </div>
                  )
                }
                return null // other center cells consumed by col-span/row-span
              }

              if (!gridPos) return <div key={`${row}-${col}`} className="bg-navy-950/90 p-2" />

              const palaceInfo = branchToPalace[gridPos.branch]
              // Fallback: find palace by position in original palace order if no branch mapping
              const palaceName = palaceInfo?.palaceName
              const pData = palaceInfo?.data
              const hasStars = pData && pData.stars && pData.stars.length > 0
              const isSoul = palaceName === '命宫'

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => palaceName && setSelectedPalace(selectedPalace === palaceName ? null : palaceName)}
                  className={`bg-navy-950/90 p-1 sm:p-2 cursor-pointer transition-all hover:bg-gold/5 min-h-[70px] sm:min-h-[90px] ${
                    selectedPalace === palaceName ? 'ring-1 ring-gold/50' : ''
                  } ${isSoul ? 'border-l-2 border-l-gold/40' : ''}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[10px] sm:text-xs ${isSoul ? 'text-gold font-semibold' : 'text-white/50'}`}>
                      {palaceName ? palaceLabel(palaceName, lang) : gridPos.branch}
                    </span>
                    <span className="text-white/20 text-[9px]">{pData?.heavenlyStem}{gridPos.branch}</span>
                  </div>
                  {pData?.isBodyPalace && (
                    <span className="text-purple-400 text-[9px]">{T(lang, '身', 'Body')}</span>
                  )}
                  <div className="flex flex-wrap gap-x-1 gap-y-0">
                    {(pData?.majorStars || []).map((star) => (
                      <span key={`major-${star.name}`} className={`text-[10px] sm:text-xs font-serif font-semibold ${
                        star.mutagen ? mutagenColor[star.mutagen] || 'text-gold' : 'text-gold'
                      }`}>
                        {star.name}
                        {star.mutagen && <sup className="text-[8px]">{star.mutagen}</sup>}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-1 gap-y-0 mt-0.5">
                    {(pData?.minorStars || []).slice(0, 4).map((star) => (
                      <span key={`minor-${star.name}`} className={`text-[9px] sm:text-[10px] ${
                        star.mutagen ? mutagenColor[star.mutagen] || 'text-white/50' : 'text-white/40'
                      }`}>
                        {star.name}
                        {star.mutagen && <sup className="text-[7px]">{star.mutagen}</sup>}
                      </span>
                    ))}
                  </div>
                  {/* Brightness indicators for major stars */}
                  {(pData?.majorStars || []).some(s => s.brightness) && (
                    <div className="flex gap-1 mt-0.5">
                      {(pData?.majorStars || []).filter(s => s.brightness).map((star) => (
                        <span key={`bright-${star.name}`} className={`text-[8px] sm:text-[9px] ${brightnessColor[star.brightness || ''] || 'text-white/30'}`}>
                          {star.brightness}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Decadal range */}
                  {pData?.decadal?.range && pData.decadal.range.length === 2 && (
                    <div className="text-white/20 text-[8px] mt-0.5">
                      {pData.decadal.range[0]}-{pData.decadal.range[1]}
                    </div>
                  )}
                  {!hasStars && !pData?.majorStars?.length && (
                    <span className="text-white/10 text-xs">—</span>
                  )}
                </div>
              )
            })
          )).flat().filter(Boolean)}
        </div>
      </motion.div>

      {/* Selected Palace Detail */}
      <AnimatePresence>
        {selectedPalace && selectedPalaceData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 border border-purple-400/30 bg-purple-400/5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-purple-300 font-serif">{palaceLabel(selectedPalace, lang)}</h3>
              <button onClick={() => setSelectedPalace(null)} className="text-white/40 text-xs hover:text-white/60">{T(lang, '收起', 'Close')}</button>
            </div>
            {/* Stars detail */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(selectedPalaceData.majorStars || []).map((star) => (
                <div key={`detail-major-${star.name}`} className="px-2 py-1 rounded border border-gold/30 bg-gold/10">
                  <span className={`text-sm font-serif font-semibold ${star.mutagen ? mutagenColor[star.mutagen] : 'text-gold'}`}>
                    {star.name}
                  </span>
                  {star.brightness && (
                    <span className={`ml-1 text-xs ${brightnessColor[star.brightness] || 'text-white/40'}`}>
                      ({star.brightness})
                    </span>
                  )}
                  {star.mutagen && <span className={`ml-1 text-xs ${mutagenColor[star.mutagen]}`}>化{star.mutagen}</span>}
                </div>
              ))}
              {(selectedPalaceData.minorStars || []).map((star) => (
                <div key={`detail-minor-${star.name}`} className="px-2 py-1 rounded border border-white/10 bg-white/5">
                  <span className={`text-xs ${star.mutagen ? mutagenColor[star.mutagen] : 'text-white/60'}`}>
                    {star.name}
                    {star.mutagen && <span className="ml-0.5">化{star.mutagen}</span>}
                  </span>
                </div>
              ))}
            </div>
            {/* Analysis text */}
            {selectedPalaceData.analysis && (
              <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedPalaceData.analysis}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lucky Info (inside chart collapsible) */}
      {d.luckyInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="grid grid-cols-3 gap-2 sm:gap-3">
          {d.luckyInfo.numbers?.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '吉数', 'Lucky Numbers')}</div>
              <div className="text-gold font-serif">{d.luckyInfo.numbers.join(' · ')}</div>
            </div>
          )}
          {d.luckyInfo.colors?.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '吉色', 'Lucky Colors')}</div>
              <div className="text-gold font-serif text-sm">{d.luckyInfo.colors.join(' ')}</div>
            </div>
          )}
          {d.luckyInfo.directions?.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-gold/20 text-center">
              <div className="text-white/40 text-xs mb-1">{T(lang, '吉方', 'Lucky Directions')}</div>
              <div className="text-gold font-serif text-sm">{d.luckyInfo.directions.join(' ')}</div>
            </div>
          )}
        </motion.div>
      )}

        </motion.div>
      )}
      </AnimatePresence>

      {/* ═══ XUANJI Q&A ═══ */}
      <XuanjiChatCard readingResult={rawResult || ''} readingType="ziwei" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.1} />

      {/* ═══ SECTIONS TABS (Analysis) ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex flex-wrap gap-1 mb-4">
          {sectionTabs.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${activeSection === s.key ? 'bg-gold text-navy-950 font-semibold' : 'text-white/60 hover:text-gold border border-gold/20'}`}
            >
              {lang === 'en' ? s.en : s.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <div className="glass-card rounded-xl p-5 border border-gold/20 text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
              {d.sections?.[activeSection as keyof typeof d.sections] || T(lang, '暫無內容', 'No content')}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Key Advice */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif mb-3">{T(lang, '核心建議', 'Key Advice')}</h3>
          <div className="grid gap-3">
            {d.keyAdvice.map((advice, idx) => (
              <div key={`advice-${idx}`} className="glass-card rounded-xl p-4 border border-gold/20 flex gap-3">
                <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                <p className="text-white/80 text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  )
}
