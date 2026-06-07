import { describe, it, expect } from 'vitest'
import { calculateMeihua } from '../meihuaCalculator'

describe('calculateMeihua', () => {
  it('returns a valid chart with all required fields', () => {
    const chart = calculateMeihua('2026-04-27', 'wu')
    expect(chart.lunarYear).toBeGreaterThan(0)
    expect(chart.lunarMonth).toBeGreaterThan(0)
    expect(chart.lunarDay).toBeGreaterThan(0)
    expect(chart.yearBranch).toBeTruthy()
    expect(chart.upperNum).toBeGreaterThanOrEqual(1)
    expect(chart.upperNum).toBeLessThanOrEqual(8)
    expect(chart.lowerNum).toBeGreaterThanOrEqual(1)
    expect(chart.lowerNum).toBeLessThanOrEqual(8)
    expect(chart.changingLine).toBeGreaterThanOrEqual(1)
    expect(chart.changingLine).toBeLessThanOrEqual(6)
  })

  it('benGua (original hexagram) has 6 lines', () => {
    const chart = calculateMeihua('2026-04-27', 'si')
    expect(chart.benGua).toBeDefined()
    expect(chart.benGua.lines).toHaveLength(6)
    expect(chart.benGua.name).toBeTruthy()
  })

  it('huGua (mutual hexagram) has 6 lines', () => {
    const chart = calculateMeihua('2026-04-27', 'si')
    expect(chart.huGua).toBeDefined()
    expect(chart.huGua.lines).toHaveLength(6)
    expect(chart.huGua.name).toBeTruthy()
  })

  it('bianGua (changed hexagram) has 6 lines', () => {
    const chart = calculateMeihua('2026-04-27', 'si')
    expect(chart.bianGua).toBeDefined()
    expect(chart.bianGua.lines).toHaveLength(6)
    expect(chart.bianGua.name).toBeTruthy()
  })

  it('tiGua and yongGua are defined', () => {
    const chart = calculateMeihua('2026-04-27', 'hai')
    expect(chart.tiGua).toBeDefined()
    expect(chart.tiGua.name).toBeTruthy()
    expect(chart.tiGua.element).toBeTruthy()
    expect(chart.yongGua).toBeDefined()
    expect(chart.yongGua.name).toBeTruthy()
    expect(chart.yongGua.element).toBeTruthy()
  })

  it('tiYongRelation is one of the five relations', () => {
    const chart = calculateMeihua('2026-04-27', 'mao')
    const validRelations = ['用生体', '体克用', '体用比和', '体生用', '用克体']
    expect(validRelations).toContain(chart.tiYongRelation)
  })

  it('produces deterministic output for same input', () => {
    const chart1 = calculateMeihua('2000-01-15', 'zi')
    const chart2 = calculateMeihua('2000-01-15', 'zi')
    expect(chart1.upperNum).toBe(chart2.upperNum)
    expect(chart1.lowerNum).toBe(chart2.lowerNum)
    expect(chart1.changingLine).toBe(chart2.changingLine)
    expect(chart1.benGua.name).toBe(chart2.benGua.name)
  })

  it('different dates produce different charts', () => {
    const chart1 = calculateMeihua('2026-01-01', 'zi')
    const chart2 = calculateMeihua('2026-06-15', 'wu')
    // At least one of these should differ
    const same = chart1.upperNum === chart2.upperNum && chart1.lowerNum === chart2.lowerNum && chart1.changingLine === chart2.changingLine
    expect(same).toBe(false)
  })

  it('hexagrams have upper and lower trigrams', () => {
    const chart = calculateMeihua('2026-04-27', 'chen')
    expect(chart.benGua.upper).toBeDefined()
    expect(chart.benGua.lower).toBeDefined()
    expect(chart.benGua.upper.name).toBeTruthy()
    expect(chart.benGua.upper.element).toBeTruthy()
    expect(chart.benGua.lower.name).toBeTruthy()
  })

  it('works with various shichen names', () => {
    const times = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai']
    for (const t of times) {
      const chart = calculateMeihua('2026-04-27', t)
      expect(chart.shichen).toBeGreaterThanOrEqual(1)
      expect(chart.benGua).toBeDefined()
    }
  })

  it('works with Chinese branch characters', () => {
    const chart = calculateMeihua('2026-04-27', '午')
    expect(chart.benGua).toBeDefined()
    expect(chart.shichen).toBeGreaterThanOrEqual(1)
  })

  it('tiYongAnalysis is a non-empty string', () => {
    const chart = calculateMeihua('2026-04-27', 'si')
    expect(chart.tiYongAnalysis).toBeTruthy()
    expect(typeof chart.tiYongAnalysis).toBe('string')
  })

  it('numbers are within valid range', () => {
    const chart = calculateMeihua('2026-04-27', 'wu')
    expect(chart.yearNum).toBeGreaterThanOrEqual(1)
    expect(chart.yearNum).toBeLessThanOrEqual(12)
    expect(chart.monthNum).toBeGreaterThanOrEqual(1)
    expect(chart.monthNum).toBeLessThanOrEqual(12)
    expect(chart.dayNum).toBeGreaterThanOrEqual(1)
    expect(chart.dayNum).toBeLessThanOrEqual(30)
    expect(chart.hourNum).toBeGreaterThanOrEqual(1)
    expect(chart.hourNum).toBeLessThanOrEqual(12)
  })

  // 早子时 (zi_early) and 子 are the same shichen (#1) on the SAME day.
  it('zi_early and zi resolve to the same shichen #1 (same day)', () => {
    const a = calculateMeihua('2024-03-15', 'zi_early')
    const b = calculateMeihua('2024-03-15', 'zi')
    expect(a.hourNum).toBe(1)
    expect(b.hourNum).toBe(1)
    expect(a.benGua.name).toBe(b.benGua.name)
    expect(a.changingLine).toBe(b.changingLine)
  })

  // 晚子时 (zi_late, 23:00–24:00) rolls to the NEXT lunar day (子时换日),
  // so it must equal the next calendar day's 早子时 chart — NOT the same day's.
  it('zi_late rolls to the next day (子时换日), matching next-day zi_early', () => {
    const keys = ['lunarYear', 'lunarMonth', 'lunarDay', 'upperNum', 'lowerNum', 'changingLine'] as const
    for (const [d, next] of [['2024-03-15', '2024-03-16'], ['1990-05-15', '1990-05-16']]) {
      const late = calculateMeihua(d, 'zi_late')
      const nextEarly = calculateMeihua(next, 'zi_early')
      for (const k of keys) expect(late[k]).toBe(nextEarly[k])
      expect(late.benGua.name).toBe(nextEarly.benGua.name)
      expect(late.bianGua.name).toBe(nextEarly.bianGua.name)
      // And it must DIFFER from the same day's 早子时 (the pre-fix behavior).
      const sameEarly = calculateMeihua(d, 'zi_early')
      expect(late.lunarDay).not.toBe(sameEarly.lunarDay)
    }
  })
})
