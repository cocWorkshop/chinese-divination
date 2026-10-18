'use client'

import { motion } from 'framer-motion'
import { useDivination } from '../../DivinationContext'
import { T, labelCls } from '../../constants'

/**
 * Solar/Lunar calendar toggle. `layoutId` must be unique per mount so the
 * framer-motion shared-layout pill animates within its own group (bazi and
 * ziwei render separate instances).
 */
export default function CalendarToggle({ layoutId }: { layoutId: string }) {
  const { form, setField, lang } = useDivination()
  return (
    <div>
      <span className={labelCls}>{T(lang, '曆法', 'Calendar')}</span>
      <div className="flex rounded-full border border-gold/30 overflow-hidden bg-surface w-fit">
        {([['solar', '公曆', 'Solar'], ['lunar', '農曆', 'Lunar']] as const).map(([val, zh, en]) => (
          <motion.button
            key={val}
            type="button"
            onClick={() => setField('lunarToggle', val)}
            className={`px-5 py-2 text-sm font-medium transition-colors relative ${
              form.lunarToggle === val ? 'text-navy-900' : 'text-foreground/60 hover:text-foreground/80'
            }`}
          >
            {form.lunarToggle === val && (
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
    </div>
  )
}
