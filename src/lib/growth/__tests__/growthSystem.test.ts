import { describe, it, expect } from 'vitest'
import {
  calculateGrowth,
  checkAchievements,
  REALM_TIERS,
  XP_WEIGHT_DIVINATION,
  XP_WEIGHT_MASTER,
  XP_WEIGHT_CHAT,
} from '../growthSystem'

describe('growthSystem - calculateGrowth', () => {
  it('returns initial tier 1 for new user with zero usage', () => {
    const profile = calculateGrowth({
      usageDivination: 0,
      usageMaster: 0,
      usageChat: 0,
    })

    expect(profile.xp).toBe(0)
    expect(profile.tier).toBe(1)
    expect(profile.currentRealm.title['zh-TW']).toContain('一階 · 初探玄門')
    expect(profile.nextRealm?.tier).toBe(2)
    expect(profile.xpToNextLevel).toBe(100)
    expect(profile.levelProgressPercent).toBe(0)
    expect(profile.breakdown.divination.xp).toBe(0)
    expect(profile.breakdown.master.xp).toBe(0)
    expect(profile.breakdown.chat.xp).toBe(0)
  })

  it('accurately calculates XP according to the weighted formula', () => {
    const profile = calculateGrowth({
      usageDivination: 4, // 4 * 50 = 200
      usageMaster: 5,     // 5 * 20 = 100
      usageChat: 3,       // 3 * 10 = 30
    })

    expect(profile.breakdown.divination.xp).toBe(200)
    expect(profile.breakdown.master.xp).toBe(100)
    expect(profile.breakdown.chat.xp).toBe(30)
    expect(profile.xp).toBe(330)
    // 330 XP is >= 300 (Tier 3: 洞察陰陽) and < 650
    expect(profile.tier).toBe(3)
    expect(profile.currentRealm.title.zh).toContain('三阶 · 洞察阴阳')
    expect(profile.currentRealm.title.en).toBe('Tier III: Yin-Yang Adept')
    expect(profile.nextRealm?.tier).toBe(4)
    expect(profile.xpToNextLevel).toBe(320) // 650 - 330 = 320
  })

  it('correctly transitions across all tier boundaries', () => {
    // Tier 1: 0 - 99 XP (90 XP)
    expect(calculateGrowth({ usageDivination: 1, usageMaster: 2, usageChat: 0 }).xp).toBe(90)
    expect(calculateGrowth({ usageDivination: 1, usageMaster: 2, usageChat: 0 }).tier).toBe(1)

    // Tier 2: 100 - 299 XP
    const t2 = calculateGrowth({ usageDivination: 2, usageMaster: 0, usageChat: 0 }) // 100
    expect(t2.xp).toBe(100)
    expect(t2.tier).toBe(2)
    expect(t2.levelProgressPercent).toBe(0)

    // Tier 3: 300 - 649 XP
    const t3 = calculateGrowth({ usageDivination: 6, usageMaster: 0, usageChat: 0 }) // 300
    expect(t3.xp).toBe(300)
    expect(t3.tier).toBe(3)

    // Tier 4: 650 - 1199 XP
    const t4 = calculateGrowth({ usageDivination: 13, usageMaster: 0, usageChat: 0 }) // 650
    expect(t4.xp).toBe(650)
    expect(t4.tier).toBe(4)

    // Tier 5: 1200 - 1999 XP
    const t5 = calculateGrowth({ usageDivination: 24, usageMaster: 0, usageChat: 0 }) // 1200
    expect(t5.xp).toBe(1200)
    expect(t5.tier).toBe(5)

    // Tier 6: 2000 - 3199 XP
    const t6 = calculateGrowth({ usageDivination: 40, usageMaster: 0, usageChat: 0 }) // 2000
    expect(t6.xp).toBe(2000)
    expect(t6.tier).toBe(6)

    // Tier 7: 3200 - 4799 XP
    const t7 = calculateGrowth({ usageDivination: 64, usageMaster: 0, usageChat: 0 }) // 3200
    expect(t7.xp).toBe(3200)
    expect(t7.tier).toBe(7)

    // Tier 8: 4800 - 6999 XP
    const t8 = calculateGrowth({ usageDivination: 96, usageMaster: 0, usageChat: 0 }) // 4800
    expect(t8.xp).toBe(4800)
    expect(t8.tier).toBe(8)

    // Tier 9: >= 7000 XP (max level)
    const t9 = calculateGrowth({ usageDivination: 140, usageMaster: 0, usageChat: 0 }) // 7000
    expect(t9.xp).toBe(7000)
    expect(t9.tier).toBe(9)
    expect(t9.nextRealm).toBeNull()
    expect(t9.xpToNextLevel).toBe(0)
    expect(t9.levelProgressPercent).toBe(100)

    // Beyond max level: 12000 XP stays tier 9
    const t9Plus = calculateGrowth({ usageDivination: 200, usageMaster: 100, usageChat: 0 })
    expect(t9Plus.tier).toBe(9)
    expect(t9Plus.nextRealm).toBeNull()
    expect(t9Plus.levelProgressPercent).toBe(100)
  })

  it('handles negative or NaN gracefully', () => {
    const profile = calculateGrowth({
      usageDivination: -5,
      usageMaster: -2,
      usageChat: -10,
    })
    expect(profile.xp).toBe(0)
    expect(profile.tier).toBe(1)
  })
})

