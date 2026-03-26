'use client'
import YinYangIcon from '@/components/YinYangIcon'
import XuanjiChatCard from './XuanjiChatCard'
import { motion } from 'framer-motion'
import { useLang } from '../LanguageContext'

import type { DivinationResultProps, IChingData } from '@/types/divination'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

const outcomeColor: Record<string, string> = {
  '大吉': 'text-jade border-jade/40 bg-jade/10',
  '吉': 'text-green-400 border-green-400/40 bg-green-400/10',
  '中': 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  '凶': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  '大凶': 'text-red-400 border-red-400/40 bg-red-400/10',
  '小凶': 'text-orange-300 border-orange-300/40 bg-orange-300/10',
}

export default function IChingResult({ data, rawResult, isShared, readingId, chatMessages }: DivinationResultProps) {
  const { lang } = useLang()
  const d = data as unknown as IChingData
  const lines = d.hexagram?.lines || []

  const oc = d.outcome || '中'
  const ocClass = outcomeColor[oc] || outcomeColor['中']

  return (
    <div className="space-y-6">
      {/* Outcome Badge */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <span className={`inline-block px-4 py-1.5 rounded-full border text-sm font-semibold ${ocClass}`}>
          {d.hexagram?.name} · {oc}
        </span>
      </motion.div>

      {/* Interpretation */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-5 border border-gold/20">
        <h4 className="text-gold font-serif mb-2">{T(lang, '卦象解读', 'Interpretation')}</h4>
        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{d.interpretation}</p>
      </motion.div>

      {/* Changing Lines */}
      {d.changingLines && d.changingLines.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card rounded-xl p-5 border border-gold/30 bg-gold/5">
          <h4 className="text-gold font-serif mb-3">{T(lang, '變爻', 'Changing Lines')}</h4>
          {d.changingLines.map((cl, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="text-gold text-sm">{T(lang, `第${cl.position}爻`, `Line ${cl.position}`)}</span>
              <p className="text-white/70 text-sm">{cl.text}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Key Points */}
      {d.keyPoints && d.keyPoints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5 border border-gold/20">
          <h4 className="text-gold font-serif mb-3">{T(lang, '要点', 'Key Points')}</h4>
          <ul className="space-y-2">
            {d.keyPoints.map((pt, i) => (
              <li key={i} className="flex gap-2 text-white/70 text-sm">
                <YinYangIcon size={16} />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Advice */}
      {d.advice && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-xl p-5 border border-gold/40 bg-gold/10">
          <h4 className="text-gold font-serif mb-2">{T(lang, '指导建议', 'Guidance')}</h4>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{d.advice}</p>
        </motion.div>
      )}

      {/* ═══ XUANJI Q&A ═══ */}
      <XuanjiChatCard readingResult={rawResult || ''} readingType="iching" readingId={readingId} isShared={isShared} chatMessages={chatMessages} delay={0.12} />

      {/* Judgment & Image */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 border border-gold/20">
          <h4 className="text-gold font-serif text-sm mb-2">{T(lang, '卦辞', 'Judgment')}</h4>
          <p className="text-white/70 text-sm leading-relaxed">{d.judgment}</p>
        </div>
        <div className="glass-card rounded-xl p-5 border border-gold/20">
          <h4 className="text-gold font-serif text-sm mb-2">{T(lang, '象辞', 'Image')}</h4>
          <p className="text-white/70 text-sm leading-relaxed">{d.image}</p>
        </div>
      </motion.div>

      {/* Hexagram Visual */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-6 border border-gold/20 text-center">
        <div className="text-white/40 text-sm mb-2">{T(lang, '第', 'Hexagram #')}{lang === 'en' ? '' : ' '}{d.hexagram?.number}{lang === 'en' ? '' : ' 卦'}</div>
        <h3 className="text-gold font-serif text-2xl mb-1">{d.hexagram?.name}</h3>
        <div className="text-white/60 text-sm mb-4">{d.hexagram?.chineseName}</div>
        <div className="flex flex-col items-center gap-1.5 my-4">
          {[...lines].reverse().map((line, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              {line === 1 ? (
                <div className="w-20 h-2.5 bg-gold rounded shadow-[0_0_8px_rgba(212,168,83,0.6)]" />
              ) : (
                <>
                  <div className="w-8 h-2.5 bg-gold/70 rounded shadow-[0_0_6px_rgba(212,168,83,0.4)]" />
                  <div className="w-3" />
                  <div className="w-8 h-2.5 bg-gold/70 rounded shadow-[0_0_6px_rgba(212,168,83,0.4)]" />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 mt-4">
          {[d.hexagram?.upperTrigram, d.hexagram?.lowerTrigram].map((t, i) => t && (
            <div key={i} className="text-center">
              <div className="text-2xl mb-1">{t.symbol}</div>
              <div className="text-gold text-sm">{t.name}</div>
              <div className="text-white/40 text-xs">{t.element}</div>
              <div className="text-white/30 text-xs">{i === 0 ? T(lang, '上卦', 'Upper') : T(lang, '下卦', 'Lower')}</div>
            </div>
          ))}
        </div>
      </motion.div>


    </div>
  )
}
