'use client'

import { useLang } from '../LanguageContext'

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
  const isEn = lang === 'en'
  const hasBirth = !!(birthInfo && (birthInfo.birthDate || birthInfo.birthTime || birthInfo.gender || birthInfo.birthPlace))
  if (!subjectName && !hasBirth && !createdAt) return null

  const timeDisplay = birthInfo?.exactTime || (birthInfo?.birthTime ? (timeLabels[birthInfo.birthTime] || birthInfo.birthTime) : '')

  return (
    <div className="oriental-sanctuary-card rounded-xl p-3.5 sm:p-4 mb-3 sm:mb-4">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)] font-serif">
        {createdAt && (
          <span className="inline-flex items-center gap-1">
            <span className="text-gold/70">{isEn ? 'Date:' : '推演時間：'}</span>
            <span>{new Date(createdAt).toLocaleDateString(isEn ? 'en-US' : 'zh-TW')}</span>
          </span>
        )}
        {subjectName && (
          <span className="inline-flex items-center gap-1">
            <span className="text-gold/70">{isEn ? 'Querent:' : '求問命主：'}</span>
            <span className="text-gold font-medium">{subjectName}</span>
          </span>
        )}
      </div>
      {hasBirth && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-gold/10 text-xs text-[var(--text-secondary)]">
          {birthInfo?.birthDate && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{isEn ? 'Birth Date:' : '生辰：'}</span>
              <span>{birthInfo.birthDate}{birthInfo.calendarType === 'lunar' ? (isEn ? ' (Lunar)' : '（農曆）') : ''}</span>
            </span>
          )}
          {timeDisplay && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{isEn ? 'Hour:' : '時辰：'}</span>
              <span>{timeDisplay}</span>
            </span>
          )}
          {birthInfo?.gender && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{isEn ? 'Gender:' : '乾坤：'}</span>
              <span>{isEn ? genderLabels[birthInfo.gender]?.en : genderLabels[birthInfo.gender]?.zh}</span>
            </span>
          )}
          {birthInfo?.birthPlace && (
            <span className="inline-flex items-center gap-1">
              <span className="text-gold/60">{isEn ? 'Location:' : '福地：'}</span>
              <span>{birthInfo.birthPlace}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
