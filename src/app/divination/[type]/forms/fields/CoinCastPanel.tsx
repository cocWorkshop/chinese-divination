'use client'

import type { ReactNode } from 'react'
import { useDivination } from '../../DivinationContext'
import { T } from '../../constants'

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
  resetClassName = 'px-3 py-3 text-white/40 hover:text-white/70 text-xs',
}: CoinCastPanelProps) {
  const { form, setField, lang } = useDivination()

  const lines: { coins: number[]; value: number }[] = form[field] ? JSON.parse(form[field]) : []
  const currentLine = lines.length

  const tossCoins = () => {
    const coins: number[] = [0, 0, 0].map(() => Math.random() < 0.5 ? 2 : 3) // 2=yin(字), 3=yang(背)
    const value = coins.reduce((a, b) => a + b, 0)
    const newLines = [...lines, { coins, value }]
    setField(field, JSON.stringify(newLines))
  }

  return (
    <div className="border border-gold/20 rounded-xl p-3 sm:p-4 bg-navy-900/50 space-y-4">
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
        {title}
      </p>
      <p className="text-white/40 text-xs leading-relaxed">
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
                <div key={i} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg ${isChanging ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-navy-800/50'}`}>
                  <span className="text-white/40 text-xs w-10">{T(lang, yaoNames[i], yaoNamesEn[i])}</span>
                  <div className="flex gap-1">
                    {line.coins.map((c, ci) => (
                      <span key={ci} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c === 2 ? 'bg-navy-700 text-white/60 border border-white/20' : 'bg-gold/80 text-navy-900'}`}>
                        {c === 2 ? T(lang, '字', 'H') : T(lang, '背', 'T')}
                      </span>
                    ))}
                  </div>
                  <span className="text-gold text-xs font-mono">{line.value}</span>
                  <span className={`text-xs ${isChanging ? 'text-amber-400' : 'text-white/50'}`}>
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
                    {isChanging && <span className="text-amber-400 text-xs ml-1">✕</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          {currentLine < 6 ? (
            <button type="button" onClick={tossCoins}
              className="flex-1 px-5 py-3 border border-gold/50 text-gold rounded-xl hover:border-gold hover:bg-gold/10 transition-all text-center">
              🪙 {T(lang, `擲第${currentLine + 1}次 — ${yaoNames[currentLine]}`, `Toss #${currentLine + 1} — ${yaoNamesEn[currentLine]}`)}
            </button>
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
