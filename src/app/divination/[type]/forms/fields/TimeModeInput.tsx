'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useDivination } from '../../DivinationContext'
import { T, inputCls, labelCls, shichen } from '../../constants'
import { EARLY_LATE_ZI_EXPLANATION } from '../../../guidanceConfig'
import HelpTooltip from '@/components/HelpTooltip'

/**
 * Birth-time input with a fuzzy (shichen) / precise (HH:MM) mode toggle.
 * `layoutId` keeps the framer-motion pill scoped per instance. `showHints`
 * renders the true-solar-time helper text (bazi shows it, ziwei doesn't).
 */
export default function TimeModeInput({ layoutId, showHints = false }: { layoutId: string; showHints?: boolean }) {
  const { form, setField, lang } = useDivination()
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label htmlFor={form.timeMode === 'fuzzy' ? `${layoutId}-shichen` : `${layoutId}-exact-time`} className={labelCls + ' mb-0'}>
          {T(lang, '出生時間', 'Birth Time')}
        </label>
        <HelpTooltip
          content={T(lang, EARLY_LATE_ZI_EXPLANATION.tooltip.zh, EARLY_LATE_ZI_EXPLANATION.tooltip.en)}
          title={T(lang, EARLY_LATE_ZI_EXPLANATION.label.zh, EARLY_LATE_ZI_EXPLANATION.label.en)}
        />
      </div>
      <div className="flex rounded-full border border-gold/30 overflow-hidden bg-surface w-fit mb-3">
        {([['fuzzy', '模糊（時辰）', 'Fuzzy (Shichen)'], ['precise', '精確（時分）', 'Precise (HH:MM)']] as const).map(([val, zh, en]) => (
          <motion.button
            key={val}
            type="button"
            onClick={() => setField('timeMode', val)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              form.timeMode === val ? 'text-navy-900' : 'text-foreground/60 hover:text-foreground/80'
            }`}
          >
            {form.timeMode === val && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: '#d4a853' }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{T(lang, zh, en)}</span>
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {form.timeMode === 'fuzzy' ? (
          <motion.div key="fuzzy" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
            <select id={`${layoutId}-shichen`} className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
              <option value="">{T(lang, '請選擇時辰', 'Select Shichen')}</option>
              {shichen.map(s => <option key={s.value} value={s.value}>{T(lang, s.zh, s.en)}</option>)}
            </select>
            {showHints && <p className="text-foreground/40 text-xs mt-1">{T(lang, '自動取時辰中間值，無真太陽時校正', 'Uses midpoint of shichen, no true solar time correction')}</p>}
          </motion.div>
        ) : (
          <motion.div key="precise" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
            <input id={`${layoutId}-exact-time`} type="time" className={inputCls} value={form.exactTime} onChange={e => setField('exactTime', e.target.value)} required />
            {showHints && <p className="text-foreground/40 text-xs mt-1">{T(lang, '將根據出生地經度進行真太陽時校正', 'True solar time correction based on birthplace longitude')}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
