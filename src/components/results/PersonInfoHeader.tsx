'use client'

import { useLang } from '../LanguageContext'
import { T } from '@/lib/i18n'

const genderLabels: Record<string, { zh: string; en: string }> = {
  male: { zh: '男命 (乾造)', en: 'Male (Qian)' },
  female: { zh: '女命 (坤造)', en: 'Female (Kun)' },
}

const timeLabels: Record<string, string> = {
  zi: '子時 (23:00-01:00)', zi_early: '早子時 (00:00-01:00)', zi_late: '晚子時 (23:00-00:00)',
  chou: '丑時 (01:00-03:00)', yin: '寅時 (03:00-05:00)', mao: '卯時 (05:00-07:00)',
  chen: '辰時 (07:00-09:00)', si: '巳時 (09:00-11:00)', wu: '午時 (11:00-13:00)', wei: '未時 (13:00-15:00)',
  shen: '申時 (15:00-17:00)', you: '酉時 (17:00-19:00)', xu: '戌時 (19:00-21:00)', hai: '亥時 (21:00-23:00)',
}

export interface PersonBirthInfo {
  birthDate?: string
  birthTime?: string
  gender?: string
  calendarType?: string
  birthPlace?: string
  exactTime?: string
}

export default function PersonInfoHeader({
  subjectName,
  birthInfo,
  createdAt,
}: {
  subjectName?: string | null
  birthInfo?: PersonBirthInfo | null
  createdAt?: string
}) {
  const { lang } = useLang()
  const hasBirth = !!(birthInfo && (birthInfo.birthDate || birthInfo.birthTime || birthInfo.gender || birthInfo.birthPlace))
  if (!subjectName && !hasBirth && !createdAt) return null

  const timeDisplay = birthInfo?.exactTime || (birthInfo?.birthTime ? (timeLabels[birthInfo.birthTime] || birthInfo.birthTime) : '')

  return (
    <div className="oriental-sanctuary-card rounded-xl p-3.5 sm:p-4 mb-3 sm:mb-4">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)] font-serif">
        {createdAt && (
          <span className="inline-flex items-center gap-1">
            <span className="text-gold/70">{T(lang, '推演時間：', 'Date:')}</span>
            <span>{new Date(createdAt).toLocaleDateString(T(lang, 'zh-TW', 'en-US'))}</span>
          </span>
        )}
        {subjectName && (
          <span className="inline-flex items-center gap-1">
            <span className="text-gold/70">{T(lang, '求問命主：', 'Querent:')}</span>
            <span className="text-gold font-medium">{subjectName}</span>
          </span>
        )}
      </div>
      {hasBirth && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-gold/10 text-xs text-[var(--text-secondary)]">
          {birthInfo?.birthDate && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{T(lang, '生辰：', 'Birth Date:')}</span>
              <span>{birthInfo.birthDate}{birthInfo.calendarType === 'lunar' ? (T(lang, '（農曆）', ' (Lunar)')) : ''}</span>
            </span>
          )}
          {timeDisplay && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{T(lang, '時辰：', 'Hour:')}</span>
              <span>{timeDisplay}</span>
            </span>
          )}
          {birthInfo?.gender && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{T(lang, '乾坤：', 'Gender:')}</span>
              <span>{T(lang, genderLabels[birthInfo.gender]?.zh, genderLabels[birthInfo.gender]?.en)}</span>
            </span>
          )}
          {birthInfo?.birthPlace && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{T(lang, '福地：', 'Location:')}</span>
              <span>{birthInfo.birthPlace}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
