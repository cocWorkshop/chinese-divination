'use client'

import { useLang } from '../LanguageContext'

const genderLabels: Record<string, { zh: string; en: string }> = {
  male: { zh: '男', en: 'Male' },
  female: { zh: '女', en: 'Female' },
}

const timeLabels: Record<string, string> = {
  zi: '子時 (23-01)', zi_early: '早子時 (23-00)', zi_late: '晚子時 (00-01)',
  chou: '丑時 (01-03)', yin: '寅時 (03-05)', mao: '卯時 (05-07)',
  chen: '辰時 (07-09)', si: '巳時 (09-11)', wu: '午時 (11-13)', wei: '未時 (13-15)',
  shen: '申時 (15-17)', you: '酉時 (17-19)', xu: '戌時 (19-21)', hai: '亥時 (21-23)',
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
    <div className="glass-card rounded-xl p-3 sm:p-4 border border-gold/20 mb-3 sm:mb-4">
      <div className="flex flex-wrap justify-center gap-3 text-xs text-[var(--text-muted)]">
        {createdAt && (
          <span>🕐 {new Date(createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW')}</span>
        )}
        {subjectName && <span>👤 {subjectName}</span>}
      </div>
      {hasBirth && (
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
          {birthInfo?.birthDate && (
            <span>📅 {birthInfo.birthDate}{birthInfo.calendarType === 'lunar' ? (lang === 'en' ? ' (Lunar)' : ' (農曆)') : ''}</span>
          )}
          {timeDisplay && <span>🕐 {timeDisplay}</span>}
          {birthInfo?.gender && (
            <span>{birthInfo.gender === 'male' ? '♂' : '♀'} {lang === 'en' ? genderLabels[birthInfo.gender]?.en : genderLabels[birthInfo.gender]?.zh}</span>
          )}
          {birthInfo?.birthPlace && <span>📍 {birthInfo.birthPlace}</span>}
        </div>
      )}
    </div>
  )
}
