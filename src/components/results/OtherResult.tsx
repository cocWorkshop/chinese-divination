'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLang } from '../LanguageContext'
import XuanjiChatCard from './XuanjiChatCard'
import SectionDrawer from './SectionDrawer'
import StreamingSection from './StreamingSection'
import PersonInfoHeader from './PersonInfoHeader'
import type { DivinationResultProps, OtherData, MeihuaHexagram } from '@/types/divination'
import { T } from '@/lib/i18n'

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

function HexagramDisplay({ hexagram, changingLine, label, lang }: { hexagram: MeihuaHexagram; changingLine?: number; label: string; lang: string }) {
  const lines = hexagram.lines || []
  return (
    <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 sm:p-4 text-center">
      <div className="text-[var(--text-muted)] text-xs mb-2">{label}</div>
      <div className="text-gold font-serif text-sm sm:text-base mb-2">{hexagram.name}</div>
      <div className="flex flex-col gap-1.5 w-16 sm:w-20 mx-auto">
        {[...lines].reverse().map((line, i) => {
          const lineNum = lines.length - i
          return <HexagramLine key={i} yang={line === 1} isChanging={changingLine === lineNum} index={i} />
        })}
      </div>
      <div className="flex justify-center gap-2 mt-2">
        <span className={`text-xs ${elementColor[hexagram.upper?.element || ''] || 'text-gold'}`}>
          {hexagram.upper?.name}({hexagram.upper?.element})
        </span>
        <span className={`text-xs ${elementColor[hexagram.lower?.element || ''] || 'text-gold'}`}>
          {hexagram.lower?.name}({hexagram.lower?.element})
        </span>
      </div>
    </div>
  )
}

function adaptPaipanData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data.paipanOnly || !data.meihua) return data
  const meihuaData = data.meihua as Record<string, unknown>
  return { meihuaChart: meihuaData, subType: 'meihua', paipanOnly: true, sections: { situation: '（只排盤模式，無AI解盤）' } }
}

