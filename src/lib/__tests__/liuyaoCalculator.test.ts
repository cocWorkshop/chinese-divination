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

// Value-level regression guard for the 京房八宫 table + 六亲 logic. The
// original code had a hand-typed palace table wrong for ~48/64 hexagrams and a
// getSixRelative() that could never assign 妻财/官鬼 (emitting '?'). The old
// tests only checked truthiness, so both bugs survived. These pin actual values.
describe('六爻 京房八宫 / 世应 / 六亲 — value regression', () => {
  const VALID_RELATIVES = ['兄弟', '子孙', '父母', '妻财', '官鬼']
  const PALACES = ['乾', '坤', '震', '巽', '坎', '离', '艮', '兑']

  it('all 64 hexagrams resolve a valid 宫, exactly one 世/一应 (3 apart), and never a "?" 六亲', () => {
    for (let mask = 0; mask < 64; mask++) {
      const values: number[] = []
      for (let i = 0; i < 6; i++) values.push(((mask >> i) & 1) ? 7 : 8)
      const o = calculateLiuYao(makeLines(values)).originalHexagram
      expect(PALACES).toContain(o.palace)
      const shi = o.lines.filter(l => l.isShiYao)
      const ying = o.lines.filter(l => l.isYingYao)
      expect(shi).toHaveLength(1)
      expect(ying).toHaveLength(1)
      expect(Math.abs(shi[0].position - ying[0].position)).toBe(3)
      for (const l of o.lines) expect(VALID_RELATIVES).toContain(l.sixRelative)
    }
  })

  it.each([
    { values: [7, 7, 7, 7, 7, 7], name: '乾为天', palace: '乾', el: '金', shi: 6, ying: 3, six: ['子孙', '妻财', '父母', '官鬼', '兄弟', '父母'] },
    { values: [8, 8, 8, 8, 8, 8], name: '坤为地', palace: '坤', el: '土', shi: 6, ying: 3, six: ['兄弟', '父母', '官鬼', '兄弟', '妻财', '子孙'] },
    { values: [8, 8, 7, 7, 7, 7], name: '天山遁', palace: '乾', el: '金', shi: 2, ying: 5, six: ['父母', '官鬼', '兄弟', '官鬼', '兄弟', '父母'] },
    { values: [8, 7, 8, 8, 8, 8], name: '地水师', palace: '坎', el: '水', shi: 3, ying: 6, six: ['子孙', '官鬼', '妻财', '官鬼', '兄弟', '父母'] },
  ])('$name → correct 宫/世应/六亲', ({ values, name, palace, el, shi, ying, six }) => {
    const o = calculateLiuYao(makeLines(values)).originalHexagram
    expect(o.fullName).toBe(name)
    expect(o.palace).toBe(palace)
    expect(o.palaceElement).toBe(el)
    expect(o.lines.find(l => l.isShiYao)!.position).toBe(shi)
    expect(o.lines.find(l => l.isYingYao)!.position).toBe(ying)
    expect(o.lines.map(l => l.sixRelative)).toEqual(six)
  })
})
