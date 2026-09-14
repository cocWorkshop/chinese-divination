'use client'

import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { DivinationIcon } from '@/components/DivinationIcons'
import { useDivination } from '../../DivinationContext'
import { T } from '../../constants'
import { haptics } from '@/lib/native'

interface CoinCastPanelProps {
  /** Which form field stores the cast lines (JSON string). */
  field: 'ichingLines' | 'liuyaoLines'
  title: ReactNode
  intro: ReactNode
  /** Footer content shown once all six lines are cast. */
  completeBox: ReactNode
  /** Whether to show the reset button, given line count + current line. */
  showReset: (linesLen: number, currentLine: number) => boolean
  resetLabel: string
  onReset: () => void
  resetClassName?: string
}

const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const yaoNamesEn = ['1st Line', '2nd Line', '3rd Line', '4th Line', '5th Line', '6th Line']
const valueLabels: Record<number, { zh: string; en: string; type: string }> = {
  6: { zh: '老陰 ⚋✕', en: 'Old Yin ⚋✕', type: 'changing' },
  7: { zh: '少陽 ⚊', en: 'Young Yang ⚊', type: 'stable' },
  8: { zh: '少陰 ⚋', en: 'Young Yin ⚋', type: 'stable' },
  9: { zh: '老陽 ⚊✕', en: 'Old Yang ⚊✕', type: 'changing' },
}

/**
 * Three-coin casting panel: tosses 3 coins per line (Heads=2/Yin,
 * Tails=3/Yang), six lines bottom-to-top, rendering each cast line with
 * its coins, value and Yin/Yang glyph. Shared by I Ching and Liu Yao.
 */
export default function CoinCastPanel({
  field, title, intro, completeBox, showReset, resetLabel, onReset,
  resetClassName = 'px-3 py-3 text-white/40 hover:text-white/70 text-xs min-h-[44px] flex items-center justify-center',
}: CoinCastPanelProps) {
  const { form, setField, lang } = useDivination()
  const [isTossing, setIsTossing] = useState(false)

  const lines: { coins: number[]; value: number }[] = form[field] ? JSON.parse(form[field]) : []
  const currentLine = lines.length

  const tossCoins = () => {
    if (isTossing || currentLine >= 6) return
    setIsTossing(true)
    haptics.diceToss()

    const coins: number[] = [0, 0, 0].map(() => Math.random() < 0.5 ? 2 : 3) // 2=yin(字), 3=yang(背)
    const value = coins.reduce((a, b) => a + b, 0)
    const newLines = [...lines, { coins, value }]
    setField(field, JSON.stringify(newLines))

    setTimeout(() => setIsTossing(false), 240)
  }

  return (
    <div className="oriental-sanctuary-card rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="text-gold-light/90 text-sm font-serif font-medium tracking-wide flex items-center gap-2 border-b border-gold/10 pb-2.5">
        {title}
      </div>
      <p className="text-white/50 text-xs leading-relaxed">
        {intro}
      </p>
      <div className="space-y-3">
        {lines.length > 0 && (
          <div className="space-y-1.5">
            {[...lines].reverse().map((line, ri) => {
              const i = lines.length - 1 - ri
              const label = valueLabels[line.value]
              const isChanging = line.value === 6 || line.value === 9
              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isChanging ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-navy-800/50'}`}>
                  <span className="text-white/50 text-xs w-10 font-serif">{T(lang, yaoNames[i], yaoNamesEn[i])}</span>
                  <div className="flex gap-1.5">
                    {line.coins.map((c, ci) => (
                      <span key={ci} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-serif font-bold shadow-sm ${c === 2 ? 'bg-navy-700 text-white/70 border border-white/20' : 'bg-gradient-to-br from-gold to-amber-600 text-navy-950 font-bold'}`}>
                        {c === 2 ? T(lang, '字', 'H') : T(lang, '背', 'T')}
                      </span>
                    ))}
                  </div>
                  <span className="text-gold text-xs font-mono font-semibold">{line.value}</span>
                  <span className={`text-xs ${isChanging ? 'text-amber-400 font-medium' : 'text-white/50'}`}>
                    {T(lang, label.zh, label.en)}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    {(line.value === 7 || line.value === 9) ? (
                      <div className={`w-12 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/60'}`} />
                    ) : (
                      <>
                        <div className={`w-5 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/40'}`} />
                        <div className="w-1.5" />
                        <div className={`w-5 h-1.5 rounded ${isChanging ? 'bg-amber-400' : 'bg-gold/40'}`} />
                      </>
                    )}
                    {isChanging && <span className="text-amber-400 text-xs ml-1 font-serif">✕</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          {currentLine < 6 ? (
            <motion.button
              type="button"
              onClick={tossCoins}
              disabled={isTossing}
              animate={isTossing ? { scale: [1, 0.96, 1.02, 1] } : {}}
              transition={{ duration: 0.24 }}
              className={`flex-1 px-5 py-3 min-h-[44px] border border-gold/40 bg-gold/10 text-gold rounded-xl hover:border-gold hover:bg-gold/20 active:scale-[0.99] transition-all text-center font-serif font-medium flex items-center justify-center gap-2 cursor-pointer ${isTossing ? 'opacity-75' : ''}`}
            >
              <motion.div animate={isTossing ? { rotate: 360 } : {}} transition={{ duration: 0.24 }}>
                <DivinationIcon type="liuyao" className="w-4 h-4 text-gold" />
              </motion.div>
              <span>{isTossing ? T(lang, '銅錢翻轉落盤中…', 'Tossing coins…') : T(lang, `擲第${currentLine + 1}次 — ${yaoNames[currentLine]}`, `Toss #${currentLine + 1} — ${yaoNamesEn[currentLine]}`)}</span>
            </motion.button>
          ) : (
            completeBox
          )}
          {showReset(lines.length, currentLine) && (
            <button type="button" onClick={onReset} className={resetClassName}>
              {resetLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
