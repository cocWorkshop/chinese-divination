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
