/**
 * User Growth System & Chinese Divination Mastery Levels
 * Types & Domain Interfaces
 */

export interface GrowthStats {
  usageDivination: number
  usageMaster: number
  usageChat: number
  typeCounts?: Record<string, number>
  completedReadingsCount?: number
  memberSince?: Date | string | null
}

export interface LocalizedText {
  zh: string
  'zh-TW': string
  en: string
}

export interface RealmTierInfo {
  tier: number
  name: LocalizedText
  title: LocalizedText
  badge: string
  color: string
  minXp: number
  maxXp: number | null
  description: LocalizedText
  quote: LocalizedText
}

export interface Achievement {
  id: string
  icon: string
  name: LocalizedText
  description: LocalizedText
  unlocked: boolean
  progress: number // 0 - 100
  currentVal: number
  targetVal: number
}

export interface XpBreakdownItem {
  count: number
  weight: number
  xp: number
}

export interface UserGrowthProfile {
  xp: number
  tier: number
  currentRealm: RealmTierInfo
  nextRealm: RealmTierInfo | null
  xpToNextLevel: number
  levelProgressPercent: number
  breakdown: {
    divination: XpBreakdownItem
    master: XpBreakdownItem
    chat: XpBreakdownItem
  }
  realms: RealmTierInfo[]
  achievements: Achievement[]
  masterGreeting: LocalizedText
}
