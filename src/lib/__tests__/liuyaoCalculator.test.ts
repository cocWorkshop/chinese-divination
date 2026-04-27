import { describe, it, expect } from 'vitest'
import { calculateLiuYao } from '../liuyaoCalculator'

// Helper: create rawLines from 6 coin values (6=old yin, 7=young yang, 8=young yin, 9=old yang)
function makeLines(values: number[]) {
  return values.map(v => ({ coins: [0, 0, 0], value: v }))
}

describe('calculateLiuYao', () => {
  it('returns a valid chart with original hexagram', () => {
    const chart = calculateLiuYao(makeLines([7, 8, 7, 8, 7, 8]))
    expect(chart.originalHexagram).toBeDefined()
    expect(chart.originalHexagram.name).toBeTruthy()
    expect(chart.originalHexagram.lines).toHaveLength(6)
  })

  it('all-yang (7s) produces correct hexagram', () => {
    const chart = calculateLiuYao(makeLines([7, 7, 7, 7, 7, 7]))
    expect(chart.originalHexagram.lines.every(l => l.isYang)).toBe(true)
    expect(chart.changingLines).toHaveLength(0)
    expect(chart.changedHexagram).toBeNull()
  })

  it('all-yin (8s) produces correct hexagram', () => {
    const chart = calculateLiuYao(makeLines([8, 8, 8, 8, 8, 8]))
    expect(chart.originalHexagram.lines.every(l => !l.isYang)).toBe(true)
    expect(chart.changedHexagram).toBeNull()
  })

  it('old yang (9) produces changing line', () => {
    const chart = calculateLiuYao(makeLines([7, 7, 9, 7, 7, 7]))
    expect(chart.changingLines).toContain(3) // 3rd position (1-indexed)
    expect(chart.changedHexagram).not.toBeNull()
    // Changed line should be opposite polarity
    const originalLine = chart.originalHexagram.lines[2] // 0-indexed
    const changedLine = chart.changedHexagram!.lines[2]
    expect(originalLine.isYang).toBe(true) // 9 = old yang
    expect(changedLine.isYang).toBe(false) // changed to yin
  })

  it('old yin (6) produces changing line', () => {
    const chart = calculateLiuYao(makeLines([8, 6, 8, 8, 8, 8]))
    expect(chart.changingLines).toContain(2)
    expect(chart.changedHexagram).not.toBeNull()
    const originalLine = chart.originalHexagram.lines[1]
    const changedLine = chart.changedHexagram!.lines[1]
    expect(originalLine.isYang).toBe(false) // 6 = old yin
    expect(changedLine.isYang).toBe(true) // changed to yang
  })

  it('multiple changing lines work correctly', () => {
    const chart = calculateLiuYao(makeLines([9, 6, 7, 8, 9, 6]))
    expect(chart.changingLines).toHaveLength(4) // positions 1,2,5,6
    expect(chart.changedHexagram).not.toBeNull()
  })

  it('lines have six relatives and elements', () => {
    const chart = calculateLiuYao(makeLines([7, 8, 7, 8, 7, 8]))
    for (const line of chart.originalHexagram.lines) {
      expect(line.sixRelative).toBeTruthy()
      expect(line.element).toBeTruthy()
      expect(line.branch).toBeTruthy()
    }
  })

  it('hexagram has palace and fullName', () => {
    const chart = calculateLiuYao(makeLines([7, 7, 7, 8, 8, 8]))
    expect(chart.originalHexagram.fullName).toBeTruthy()
    expect(chart.originalHexagram.palace).toBeTruthy()
    expect(chart.originalHexagram.palaceElement).toBeTruthy()
  })

  it('hexagram has upper and lower trigrams', () => {
    const chart = calculateLiuYao(makeLines([7, 7, 7, 8, 8, 8]))
    expect(chart.originalHexagram.upperTrigram).toBeDefined()
    expect(chart.originalHexagram.lowerTrigram).toBeDefined()
    expect(chart.originalHexagram.upperTrigram.name).toBeTruthy()
    expect(chart.originalHexagram.lowerTrigram.name).toBeTruthy()
    expect(chart.originalHexagram.upperTrigram.symbol).toBeTruthy()
  })

  it('has shi and ying yao marked', () => {
    const chart = calculateLiuYao(makeLines([7, 8, 7, 8, 7, 8]))
    const shiCount = chart.originalHexagram.lines.filter(l => l.isShiYao).length
    const yingCount = chart.originalHexagram.lines.filter(l => l.isYingYao).length
    expect(shiCount).toBe(1)
    expect(yingCount).toBe(1)
  })

  it('accepts optional castTime', () => {
    const chart = calculateLiuYao(makeLines([7, 8, 7, 8, 7, 8]), '2026-04-27T10:00:00')
    expect(chart.castTime).toBe('2026-04-27T10:00:00')
  })

  it('handles edge case input values gracefully', () => {
    // Values 1-5 map to yin (even) or yang (odd) since calculator uses value%2
    const chart = calculateLiuYao(makeLines([1, 2, 3, 4, 5, 1]))
    expect(chart.originalHexagram).toBeDefined()
    expect(chart.originalHexagram.lines).toHaveLength(6)
  })

  it('乾卦 (all young yang) has correct name', () => {
    const chart = calculateLiuYao(makeLines([7, 7, 7, 7, 7, 7]))
    // 上下都是乾 → 乾為天
    expect(chart.originalHexagram.fullName).toContain('乾')
  })

  it('坤卦 (all young yin) has correct name', () => {
    const chart = calculateLiuYao(makeLines([8, 8, 8, 8, 8, 8]))
    expect(chart.originalHexagram.fullName).toContain('坤')
  })
})
