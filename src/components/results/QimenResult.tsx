'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { useLang } from '../LanguageContext'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import XuanjiChatCard from './XuanjiChatCard'
import SectionDrawer from './SectionDrawer'
import StreamingSection from './StreamingSection'
import StreamingKeyAdvice from './StreamingKeyAdvice'
import StreamingLuckyInfo from './StreamingLuckyInfo'
import PersonInfoHeader from './PersonInfoHeader'
import type { DivinationResultProps, QimenData, QimenPalace } from '@/types/divination'
import { T } from '@/lib/i18n'
import {
  QiMenIcon,
  KeyPredictionIcon,
  SparkleIcon,
  SunMoonIcon,
  MasterSageIcon,
} from '@/components/DivinationIcons'

const outcomeColor: Record<string, string> = {
  '大吉': 'text-green-300 border-green-300/40 bg-green-300/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
}

const doorColor: Record<string, string> = {
  '开门': 'text-green-400', '生门': 'text-green-300', '休门': 'text-blue-400',
  '景门': 'text-yellow-400', '杜门': 'text-orange-400', '伤门': 'text-orange-300',
  '死门': 'text-red-400', '惊门': 'text-red-300',
}

const divinityColor: Record<string, string> = {
  '值符': 'text-yellow-300', '九天': 'text-blue-300', '九地': 'text-green-300',
  '六合': 'text-cyan-300', '太阴': 'text-purple-300', '螣蛇': 'text-orange-300',
  '白虎': 'text-[var(--text-primary)]', '玄武': 'text-gray-300',
}

function adaptPaipanData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data.paipanOnly || !(data.qimenChart || data.qimen)) return data
  const qData = (data.qimenChart || data.qimen) as Record<string, unknown>
  return { qimenChart: qData, paipanOnly: true, sections: { situation: '（只排盤模式，不含解盤）' } }
}

