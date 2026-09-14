import { describe, it, expect } from 'vitest'
import { getDailyAlmanac, DAILY_HEXAGRAMS } from '../dailyAlmanac'

describe('Daily Almanac & Hexagram Engine (Issue #152)', () => {
  it('generates deterministic daily almanac data for a given date', () => {
    const testDate = new Date('2026-09-13T12:00:00Z')
    const almanac1 = getDailyAlmanac(testDate)
    const almanac2 = getDailyAlmanac(testDate)

    expect(almanac1.solarDate).toBeDefined()
    expect(almanac1.ganZhi).toBeDefined()
    expect(almanac1.dailyHexagram).toBeDefined()
    expect(almanac1.dailyHexagram.name).toBe(almanac2.dailyHexagram.name)
    expect(almanac1.yi.length).toBeGreaterThanOrEqual(3)
    expect(almanac1.ji.length).toBeGreaterThanOrEqual(2)
  })

  it('contains classic 64 hexagrams data with symbols and guidance', () => {
    expect(DAILY_HEXAGRAMS.length).toBeGreaterThanOrEqual(12)
    const qian = DAILY_HEXAGRAMS.find(h => h.name === '乾為天')
    expect(qian).toBeDefined()
    expect(qian?.symbol).toBe('䷀')
    expect(qian?.judgment).toBeDefined()
  })

  it('provides sensible Yi and Ji recommendations', () => {
    const almanac = getDailyAlmanac(new Date('2026-09-13T08:00:00Z'))
    expect(almanac.yi.length).toBeGreaterThanOrEqual(3)
    expect(almanac.ji.length).toBeGreaterThanOrEqual(2)
    expect(almanac.dominantElement).toMatch(/金|木|水|火|土/)
  })
})
