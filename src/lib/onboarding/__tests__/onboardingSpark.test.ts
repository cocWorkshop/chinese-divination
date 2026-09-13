import { describe, it, expect } from 'vitest'
import {
  generateOnboardingSpark,
  MODULE_ROADMAP_CATEGORIES,
  type OnboardingInput,
} from '../onboardingSpark'

describe('onboardingSpark engine (CoStar-style spiritual tech spark & roadmap)', () => {
  const sampleInput: OnboardingInput = {
    name: '李雲風',
    gender: 'male',
    birthDate: '1990-05-15',
    birthTime: 'si',
    birthPlace: '上海',
    calendarType: 'solar',
  }

  it('calculates Day Master, element and cultural nature accurately', () => {
    const spark = generateOnboardingSpark(sampleInput)

    expect(spark.hasChart).toBe(true)
    expect(spark.dayMaster).toBeDefined()
    expect(spark.dayMaster.stem).toBeDefined()
    expect(['金', '木', '水', '火', '土']).toContain(spark.dayMaster.element)
    expect(spark.dayMaster.natureZh).toBeTruthy()
    expect(spark.dayMaster.natureEn).toBeTruthy()
  })

  it('extracts evocative personality tags and key traits', () => {
    const spark = generateOnboardingSpark(sampleInput)

    expect(spark.personalityTags.length).toBeGreaterThanOrEqual(3)
    expect(spark.traits.length).toBeGreaterThanOrEqual(3)
    expect(spark.traits[0]).toHaveProperty('title')
    expect(spark.traits[0]).toHaveProperty('desc')
    expect(spark.traits[0]).toHaveProperty('icon')
  })

  it('calculates Five Elements energy distribution', () => {
    const spark = generateOnboardingSpark(sampleInput)

    expect(spark.fiveElements).toBeDefined()
    const total =
      spark.fiveElements.metal +
      spark.fiveElements.wood +
      spark.fiveElements.water +
      spark.fiveElements.fire +
      spark.fiveElements.earth

    expect(total).toBeGreaterThan(0)
  })

  it('generates tailored heuristic inquiries across 4 core life scenarios', () => {
    const spark = generateOnboardingSpark(sampleInput)

    expect(spark.suggestedInquiries.length).toBe(4)
    const categories = spark.suggestedInquiries.map(q => q.category)
    expect(categories).toContain('career')
    expect(categories).toContain('wealth')
    expect(categories).toContain('relationship')
    expect(categories).toContain('decision')

    // Every inquiry must have route parameters ready for one-tap navigation
    spark.suggestedInquiries.forEach(inquiry => {
      expect(inquiry.recommendedType).toBeTruthy()
      expect(inquiry.questionZh).toBeTruthy()
      expect(inquiry.questionEn).toBeTruthy()
    })
  })

  it('gracefully handles skipped / partial birth information with dignified fallback', () => {
    const skipped = generateOnboardingSpark({
      name: '遊客',
      gender: null,
      birthDate: '',
      birthTime: '',
    })

    expect(skipped.hasChart).toBe(false)
    expect(skipped.dayMaster.stem).toBe('天元')
    expect(skipped.personalityTags).toContain('造化天機')
    expect(skipped.suggestedInquiries.length).toBe(4)
  })

  it('defines the 3 grand traditional school categories in the module roadmap', () => {
    expect(MODULE_ROADMAP_CATEGORIES.length).toBe(3)

    const ids = MODULE_ROADMAP_CATEGORIES.map(c => c.id)
    expect(ids).toContain('destiny') // 命局命盤篇 (八字、紫微)
    expect(ids).toContain('divination') // 卜卦決策篇 (六爻、梅花、奇門)
    expect(ids).toContain('environment') // 環境宅運篇 (風水)

    const destiny = MODULE_ROADMAP_CATEGORIES.find(c => c.id === 'destiny')
    expect(destiny?.modules.map(m => m.type)).toContain('bazi')
    expect(destiny?.modules.map(m => m.type)).toContain('ziwei')

    const divination = MODULE_ROADMAP_CATEGORIES.find(c => c.id === 'divination')
    expect(divination?.modules.map(m => m.type)).toContain('liuyao')
    expect(divination?.modules.map(m => m.type)).toContain('meihua')
    expect(divination?.modules.map(m => m.type)).toContain('qimen')

    const env = MODULE_ROADMAP_CATEGORIES.find(c => c.id === 'environment')
    expect(env?.modules.map(m => m.type)).toContain('fengshui')
  })
})