describe('growthSystem - checkAchievements', () => {
  it('unlocks achievements progressively based on milestones', () => {
    // Clean user: no achievements unlocked
    const a0 = checkAchievements({ usageDivination: 0, usageMaster: 0, usageChat: 0 }, 1)
    expect(a0.find(a => a.id === 'first_divination')?.unlocked).toBe(false)
    expect(a0.find(a => a.id === 'master_confidant')?.unlocked).toBe(false)
    expect(a0.find(a => a.id === 'diverse_scholar')?.unlocked).toBe(false)
    expect(a0.find(a => a.id === 'hundred_readings')?.unlocked).toBe(false)

    // User with 1 divination: first_divination unlocked
    const a1 = checkAchievements({ usageDivination: 1, usageMaster: 0, usageChat: 0 }, 1)
    expect(a1.find(a => a.id === 'first_divination')?.unlocked).toBe(true)
    expect(a1.find(a => a.id === 'first_divination')?.progress).toBe(100)

    // User with 12 master chats and 3 types
    const a2 = checkAchievements({
      usageDivination: 5,
      usageMaster: 12,
      usageChat: 10,
      typeCounts: { bazi: 2, ziwei: 2, liuyao: 1 },
    }, 3)

    expect(a2.find(a => a.id === 'first_divination')?.unlocked).toBe(true)
    expect(a2.find(a => a.id === 'master_confidant')?.unlocked).toBe(true)
    expect(a2.find(a => a.id === 'diverse_scholar')?.unlocked).toBe(true)
    expect(a2.find(a => a.id === 'deep_contemplation')?.unlocked).toBe(true)
    expect(a2.find(a => a.id === 'hundred_readings')?.unlocked).toBe(false)
    expect(a2.find(a => a.id === 'hundred_readings')?.currentVal).toBe(5)
    expect(a2.find(a => a.id === 'adept_master')?.unlocked).toBe(false)

    // Seasoned master at tier 5 with 105 divinations
    const a3 = checkAchievements({
      usageDivination: 105,
      usageMaster: 50,
      usageChat: 20,
    }, 5)
    expect(a3.find(a => a.id === 'hundred_readings')?.unlocked).toBe(true)
    expect(a3.find(a => a.id === 'adept_master')?.unlocked).toBe(true)
  })
})

describe('growthSystem - Realm metadata integrity', () => {
  it('has 9 valid realm tiers with unique tier numbers and non-empty translations', () => {
    expect(REALM_TIERS).toHaveLength(9)

    REALM_TIERS.forEach((realm, idx) => {
      expect(realm.tier).toBe(idx + 1)
      expect(realm.name.zh).toBeTruthy()
      expect(realm.name['zh-TW']).toBeTruthy()
      expect(realm.name.en).toBeTruthy()
      expect(realm.title.zh).toBeTruthy()
      expect(realm.title['zh-TW']).toBeTruthy()
      expect(realm.title.en).toBeTruthy()
      expect(realm.badge).toBeTruthy()
      expect(realm.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(realm.description.zh).toBeTruthy()
      expect(realm.quote.zh).toBeTruthy()

      if (idx > 0) {
        expect(realm.minXp).toBe(REALM_TIERS[idx - 1].maxXp)
      }
    })
  })
})
