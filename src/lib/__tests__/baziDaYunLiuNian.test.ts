import { describe, it, expect } from 'vitest'
import {
  calculateTaiYuan,
  calculateMingGong,
  calculateShenGong,
  generateLiuNianAnalysis,
  isDaYunUnlocked,
  FREE_DAYUN_LIMIT,
} from '../baziCalculator'

describe('BaZi Advanced Pillars: 胎元、命宫、身宫 (Issue #131 / #134)', () => {
  it('calculates 胎元 (Tai Yuan) accurately (Month Stem + 1, Branch + 3)', () => {
    // Issue #131 example: 丁未月 -> 戊戌
    const taiYuan = calculateTaiYuan('丁', '未')
    expect(taiYuan.stem).toBe('戊')
    expect(taiYuan.branch).toBe('戌')
    expect(taiYuan.pillar).toBe('戊戌')
    expect(taiYuan.nayin).toBe('平地木')
  })

  it('calculates 胎元 edge cases wrapping around cyclical stems and branches', () => {
    // 癸亥月 -> Stem: 癸(+1)->甲, Branch: 亥(+3)->寅
    const taiYuan = calculateTaiYuan('癸', '亥')
    expect(taiYuan.pillar).toBe('甲寅')
    expect(taiYuan.nayin).toBe('大溪水')
  })

  it('calculates 命宫 (Ming Gong) matching Issue #131 example', () => {
    // Issue #131 example: 丁丑年 丁未月 癸丑时 -> 己酉
    const mingGong = calculateMingGong('丁', '未', '丑')
    expect(mingGong.stem).toBe('己')
    expect(mingGong.branch).toBe('酉')
    expect(mingGong.pillar).toBe('己酉')
    expect(mingGong.nayin).toBe('大驿土')
  })

  it('calculates 身宫 (Shen Gong) matching Issue #131 example', () => {
    // Issue #131 example: 丁丑年 丁未月 癸丑时 -> 己酉
    const shenGong = calculateShenGong('丁', '未', '丑')
    expect(shenGong.stem).toBe('己')
    expect(shenGong.branch).toBe('酉')
    expect(shenGong.pillar).toBe('己酉')
    expect(shenGong.nayin).toBe('大驿土')
  })
})

describe('BaZi DaYun & LiuNian Gating (Decadal Gating)', () => {
  it('allows the first 3 DaYun decades (indices 0, 1, 2) free by default', () => {
    expect(FREE_DAYUN_LIMIT).toBe(3)
    expect(isDaYunUnlocked(0, [])).toBe(true)
    expect(isDaYunUnlocked(1, [])).toBe(true)
    expect(isDaYunUnlocked(2, [])).toBe(true)
  })

  it('locks decade 3 onwards unless explicitly unlocked with credits', () => {
    expect(isDaYunUnlocked(3, [])).toBe(false)
    expect(isDaYunUnlocked(4, [])).toBe(false)

    // When unlocked via credits
    expect(isDaYunUnlocked(3, [3])).toBe(true)
    expect(isDaYunUnlocked(4, [3])).toBe(false)
    expect(isDaYunUnlocked(4, [3, 4])).toBe(true)
  })

  it('supports dynamic freeLimit configured via AdminSettings', () => {
    expect(isDaYunUnlocked(0, [], 2)).toBe(true)
    expect(isDaYunUnlocked(1, [], 2)).toBe(true)
    expect(isDaYunUnlocked(2, [], 2)).toBe(false)
    expect(isDaYunUnlocked(2, [2], 2)).toBe(true)
  })
})

describe('BaZi LiuNian Annual Prediction Engine (Issue #134)', () => {
  it('generates rich annual forecasts including focus, interactions, and advice', () => {
    const forecast = generateLiuNianAnalysis(
      '甲', // Day master: Jia wood
      {
        year: 2026,
        age: 23,
        stem: '丙',
        branch: '午',
        nayin: '天河水',
        tenGod: '食神',
        isLucky: true,
      },
      {
        stem: '丁',
        branch: '未',
        startYear: 2022,
        endYear: 2031,
      }
    )

    expect(forecast.focus).toBeDefined()
    expect(forecast.forecast).toBeDefined()
    expect(forecast.advice).toBeDefined()
    expect(forecast.stemBranchInteraction).toBeDefined()
    expect(forecast.focus.length).toBeGreaterThan(0)
    expect(forecast.forecast.length).toBeGreaterThan(10)
  })
})
