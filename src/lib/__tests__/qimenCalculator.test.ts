import { describe, it, expect } from 'vitest'
import { calculateQimen } from '../qimenCalculator'

describe('calculateQimen', () => {
  const testDate = new Date('2026-04-27T10:30:00')

  it('returns a valid chart with all required fields', () => {
    const chart = calculateQimen(testDate)
    expect(chart.year).toBeTruthy()
    expect(chart.month).toBeTruthy()
    expect(chart.day).toBeTruthy()
    expect(chart.hour).toBeTruthy()
    expect(chart.solarTerm).toBeTruthy()
    expect(chart.round).not.toBe(0)
    expect(chart.roundLabel).toBeTruthy()
    expect(chart.zhiFu).toBeTruthy()
    expect(chart.zhiShi).toBeTruthy()
  })

  it('has 9 palaces', () => {
    const chart = calculateQimen(testDate)
    expect(chart.palaces).toHaveLength(9)
  })

  it('each palace has required elements', () => {
    const chart = calculateQimen(testDate)
    for (const palace of chart.palaces) {
      expect(palace.number).toBeGreaterThanOrEqual(1)
      expect(palace.number).toBeLessThanOrEqual(9)
      expect(palace.name).toBeTruthy()
      expect(palace.direction).toBeTruthy()
      // Star and door may be absent for palace 5 (center) in some configs
      if (palace.number !== 5) {
        expect(palace.star).toBeTruthy()
        expect(palace.door).toBeTruthy()
      }
    }
  })

  it('has a 3x3 grid', () => {
    const chart = calculateQimen(testDate)
    expect(chart.grid).toHaveLength(3)
    for (const row of chart.grid) {
      expect(row).toHaveLength(3)
    }
  })

  it('grid contains all 9 palaces (some may be null for center)', () => {
    const chart = calculateQimen(testDate)
    const gridPalaces = chart.grid.flat().filter(p => p !== null)
    expect(gridPalaces.length).toBeGreaterThanOrEqual(8)
    expect(gridPalaces.length).toBeLessThanOrEqual(9)
  })

  it('round is positive (yang) or negative (yin)', () => {
    const chart = calculateQimen(testDate)
    expect(chart.round).not.toBe(0)
    if (chart.round > 0) {
      expect(chart.roundLabel).toContain('阳遁')
    } else {
      expect(chart.roundLabel).toContain('阴遁')
    }
  })

  it('produces deterministic output for same input', () => {
    const chart1 = calculateQimen(testDate)
    const chart2 = calculateQimen(testDate)
    expect(chart1.year).toBe(chart2.year)
    expect(chart1.round).toBe(chart2.round)
    expect(chart1.zhiFu).toBe(chart2.zhiFu)
    expect(chart1.palaces.map(p => p.star)).toEqual(chart2.palaces.map(p => p.star))
  })

  it('different dates produce different charts', () => {
    const chart1 = calculateQimen(new Date('2026-01-01T08:00:00'))
    const chart2 = calculateQimen(new Date('2026-07-15T14:00:00'))
    // Different dates should produce different round or zhiFu
    const same = chart1.round === chart2.round && chart1.zhiFu === chart2.zhiFu && chart1.day === chart2.day
    expect(same).toBe(false)
  })

  it('patterns array is defined (may be empty)', () => {
    const chart = calculateQimen(testDate)
    expect(Array.isArray(chart.patterns)).toBe(true)
  })

  it('pattern entries have name and type', () => {
    // Use a date that likely produces patterns
    const chart = calculateQimen(new Date('2026-06-15T10:00:00'))
    for (const p of chart.patterns) {
      expect(p.name).toBeTruthy()
      expect(['auspicious', 'inauspicious', 'neutral']).toContain(p.type)
      expect(p.description).toBeTruthy()
    }
  })

  it('palaces have heavenStem and earthStem', () => {
    const chart = calculateQimen(testDate)
    for (const palace of chart.palaces) {
      if (palace.number !== 5) { // center may not have stems
        expect(palace.heavenStem).toBeTruthy()
        expect(palace.earthStem).toBeTruthy()
      }
    }
  })

  it('eight doors are unique across palaces', () => {
    const chart = calculateQimen(testDate)
    const doors = chart.palaces.map(p => p.door).filter(Boolean)
    const uniqueDoors = new Set(doors)
    expect(uniqueDoors.size).toBe(doors.length) // no duplicates
  })

  it('nine stars are unique across palaces', () => {
    const chart = calculateQimen(testDate)
    const stars = chart.palaces.map(p => p.star).filter(Boolean)
    const uniqueStars = new Set(stars)
    expect(uniqueStars.size).toBe(stars.length)
  })

  it('handles dates in different years', () => {
    const years = [2020, 2024, 2025, 2026, 2030]
    for (const y of years) {
      const chart = calculateQimen(new Date(`${y}-06-15T10:00:00`))
      expect(chart.palaces).toHaveLength(9)
      expect(chart.year).toBeTruthy()
    }
  })

  it('handles dates at midnight', () => {
    const chart = calculateQimen(new Date('2026-04-27T00:30:00'))
    expect(chart.hour).toBeTruthy()
    expect(chart.palaces).toHaveLength(9)
  })

  it('handles dates at end of day', () => {
    const chart = calculateQimen(new Date('2026-04-27T23:30:00'))
    expect(chart.hour).toBeTruthy()
    expect(chart.palaces).toHaveLength(9)
  })

  it('divinity (八神) assigned to palaces', () => {
    const chart = calculateQimen(testDate)
    const divinities = chart.palaces.map(p => p.divinity).filter(Boolean)
    expect(divinities.length).toBeGreaterThanOrEqual(8)
  })
})

