// Static data, shared types and style constants for the divination flow.
// Extracted verbatim from the original monolithic page.tsx so the form
// components and hooks can share a single source of truth.

export const shichen = [
  { value: 'zi_early', zh: '早子時 (00:00-01:00)', en: 'Early Zi (00:00-01:00)' },
  { value: 'chou', zh: '丑時 (01:00-03:00)', en: 'Chou (01:00-03:00)' },
  { value: 'yin', zh: '寅時 (03:00-05:00)', en: 'Yin (03:00-05:00)' },
  { value: 'mao', zh: '卯時 (05:00-07:00)', en: 'Mao (05:00-07:00)' },
  { value: 'chen', zh: '辰時 (07:00-09:00)', en: 'Chen (07:00-09:00)' },
  { value: 'si', zh: '巳時 (09:00-11:00)', en: 'Si (09:00-11:00)' },
  { value: 'wu', zh: '午時 (11:00-13:00)', en: 'Wu (11:00-13:00)' },
  { value: 'wei', zh: '未時 (13:00-15:00)', en: 'Wei (13:00-15:00)' },
  { value: 'shen', zh: '申時 (15:00-17:00)', en: 'Shen (15:00-17:00)' },
  { value: 'you', zh: '酉時 (17:00-19:00)', en: 'You (17:00-19:00)' },
  { value: 'xu', zh: '戌時 (19:00-21:00)', en: 'Xu (19:00-21:00)' },
  { value: 'hai', zh: '亥時 (21:00-23:00)', en: 'Hai (21:00-23:00)' },
  { value: 'zi_late', zh: '晚子時 (23:00-00:00)', en: 'Late Zi (23:00-00:00)' },
]

export const directions8 = [
  { value: '坎/North', zh: '坎（北）', en: 'Kan (North)' },
  { value: '艮/NE', zh: '艮（东北）', en: 'Gen (NE)' },
  { value: '震/East', zh: '震（东）', en: 'Zhen (East)' },
  { value: '巽/SE', zh: '巽（东南）', en: 'Xun (SE)' },
  { value: '离/South', zh: '离（南）', en: 'Li (South)' },
  { value: '坤/SW', zh: '坤（西南）', en: 'Kun (SW)' },
  { value: '兑/West', zh: '兑（西）', en: 'Dui (West)' },
  { value: '乾/NW', zh: '乾（西北）', en: 'Qian (NW)' },
]

export const relationPresets = [
  { value: 'spouse', zh: '配偶', en: 'Spouse' },
  { value: 'father', zh: '父親', en: 'Father' },
  { value: 'mother', zh: '母親', en: 'Mother' },
  { value: 'son', zh: '兒子', en: 'Son' },
  { value: 'daughter', zh: '女兒', en: 'Daughter' },
  { value: 'brother', zh: '兄弟', en: 'Brother' },
  { value: 'sister', zh: '姐妹', en: 'Sister' },
  { value: 'friend', zh: '朋友', en: 'Friend' },
  { value: 'other', zh: '其他', en: 'Other' },
]

export interface FamilyMember {
  id: string
  relation: string
  name: string | null
  birthDate: string | null
  birthTime: string | null
  birthPlace: string | null
  gender: string | null
  calendarType: string | null
  timeMode: string | null
  exactTime: string | null
  birthLat: number | null
  birthLng: number | null
  birthEnvironment: string | null
}

export const typeInfo: Record<string, { zhName: string; twName: string; enName: string; symbol: string }> = {
  bazi: { zhName: '八字命理', twName: '八字命理', enName: 'BaZi Analysis', symbol: '☯' },
  iching: { zhName: '易经占卜', twName: '易經占卜', enName: 'I Ching Oracle', symbol: '☰' },
  liuyao: { zhName: '六爻占卜', twName: '六爻占卜', enName: 'Liu Yao Divination', symbol: '爻' },
  ziwei: { zhName: '紫微斗数', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', symbol: '紫' },
  qimen: { zhName: '奇门遁甲', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', symbol: '遁' },
  fengshui: { zhName: '风水布局', twName: '風水佈局', enName: 'Feng Shui Analysis', symbol: '坎' },
  meihua: { zhName: '梅花易数', twName: '梅花易數', enName: 'Plum Blossom Numerology', symbol: '梅' },
  other: { zhName: '梅花六壬', twName: '梅花六壬', enName: 'Plum Blossom & Liu Ren', symbol: '壬' },
}

// Helper for bilingual text
export { T } from '@/lib/i18n'

// Shared form control styles
export const inputCls = "w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
export const labelCls = "block text-white/70 text-sm mb-1"

// Shape of the form state object shared across the flow.
export type DivinationFormState = Record<string, string>

// Self-profile snapshot kept so switching target back to "self" restores
// the authenticated user's own birth info.
export interface SelfProfile {
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: string
  lunarToggle: string
  timeMode: string
  exactTime: string
  birthEnvironment: string
  birthLat: number | null
  birthLng: number | null
}

export interface CreditsInfo {
  divination?: { remaining: number }
  chat?: { remaining: number }
  credits?: number
  costs?: Record<string, number>
}

export interface CachedReading {
  id: string
  result: string
  createdAt: string
  count: number
}