export default function OtherResult({ data, isShared, rawResult, readingId, readingType, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const { lang } = useLang()
  const d = adaptPaipanData(data) as unknown as OtherData
  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']
  const mc = d.meihuaChart
  const hasMeihuaData = !!mc?.benGua

  return (
    <div className="space-y-4 sm:space-y-5">
      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ ① CHART — meihua hexagrams + chart info + 體用關係 ═══ */}
      {hasMeihuaData ? (
        <SectionDrawer icon="🌸" title={T(lang, '梅花卦象', 'Mei Hua Chart')} align="center" size="lg">
          <div className="space-y-4">
            {/* Chart info */}
            <div className="glass-card rounded-xl p-3 sm:p-4 border border-amber-400/30 bg-amber-400/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 text-xs sm:text-sm">{T(lang, '梅花易數 · 時間起卦', 'Meihua · Time-based')}</span>
                <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <div><span className="text-[var(--text-muted)]">{T(lang, '農曆：', 'Lunar: ')}</span><span className="text-[var(--text-secondary)]">{mc.lunarYear}{T(lang, '年', '/')}{mc.lunarMonth}{T(lang, '月', '/')}{mc.lunarDay}{T(lang, '日', '')}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '年支：', 'Year: ')}</span><span className="text-[var(--text-secondary)]">{mc.yearBranch}（{mc.yearNum}）</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '上卦數：', 'Upper: ')}</span><span className="text-[var(--text-secondary)]">{mc.upperNum}</span></div>
                <div><span className="text-[var(--text-muted)]">{T(lang, '下卦數：', 'Lower: ')}</span><span className="text-[var(--text-secondary)]">{mc.lowerNum}</span></div>
              </div>
              <div className="mt-1.5 text-[11px] sm:text-xs">
                <span className="text-[var(--text-muted)]">{T(lang, '動爻：', 'Changing: ')}</span>
                <span className="text-red-400">{T(lang, `第${mc.changingLine}爻`, `Line ${mc.changingLine}`)}</span>
              </div>
            </div>

            {/* Hexagram triple display */}
            {mc.benGua && mc.huGua && mc.bianGua && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <HexagramDisplay hexagram={mc.benGua} changingLine={mc.changingLine} label={T(lang, '本卦', 'Original')} lang={lang} />
                <HexagramDisplay hexagram={mc.huGua} label={T(lang, '互卦', 'Mutual')} lang={lang} />
                <HexagramDisplay hexagram={mc.bianGua} label={T(lang, '變卦', 'Changed')} lang={lang} />
              </div>
            )}

            {/* Ti-Yong relationship */}
            {mc.tiGua && mc.yongGua && (
              <div className="glass-card rounded-xl p-4 border border-gold/20">
                <h3 className="text-gold font-serif text-sm mb-3">{T(lang, '體用關係', 'Ti-Yong')}</h3>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-[var(--text-muted)] text-xs mb-1">{T(lang, '體卦', 'Ti')}</div>
                    <div className={`text-lg font-serif ${elementColor[mc.tiGua.element] || 'text-gold'}`}>{mc.tiGua.symbol} {mc.tiGua.name}</div>
                    <div className={`text-xs ${elementColor[mc.tiGua.element] || 'text-[var(--text-muted)]'}`}>{mc.tiGua.element}</div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${relationColor[mc.tiYongRelation || ''] || 'border-gold/30 text-gold'}`}>{mc.tiYongRelation}</div>
                  <div className="text-center">
                    <div className="text-[var(--text-muted)] text-xs mb-1">{T(lang, '用卦', 'Yong')}</div>
                    <div className={`text-lg font-serif ${elementColor[mc.yongGua.element] || 'text-gold'}`}>{mc.yongGua.symbol} {mc.yongGua.name}</div>
                    <div className={`text-xs ${elementColor[mc.yongGua.element] || 'text-[var(--text-muted)]'}`}>{mc.yongGua.element}</div>
                  </div>
                </div>
                {mc.tiYongAnalysis && <div className="text-[var(--text-muted)] text-xs text-center">{mc.tiYongAnalysis}</div>}
              </div>
            )}
          </div>
        </SectionDrawer>
      ) : (
        /* Fallback: trigram cards for non-meihua types */
        <SectionDrawer icon="☰" title={T(lang, '卦象', 'Trigrams')} align="center" size="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gold font-serif">{d.subType === 'liuren' ? T(lang, '六壬神課', 'Liu Ren') : T(lang, '梅花易數', 'Meihua')}</h3>
            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: T(lang, '體卦(上)', 'Ti (Upper)'), data: d.trigrams?.upper },
              { label: T(lang, '用卦(下)', 'Yong (Lower)'), data: d.trigrams?.lower },
              { label: T(lang, '变卦', 'Changed'), data: d.trigrams?.transformed },
            ].map(({ label, data: t }) => (
              <div key={label} className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-center">
                <div className="text-[var(--text-muted)] text-xs mb-2">{label}</div>
                <div className="text-4xl mb-1">{t?.symbol || '☰'}</div>
                <div className="text-gold font-serif">{t?.name || '?'}</div>
                <div className="text-[var(--text-muted)] text-xs">{t?.element}</div>
              </div>
            ))}
          </div>
        </SectionDrawer>
      )}

      {/* ═══ ② OVERVIEW — situation/interpretation, always visible ═══ */}
      {(() => {
        const content = d.sections?.situation
        const hasContent = typeof content === 'string' && content.trim().length > 0
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}>
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <span aria-hidden>☰</span>
              <span>{T(lang, '體卦分析', 'Ti Analysis')}</span>
            </h3>
            <div className="text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown break-words">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content!}</ReactMarkdown>
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
        <StreamingSection icon="☯" title={T(lang, '用卦分析', 'Yong Analysis')} content={d.sections?.inquiry} streaming={streaming} dotAnimName="dotPulseMH" />
        <StreamingSection icon="⚡" title={T(lang, '體用關係', 'Ti-Yong Relationship')} content={d.sections?.interaction} streaming={streaming} dotAnimName="dotPulseMH" />
        <StreamingSection icon="⏰" title={T(lang, '時間推斷', 'Timing')} content={d.sections?.timeline} streaming={streaming} dotAnimName="dotPulseMH" />
      </div>
      <style jsx global>{`
        @keyframes dotPulseMH {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ ④ FOOTER — advice + QA ═══ */}
      {d.keyAdvice && d.keyAdvice.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-gold font-serif text-base mb-2">{T(lang, '核心建議', 'Key Advice')}</h3>
          <div className="grid gap-2">
            {d.keyAdvice.map((advice, i) => (
              <div key={i} className="glass-card rounded-xl p-3 border border-gold/20 flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] flex items-center justify-center flex-shrink-0 font-serif">{i + 1}</span>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <XuanjiChatCard readingResult={rawResult || ''} readingType={readingType || 'meihua'} readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />
    </div>
  )
}
