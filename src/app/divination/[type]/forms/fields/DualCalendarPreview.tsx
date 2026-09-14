'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Solar, Lunar } from 'lunar-typescript'
import { T } from '../../constants'

interface DualCalendarPreviewProps {
  birthDate: string
  lunarToggle: 'solar' | 'lunar' | string
  lang: string
}

export default function DualCalendarPreview({ birthDate, lunarToggle, lang }: DualCalendarPreviewProps) {
  const preview = useMemo(() => {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
    const [y, m, d] = birthDate.split('-').map(Number)
    if (!y || !m || !d || y < 1900 || y > 2100) return null

    try {
      if (lunarToggle === 'lunar') {
        const lunar = Lunar.fromYmd(y, m, d)
        const solar = lunar.getSolar()
        const gz = lunar.getYearInGanZhi()
        const sx = lunar.getYearShengXiao()
        return {
          fromLabel: T(lang, '輸入農曆', 'Input Lunar'),
          fromDate: `${y}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
          toLabel: T(lang, '推演公曆', 'Mapped Solar'),
          toDate: solar.toYmd(),
          meta: `${gz}(${sx})年`,
        }
      } else {
        const solar = Solar.fromYmd(y, m, d)
        const lunar = solar.getLunar()
        const gz = lunar.getYearInGanZhi()
        const sx = lunar.getYearShengXiao()
        return {
          fromLabel: T(lang, '輸入公曆', 'Input Solar'),
          fromDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          toLabel: T(lang, '對應農曆', 'Mapped Lunar'),
          toDate: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
          meta: `${gz}(${sx})年`,
        }
      }
    } catch {
      return null
    }
  }, [birthDate, lunarToggle, lang])

  return (
    <AnimatePresence>
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="mt-2.5 px-3 py-1.5 rounded-lg border border-gold/20 bg-gold/5 flex items-center justify-between flex-wrap gap-2 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)] text-[11px]">{preview.fromLabel}：</span>
            <span className="text-[var(--text-secondary)] font-medium">{preview.fromDate}</span>
            <span className="text-gold/60 mx-1">➔</span>
            <span className="text-[var(--text-muted)] text-[11px]">{preview.toLabel}：</span>
            <span className="text-gold font-serif font-bold">{preview.toDate}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-serif">
            {preview.meta}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
