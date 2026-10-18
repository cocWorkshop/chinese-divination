'use client'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { useLang } from '../LanguageContext'
import { useMasterChatActions } from '@/components/master/MasterChatContext'
import XuanjiChatCard from './XuanjiChatCard'
import SectionDrawer from './SectionDrawer'
import StreamingSection from './StreamingSection'
import StreamingKeyAdvice from './StreamingKeyAdvice'
import PersonInfoHeader from './PersonInfoHeader'
import type { DivinationResultProps, LiuYaoData, HexagramData } from '@/types/divination'
import { T } from '@/lib/i18n'
import {
  LiuYaoIcon,
  FamilyIcon,
  KeyPredictionIcon,
  RefreshIcon,
  SunMoonIcon,
  ScrollIcon,
  SparkleIcon,
  MasterSageIcon,
} from '@/components/DivinationIcons'

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

function HexagramVisual({ hex, label, showDetails, lang }: { hex: HexagramData; label?: string; showDetails?: boolean; lang: string }) {
  return (
    <div className="text-center">
      {label && <div className="text-[var(--text-muted)] text-xs mb-2">{label}</div>}
      <h3 className="text-gold font-serif text-xl mb-1">{hex.fullName}</h3>
      {hex.palace && <div className="text-[var(--text-muted)] text-xs mb-3">{hex.palace}{T(lang, '宫', ' Palace')} · {hex.palaceElement}</div>}

      {/* Lines — displayed bottom to top */}
      <div className="flex flex-col items-center gap-1 my-4">
        {[...hex.lines].reverse().map((line, ri) => {
          const isChanging = line.isChanging
          return (
            <div key={ri} className={`flex items-center gap-2 sm:gap-3 w-full max-w-xs mx-auto px-1 py-0.5 rounded ${isChanging ? 'bg-amber-500/5' : ''}`}>
              {showDetails && (
                <span className={`text-[10px] sm:text-xs w-8 text-right flex-shrink-0 ${sixRelativeColor[line.sixRelative] || 'text-[var(--text-muted)]'}`}>
                  {line.sixRelative}
                </span>
              )}
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
              {showDetails && (
                <span className={`text-[10px] sm:text-xs w-12 flex-shrink-0 ${elementColor[line.element] || 'text-[var(--text-muted)]'}`}>
                  {line.branch}{line.element}
                  {line.isShiYao && <span className="text-gold ml-0.5">世</span>}
                  {line.isYingYao && <span className="text-[var(--text-muted)] ml-0.5">应</span>}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {hex.upperTrigram && hex.lowerTrigram && (
        <div className="flex justify-center gap-6 mt-3">
          {[
            { t: hex.upperTrigram, label: '上卦' },
            { t: hex.lowerTrigram, label: '下卦' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-lg">{item.t.symbol}</div>
              <div className="text-gold text-xs">{item.t.name}({item.t.nature})</div>
              <div className="text-[var(--text-muted)] text-[10px]">{T(lang, item.label, item.label === '上卦' ? 'Upper' : 'Lower')} · {item.t.element}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LiuYaoResult({ data, rawResult, isShared, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: DivinationResultProps) {
  const { lang } = useLang()
  const d = data as unknown as LiuYaoData
  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']

  // Analysis sections — interpretation is pulled out as overview
  const analysisSections = [
    { icon: <FamilyIcon size={16} />, label: T(lang, '六親分析', 'Six Relatives'), content: d.sixRelativeAnalysis },
    { icon: <KeyPredictionIcon size={16} />, label: T(lang, '世應分析', 'Shi-Ying'), content: d.shiYingAnalysis },
    ...(d.changingAnalysis ? [{ icon: <RefreshIcon size={16} />, label: T(lang, '變卦分析', 'Changing'), content: d.changingAnalysis }] : []),
  ]

  const masterChat = useMasterChatActions()

  const handleAskMasterAboutHexagram = () => {
    if (!masterChat) return
    if (!masterChat.enabled) {
      toast.error(T(lang, '請先登入後向玄機大師深度解盤', 'Please sign in to consult Master Xuanji'))
      return
    }
    masterChat.setShape('expanded')
    const orig = d.originalHexagram?.fullName || ''
    const chg = d.changedHexagram?.fullName ? `，變卦為【${d.changedHexagram.fullName}】` : ''
    const timingStr = d.timing ? `，應期在【${d.timing}】` : ''
    const prompt = T(
      lang,
      `請玄機大師為我推求六爻卦象：本卦為【${orig}】${chg}${timingStr}。請結合我所問之事，深入解析世應生剋、動爻化象及動靜變化的深層吉凶與趨吉避凶之策。`,
      `Master Xuanji, please delve into my Liu Yao divination result: Original Hexagram 【${orig}】${d.changedHexagram?.fullName ? ` changing to 【${d.changedHexagram.fullName}】` : ''}${d.timing ? ` (Timing: ${d.timing})` : ''}. In relation to my query, what are the subtle shifts between the Shi and Ying lines, changing lines, and tactical actions I should take?`,
    )
    masterChat.sendMessage(prompt)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PersonInfoHeader subjectName={subjectName} birthInfo={birthInfo} createdAt={createdAt} />

      {/* ═══ ① CHART — hexagram visual + outcome + classical text ═══ */}
      <SectionDrawer icon={<LiuYaoIcon size={20} />} title={T(lang, '卦象', 'Hexagram')} align="center" size="lg">
        <div className="space-y-4">
          {d.changedHexagram ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-6">
              <HexagramVisual hex={d.originalHexagram!} label={T(lang, '本卦', 'Original')} showDetails lang={lang} />
              <HexagramVisual hex={d.changedHexagram} label={T(lang, '變卦', 'Changed')} showDetails lang={lang} />
            </div>
          ) : d.originalHexagram ? (
            <HexagramVisual hex={d.originalHexagram} showDetails lang={lang} />
          ) : null}

          <div className="text-center">
            <span className={`inline-block px-4 py-1.5 rounded-full border text-sm font-semibold ${ocClass}`}>{oc}</span>
          </div>

          {(d.guaCi || d.yaoCi) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.guaCi && (
                <div className="rounded-lg p-3 border border-gold/15 bg-gold/5">
                  <h4 className="text-gold font-serif text-sm mb-1.5">{T(lang, '卦辭', 'Judgment')}</h4>
                  <div className="text-[var(--text-secondary)] text-sm leading-relaxed ziwei-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.guaCi}</ReactMarkdown>
                  </div>
                </div>
              )}
              {d.yaoCi && (
                <div className="rounded-lg p-3 border border-gold/15 bg-gold/5">
                  <h4 className="text-gold font-serif text-sm mb-1.5">{T(lang, '爻辭', 'Line Text')}</h4>
                  <div className="text-[var(--text-secondary)] text-sm leading-relaxed ziwei-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.yaoCi}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {d.timing && (
            <div className="rounded-lg p-3 border border-amber-500/30 bg-amber-500/5">
              <h4 className="text-amber-400 font-serif text-sm mb-1.5 flex items-center gap-1.5">
                <SunMoonIcon size={16} isDark={true} color="var(--gold)" />
                <span>{T(lang, '應期', 'Timing')}</span>
              </h4>
              <div className="text-[var(--text-secondary)] text-sm leading-relaxed ziwei-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.timing}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Master Consultation Trigger */}
          <div className="pt-3 mt-3 border-t border-gold/20 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-[var(--text-muted)] font-serif">
              {T(lang, '欲求此卦之動爻變化、世應玄機與應期指引？', "Seek Master XuanJi's deeper insight on this hexagram?")}
            </p>
            <button
              onClick={handleAskMasterAboutHexagram}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
            >
              <MasterSageIcon size={14} color="#0a0f1e" />
              <span>{T(lang, '向玄機大師深入解卦 →', 'Consult Master XuanJi →')}</span>
            </button>
          </div>
        </div>
      </SectionDrawer>

      {/* ═══ ② OVERVIEW — interpretation, always visible ═══ */}
      {(() => {
        const hasContent = typeof d.interpretation === 'string' && d.interpretation.trim().length > 0
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className={`px-1 sm:px-2 transition-all duration-500 ${streaming && !hasContent ? 'blur-[6px] opacity-60 select-none' : ''}`}
          >
            <h3 className="text-gold font-serif text-base mb-3 flex items-center gap-2">
              <ScrollIcon size={18} />
              <span>{T(lang, '卦象解讀', 'Interpretation')}</span>
            </h3>
            <div className="text-[var(--text-secondary)] text-base leading-relaxed ziwei-markdown break-words">
              {hasContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.interpretation}</ReactMarkdown>
              ) : streaming ? (
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {T(lang, '此段正在由玄機大師撰寫，請稍候片刻…', 'Being composed by Master Xuanji…')}
                </p>
              ) : (
                <span className="text-[var(--text-muted)] text-sm">{T(lang, '暫無內容', 'No content')}</span>
              )}
            </div>
          </motion.div>
        )
      })()}

      {/* ═══ ③ ANALYSIS SECTIONS — drawers ═══ */}
      <div className="space-y-2">
        {analysisSections.map((s) => (
          <StreamingSection key={s.label} icon={s.icon} title={s.label} content={s.content} streaming={streaming} dotAnimName="dotPulseLY" />
        ))}
      </div>
      <style jsx global>{`
        @keyframes dotPulseLY {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ═══ ④ FOOTER — key points + advice + QA ═══ */}
      <StreamingKeyAdvice
        title={T(lang, '要點', 'Key Points')}
        icon={<SparkleIcon size={16} className="text-gold" />}
        items={d.keyPoints}
        streaming={streaming}
        delay={0.1}
      />

      {(d.advice || streaming) && (
        <StreamingSection
          icon={<SparkleIcon size={16} className="text-gold" />}
          title={T(lang, '建議', 'Advice')}
          content={typeof d.advice === 'string' ? d.advice : undefined}
          streaming={streaming}
          dotAnimName="dotPulseLY"
        />
      )}

      {!streaming && <XuanjiChatCard readingResult={rawResult || ''} readingType="liuyao" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />}
    </div>
  )
}
