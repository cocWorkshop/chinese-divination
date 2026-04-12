import { describe, it, expect } from 'vitest'
import { renderGreeting } from '../greetings'

describe('renderGreeting — State 1 (first-time user)', () => {
  it('returns State 1 when user has no readings (zh-TW)', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: false,
    })
    expect(result.state).toBe(1)
    expect(result.text).toContain('我是 玄機大師')
    expect(result.text).toContain('八字或紫微')
    expect(result.text).toContain('起一卦')
    expect(result.text).toContain('想從哪一個開始')
    // Forbidden anti-patterns
    expect(result.text).not.toContain('您好')
    expect(result.text).not.toContain('歡迎')
    expect(result.text).not.toContain('很高興')
    expect(result.text).not.toContain('星辰')
    // Suggestions present
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.length).toBeLessThanOrEqual(4)
  })

  it('returns State 1 when user has no readings (en)', () => {
    const result = renderGreeting({
      lang: 'en',
      hasReadings: false,
    })
    expect(result.state).toBe(1)
    expect(result.text).toContain('I am Master Xuanji')
    expect(result.text).toContain('bazi or ziwei')
    expect(result.text).toContain('hexagram')
    // Forbidden anti-patterns
    expect(result.text.toLowerCase()).not.toContain('welcome to')
    expect(result.text.toLowerCase()).not.toContain('happy to help')
    expect(result.text.toLowerCase()).not.toContain('let me know')
  })
})

describe('renderGreeting — State 2 (returning user)', () => {
  it('hydrates type summary and last reading date in zh-TW', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 22, ziwei: 20, qimen: 11 },
    })
    expect(result.state).toBe(2)
    expect(result.text).toContain('又見面了')
    expect(result.text).toContain('你的命盤我手邊有')
    // Top 3 types by count, joined with、
    expect(result.text).toContain('八字')
    expect(result.text).toContain('紫微')
    expect(result.text).toContain('奇門')
    // Date hydration
    expect(result.text).toContain('4月8日')
    // Last reading type label
    expect(result.text).toContain('八字')
    // Closes with focused invitation
    expect(result.text).toContain('今天想接著哪一段問')
  })

  it('hydrates type summary and last reading date in en', () => {
    const result = renderGreeting({
      lang: 'en',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 22, ziwei: 20 },
    })
    expect(result.state).toBe(2)
    expect(result.text).toContain('Welcome back')
    expect(result.text).toContain('BaZi')
    expect(result.text).toContain('Zi Wei')
    expect(result.text).toContain('and')
    // Date hydration (locale-formatted)
    expect(result.text).toMatch(/Apr/)
  })

  it('handles single-type readings without "and"', () => {
    const result = renderGreeting({
      lang: 'en',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 5 },
    })
    expect(result.state).toBe(2)
    expect(result.text).toContain('BaZi')
    // No conjunction needed for a single type
    expect(result.text).not.toContain(' and ')
  })

  it('falls back to generic phrase when readingTypeCounts is empty', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: null,
      readingTypeCounts: {},
    })
    expect(result.state).toBe(2)
    expect(result.text).toContain('又見面了')
    expect(result.text).toContain('你的命盤我手邊有')
  })

  it('orders types by descending count', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: null,
      readingTypeCounts: { meihua: 1, bazi: 50, ziwei: 25 },
    })
    // Top type (bazi, 50) should appear before lower-count types in the summary
    const baziIdx = result.text.indexOf('八字')
    const ziweiIdx = result.text.indexOf('紫微')
    const meihuaIdx = result.text.indexOf('梅花')
    expect(baziIdx).toBeGreaterThanOrEqual(0)
    expect(ziweiIdx).toBeGreaterThan(baziIdx)
    // Top 3 only — meihua (rank 4 if there were 4 types) would still appear since count = 3
    expect(meihuaIdx).toBeGreaterThan(ziweiIdx)
  })

  it('caps the summary at 3 types', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: null,
      readingTypeCounts: {
        bazi: 22,
        ziwei: 20,
        qimen: 11,
        iching: 3,
        meihua: 4,
      },
    })
    // Top 3: bazi, ziwei, meihua (4) — iching (3) excluded
    expect(result.text).toContain('八字')
    expect(result.text).toContain('紫微')
    expect(result.text).not.toContain('易經')
  })
})

describe('renderGreeting — anti-pattern guards', () => {
  it('never includes mystical-fake language in any state', () => {
    const states = [
      renderGreeting({ lang: 'zh-TW', hasReadings: false }),
      renderGreeting({
        lang: 'zh-TW',
        hasReadings: true,
        lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
        readingTypeCounts: { bazi: 5 },
      }),
    ]
    for (const s of states) {
      expect(s.text).not.toContain('星辰')
      expect(s.text).not.toContain('指引')
      expect(s.text).not.toContain('神秘')
      expect(s.text).not.toContain('命運的')
    }
  })

  it('never references tool names', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: '2026-04-08T10:00:00Z' },
      readingTypeCounts: { bazi: 5 },
    })
    expect(result.text).not.toContain('get_reading')
    expect(result.text).not.toContain('list_readings')
    expect(result.text).not.toContain('tool')
    expect(result.text).not.toContain('工具')
  })
})