// Value-level regression tests — assert known-date → known chart values and
// that pattern conditions are actually reachable (so a 格局 can't silently die,
// as 青龙返首 did when gated on the impossible 地盘甲).
describe('calculateQimen — value-level regression', () => {
  it('known cast 2024-06-01 12:00 → exact 干支 / 節氣 / 局 / 值符值使', () => {
    const c = calculateQimen(new Date('2024-06-01T12:00:00'))
    expect(c.year).toBe('甲辰')
    expect(c.month).toBe('己巳')
    expect(c.day).toBe('丁酉')
    expect(c.hour).toBe('丙午')      // 丁日午時 = 丙午 (五鼠遁)
    expect(c.solarTerm).toBe('小满')
    expect(c.roundLabel).toBe('阳遁8局')
    expect(c.zhiFu).toBe('天冲星')
    expect(c.zhiShi).toBe('伤门')
  })

  it('甲 never appears on the heaven/earth plate (hidden as 戊/旬首)', () => {
    // Guards the dead-condition class: any rule testing for 甲 can never fire.
    for (let m = 0; m < 12; m++) {
      const c = calculateQimen(new Date(2024, m, 15, 9, 0, 0))
      for (const p of c.palaces) {
        expect(p.heavenStem).not.toContain('甲')
        expect(p.earthStem).not.toContain('甲')
      }
    }
  })

  it('寄宫 keeps BOTH stacked stars/stems, normalized to 、 (no raw comma leak)', () => {
    let found = false
    for (let d = 0; d < 40 && !found; d++) {
      const c = calculateQimen(new Date(2024, 2, 1 + d, 9, 0, 0))
      for (const p of c.palaces) {
        if (p.star.includes('天禽星')) {
          found = true
          expect(p.star).toContain('天芮星')   // 天禽 no longer dropped
          expect(p.star).toContain('、')
          expect(p.star).not.toContain(',')
          expect(p.heavenStem).not.toContain(',')
        }
      }
    }
    expect(found).toBe(true)
  })

  it('derives 值符/值使落宮 + 旬空 + 驛馬 for 2024-06-01 12:00', () => {
    const c = calculateQimen(new Date('2024-06-01T12:00:00'))
    expect(c.zhiFuPalace).toBe('乾宫')                 // 值符天冲星 落 乾6
    expect(c.zhiShiPalace).toMatch(/宫$/)              // 值使伤门 sits in a palace
    expect(c.voidBranches).toEqual(['寅', '卯'])        // 丙午 ∈ 甲辰旬 → 旬空 寅卯
    expect(c.voidPalaces).toEqual(expect.arrayContaining(['艮宫', '震宫']))
    expect(c.horseBranch).toBe('申')                   // 午 ∈ 寅午戌 → 馬在申
    expect(c.horsePalace).toBe('坤宫')                 // 申 落 坤2
  })

  it('青龙返首 (戊天盤 + 丙地盤) is reachable — not a dead condition', () => {
    const names = new Set<string>()
    const start = new Date('2024-01-01T00:00:00').getTime()
    const end = new Date('2025-01-01T00:00:00').getTime()
    for (let t = start; t < end; t += 4 * 3600_000) {
      for (const p of calculateQimen(new Date(t)).patterns) names.add(p.name)
    }
    expect(names.has('青龙返首')).toBe(true)
  }, 30000)
})