export default function QimenResult({ data, isShared, rawResult, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const { lang } = useLang()
  const d = adaptPaipanData(data) as unknown as QimenData
  const [selectedPalace, setSelectedPalace] = useState<QimenPalace | null>(null)
  const masterChat = useMasterChatActions()

  const handleAskMasterAboutPalace = (palace: QimenPalace) => {
    if (!masterChat) return
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    masterChat.setShape('expanded')
    const prompt = T(
      lang,
      `請大師為我推究奇門遁甲盤中的【${palace.name}】（方位：${palace.direction}）。此宮神為【${palace.divinity || '無'}】，門為【${palace.door || '無'}】，星為【${palace.star || '無'}】，天盤干【${palace.heavenStem || '無'}】，地盤干【${palace.earthStem || '無'}】。請結合我所問之事，解析此宮蘊含的吉凶象意、天時地利與具體決策建議。`,
      `Master Xuanji, please delve into the Qi Men Dun Jia Palace 【${palace.name}】 (Direction: ${palace.direction}). Deity: 【${palace.divinity || 'None'}】, Door: 【${palace.door || 'None'}】, Star: 【${palace.star || 'None'}】, Heaven Stem: 【${palace.heavenStem || 'None'}】, Earth Stem: 【${palace.earthStem || 'None'}】. In relation to my query, what are the omen indications, cosmic timing, and actionable counsel?`,
    )
    masterChat.sendMessage(prompt)
  }

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']
  const chart = d.qimenChart
  const hasProgrammaticData = !!chart?.palaces?.length

  return (
    <div className="space-y-4 sm:space-y-5">
      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ ① CHART — 9-palace grid + chart info + patterns ═══ */}
      <SectionDrawer icon={<QiMenIcon size={20} />} title={T(lang, '奇門格局', 'Qi Men Formation')} align="center" size="lg">
        <div className="space-y-4">
          {/* Chart Info Bar */}
          {hasProgrammaticData && (
            <div className="card-mystic-l1 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gold text-xs sm:text-sm">{T(lang, '奇門遁甲盤', 'Qi Men Dun Jia Chart')}</span>
                <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <div><span className="text-[var(--text-muted)]">{T(lang, '干支：', 'Stems: ')}</span><span className="text-[var(--text-secondary)]">{chart.year} {chart.month} {chart.day} {chart.hour}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '節氣：', 'Solar Term: ')}</span><span className="text-[var(--text-secondary)]">{chart.solarTerm}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '局數：', 'Formation: ')}</span><span className="text-gold-light font-semibold">{chart.roundLabel}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '值符/值使：', 'Duty: ')}</span><span className="text-yellow-300">{chart.zhiFu}</span><span className="text-[var(--text-muted)]"> / </span><span className="text-blue-300">{chart.zhiShi}</span></div>
              </div>
            </div>
          )}

          {/* Key positions — 值符/值使落宫, 旬空, 驿马 (the analysis anchors) */}
          {hasProgrammaticData && (chart.zhiFuPalace || (chart.voidBranches && chart.voidBranches.length > 0)) && (
            <div className="card-quiet rounded-xl p-3 sm:p-4 border border-gold/20">
              <h3 className="text-gold font-serif text-sm mb-2 flex items-center gap-1.5">
                <KeyPredictionIcon size={16} className="text-gold" />
                <span>{T(lang, '關鍵落宮', 'Key Positions')}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <div><span className="text-[var(--text-muted)]">{T(lang, '值符落宮：', '值符 @ ')}</span><span className="text-yellow-300">{chart.zhiFu}{chart.zhiFuPalace ? ` · ${chart.zhiFuPalace}` : ''}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '值使落宮：', '值使 @ ')}</span><span className="text-blue-300">{chart.zhiShi}{chart.zhiShiPalace ? ` · ${chart.zhiShiPalace}` : ''}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '旬空：', 'Void: ')}</span><span className="text-[var(--text-secondary)]">{chart.voidBranches && chart.voidBranches.length ? chart.voidBranches.join('') : '—'}{chart.voidPalaces && chart.voidPalaces.length ? `（${chart.voidPalaces.join('、')}）` : ''}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '驛馬：', 'Horse: ')}</span><span className="text-[var(--text-secondary)]">{chart.horseBranch || '—'}{chart.horsePalace ? `（${chart.horsePalace}）` : ''}</span></div>
              </div>
            </div>
          )}

          {/* Patterns */}
          {chart?.patterns && chart.patterns.length > 0 && (
            <div className="card-quiet rounded-xl p-3 sm:p-4 border border-gold/20">
              <h3 className="text-gold font-serif text-sm mb-2 flex items-center gap-1.5">
                <SparkleIcon size={16} className="text-gold" />
                <span>{T(lang, '奇門格局', 'Patterns')}</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {chart.patterns.map((p, i) => (
                  <span key={i} className={`group relative px-2 py-1 rounded-lg border text-xs font-medium cursor-default ${p.type === 'auspicious' ? 'border-green-400/30 bg-green-400/10 text-green-300' : p.type === 'inauspicious' ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'}`}>
                    {p.name}{p.palace && <span className="text-[var(--text-muted)] ml-1">@{p.palace}</span>}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--bg-surface)] border border-gold/30 rounded text-[var(--text-secondary)] text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-[200px] text-wrap shadow-lg">{p.description}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 9-Palace Grid */}
          {hasProgrammaticData && chart.grid ? (
            <div className="card-quiet rounded-xl p-3 sm:p-5 border border-gold/20">
              <h3 className="text-gold font-serif text-sm mb-3">{T(lang, '九宮盤', 'Nine Palace Chart')}</h3>
              <div className="grid grid-cols-3 gap-[2px] sm:gap-1 bg-gold/10 rounded-lg overflow-hidden">
                {chart.grid.map((row, ri) =>
                  row.map((palace, ci) => {
                    if (!palace) return <div key={`${ri}-${ci}`} className="bg-[var(--accent-bg)] p-2" />
                    const isCenter = palace.number === 5
                    return (
                      <div key={`${ri}-${ci}`} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setSelectedPalace(selectedPalace?.number === palace.number ? null : palace) }} onClick={() => setSelectedPalace(selectedPalace?.number === palace.number ? null : palace)}
                        className={`bg-[var(--accent-bg)] p-1.5 sm:p-2.5 cursor-pointer transition-all hover:bg-gold/5 min-h-[80px] sm:min-h-[100px] ${selectedPalace?.number === palace.number ? 'ring-1 ring-gold/50' : ''} ${isCenter ? 'bg-gold/10' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[var(--text-muted)] text-[9px] sm:text-[10px]">{palace.direction}</span>
                          <span className="text-[var(--text-muted)] text-[9px]">{palace.name}</span>
                        </div>
                        {palace.divinity && <div className={`text-[10px] sm:text-xs ${divinityColor[palace.divinity] || 'text-[var(--text-muted)]'}`}>{palace.divinity}</div>}
                        {palace.door && <div className={`text-[11px] sm:text-sm font-serif font-semibold ${doorColor[palace.door] || 'text-gold'}`}>{palace.door}</div>}
                        {palace.star && <div className="text-[10px] sm:text-xs text-[var(--text-secondary)]">{palace.star}</div>}
                        <div className="flex items-center gap-1 mt-0.5">
                          {palace.heavenStem && <span className="text-[9px] sm:text-[10px] text-gold/70">{T(lang, '天', 'H')}{palace.heavenStem}</span>}
                          {palace.earthStem && <span className="text-[9px] sm:text-[10px] text-orange-400/60">{T(lang, '地', 'E')}{palace.earthStem}</span>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="card-quiet rounded-xl p-5 border border-gold/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gold font-serif">{T(lang, '奇門格局', 'Qi Men Formation')}</h3>
                <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: T(lang, '问事宫', 'Inquiry'), value: d.palace?.inquiry },
                  { label: T(lang, '结果宫', 'Outcome'), value: d.palace?.outcome },
                  { label: T(lang, '值符神', 'Divinity'), value: d.palace?.god },
                  { label: T(lang, '值符星', 'Star'), value: d.palace?.star },
                  { label: T(lang, '当值门', 'Door'), value: d.palace?.door },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-center min-w-[60px]">
                    <div className="text-[var(--text-muted)] text-[10px] mb-0.5 whitespace-nowrap">{label}</div>
                    <div className="text-gold font-serif text-xs sm:text-sm whitespace-nowrap">{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Palace Detail */}
          <AnimatePresence>
            {selectedPalace && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="card-mystic-l1 rounded-xl p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gold-light font-serif">{selectedPalace.name} · {selectedPalace.direction}</h3>
                  <button onClick={() => setSelectedPalace(null)} className="text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)]">{T(lang, '收起', 'Close')}</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {[
                    { label: T(lang, '八神', 'Divinity'), value: selectedPalace.divinity, color: divinityColor[selectedPalace.divinity] },
                    { label: T(lang, '八門', 'Door'), value: selectedPalace.door, color: doorColor[selectedPalace.door] },
                    { label: T(lang, '九星', 'Star'), value: selectedPalace.star },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                      <div className="text-[var(--text-muted)] text-[10px] mb-1">{item.label}</div>
                      <div className={`font-serif ${item.color || 'text-[var(--text-secondary)]'}`}>{item.value || '—'}</div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                    <div className="text-[var(--text-muted)] text-[10px] mb-1">{T(lang, '天干', 'Stems')}</div>
                    <div className="font-serif"><span className="text-gold">{T(lang, '天', 'H')}{selectedPalace.heavenStem}</span>{' '}<span className="text-orange-400">{T(lang, '地', 'E')}{selectedPalace.earthStem}</span></div>
                  </div>
                </div>

                {/* Master Consultation Trigger */}
                <div className="pt-3 mt-3 border-t border-gold/20 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] text-[var(--text-muted)] font-serif">
                    {T(lang, '欲知此宮落位對所問之事的生剋感應與轉機？', "Seek Master XuanJi's insight on this palace?")}
                  </p>
                  <button
                    onClick={() => handleAskMasterAboutPalace(selectedPalace)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
                  >
                    <MasterSageIcon size={14} />
                    <span>{T(lang, `向玄機大師推求【${selectedPalace.name}】`, `Ask Master about ${selectedPalace.name}`)}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formation Elements summary */}
          {hasProgrammaticData && (
            <div className="card-quiet rounded-xl p-4 border border-gold/20">
              <h3 className="text-gold font-serif text-sm mb-3">{T(lang, '格局要素', 'Formation Elements')}</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: T(lang, '问事宫', 'Inquiry'), value: d.palace?.inquiry },
                  { label: T(lang, '结果宫', 'Outcome'), value: d.palace?.outcome },
                  { label: T(lang, '值符', 'Duty Star'), value: chart.zhiFu },
                  { label: T(lang, '值使', 'Duty Door'), value: chart.zhiShi },
                  { label: T(lang, '当值门', 'Door'), value: d.palace?.door },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gold/20 bg-gold/5 p-2 text-center">
                    <div className="text-[var(--text-muted)] text-[10px] mb-0.5">{label}</div>
                    <div className="text-gold font-serif text-xs sm:text-sm">{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionDrawer>

      {/* ═══ ② OVERVIEW — situation, always visible ═══ */}
      {(() => {
        const content = d.sections?.situation
        const hasContent = typeof content === 'string' && content.trim().length > 0
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <QiMenIcon size={18} />
              <span>{T(lang, '當前局勢', 'Current Situation')}</span>
            </h3>
            <div className="text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown break-words">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : streaming ? (
                <p className="text-[var(--text-muted)] leading-relaxed">{T(lang, '此段正在由玄機大師撰寫，請稍候片刻…', 'Being composed by Master Xuanji…')}</p>
              ) : (
                <span className="text-[var(--text-muted)] text-sm">{T(lang, '暫無內容', 'No content')}</span>
              )}
            </div>
          </motion.div>
        )
      })()}

      {/* ═══ ③ ANALYSIS SECTIONS — drawers ═══ */}
      <div className="space-y-2">
        <StreamingSection icon={<KeyPredictionIcon size={16} className="text-gold" />} title={T(lang, '事態走向', 'Trend')} content={d.sections?.trend} streaming={streaming} dotAnimName="dotPulseQM" />
        <StreamingSection icon={<SunMoonIcon size={16} isDark={true} color="var(--gold)" />} title={T(lang, '最佳時機', 'Best Timing')} content={d.sections?.timing} streaming={streaming} dotAnimName="dotPulseQM" />
        <StreamingSection icon={<SparkleIcon size={16} className="text-gold" />} title={T(lang, '行動策略', 'Strategy')} content={d.sections?.strategy} streaming={streaming} dotAnimName="dotPulseQM" />
      </div>
      <style jsx global>{`
        @keyframes dotPulseQM {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ ④ FOOTER — advice + lucky info + QA ═══ */}
      <StreamingKeyAdvice
        title={T(lang, '核心建議', 'Key Advice')}
        icon={<SparkleIcon size={16} className="text-gold" />}
        items={d.keyAdvice}
        streaming={streaming}
        delay={0.08}
      />

      <StreamingLuckyInfo luckyInfo={d.luckyInfo} streaming={streaming} delay={0.1} mode="grid" />

      {/* Reveal Q&A only after streaming completes (consistent with V2 results). */}
      {!streaming && <XuanjiChatCard readingResult={rawResult || ''} readingType="qimen" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />}
    </div>
  )
}
