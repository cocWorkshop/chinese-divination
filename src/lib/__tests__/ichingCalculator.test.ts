import { describe, it, expect } from 'vitest'
import {
  lookupHexagramByLines,
  lookupHexagramByNumber,
  castHexagram,
  interpretCast,
  castFromNumber,
} from '../ichingCalculator'

describe('lookupHexagramByNumber', () => {
  it('returns 乾 for 1', () => {
    const h = lookupHexagramByNumber(1)
    expect(h.name).toBe('乾')
    expect(h.fullName).toBe('乾為天')
    expect(h.lines).toEqual([1, 1, 1, 1, 1, 1])
  })

  it('returns 坤 for 2', () => {
    const h = lookupHexagramByNumber(2)
    expect(h.name).toBe('坤')
    expect(h.lines).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('returns 既濟 for 63 with alternating lines from bottom', () => {
    const h = lookupHexagramByNumber(63)
    expect(h.name).toBe('既濟')
    // 既濟 = 水(010 top) over 火(101 bottom) → bottom-to-top: 1,0,1,0,1,0
    expect(h.lines).toEqual([1, 0, 1, 0, 1, 0])
  })

  it('throws for invalid numbers', () => {
    expect(() => lookupHexagramByNumber(0)).toThrow()
    expect(() => lookupHexagramByNumber(65)).toThrow()
  })
})

describe('lookupHexagramByLines', () => {
  it('round-trips all 64 hexagrams (lines → entry → lines)', () => {
    for (let n = 1; n <= 64; n++) {
      const h = lookupHexagramByNumber(n)
      const found = lookupHexagramByLines(h.lines)
      expect(found.number).toBe(n)
    }
  })

  it('rejects non-6-length input', () => {
    expect(() => lookupHexagramByLines([1, 1, 1])).toThrow()
    expect(() => lookupHexagramByLines([1, 1, 1, 1, 1, 1, 1])).toThrow()
  })
})

describe('hexagram data coverage', () => {
  it('exactly 64 hexagrams numbered 1-64 with no gaps', () => {
    const numbers = new Set<number>()
    for (let n = 1; n <= 64; n++) {
      const h = lookupHexagramByNumber(n)
      numbers.add(h.number)
    }
    expect(numbers.size).toBe(64)
  })

  it('every hexagram has 6 yin/yang lines', () => {
    for (let n = 1; n <= 64; n++) {
      const h = lookupHexagramByNumber(n)
      expect(h.lines).toHaveLength(6)
      for (const l of h.lines) expect(l === 0 || l === 1).toBe(true)
    }
  })

  it('every hexagram has non-empty 卦辭 and 大象', () => {
    for (let n = 1; n <= 64; n++) {
      const h = lookupHexagramByNumber(n)
      expect(h.judgment.length).toBeGreaterThan(0)
      expect(h.image.length).toBeGreaterThan(0)
    }
  })

  it('all 64 trigram permutations are unique (no duplicate hexagrams)', () => {
    const seen = new Set<string>()
    for (let n = 1; n <= 64; n++) {
      const h = lookupHexagramByNumber(n)
      const key = h.upper.binary + h.lower.binary
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
    expect(seen.size).toBe(64)
  })
})

describe('interpretCast — line value semantics', () => {
  it('all 7s = stable yang = 乾 with no changes', () => {
    const r = interpretCast([7, 7, 7, 7, 7, 7])
    expect(r.original.name).toBe('乾')
    expect(r.changingLines).toEqual([])
    expect(r.variant).toBeUndefined()
  })

  it('all 8s = stable yin = 坤 with no changes', () => {
    const r = interpretCast([8, 8, 8, 8, 8, 8])
    expect(r.original.name).toBe('坤')
    expect(r.changingLines).toEqual([])
  })

  it('all 9s = 老陽 → 乾 with all lines changing → variant 坤', () => {
    const r = interpretCast([9, 9, 9, 9, 9, 9])
    expect(r.original.name).toBe('乾')
    expect(r.changingLines).toEqual([1, 2, 3, 4, 5, 6])
    expect(r.variant?.name).toBe('坤')
  })

  it('all 6s = 老陰 → 坤 with all lines changing → variant 乾', () => {
    const r = interpretCast([6, 6, 6, 6, 6, 6])
    expect(r.original.name).toBe('坤')
    expect(r.variant?.name).toBe('乾')
  })

  it('mixed cast with one changing line gives variant differing in that position only', () => {
    // Original: 7 8 7 8 7 8 (yang at 1,3,5; yin at 2,4,6) → some hexagram
    // With position 3 = 9 (changing yang), variant flips that line to yin.
    const r = interpretCast([7, 8, 9, 8, 7, 8])
    expect(r.changingLines).toEqual([3])
    expect(r.original.lines).toEqual([1, 0, 1, 0, 1, 0])
    expect(r.variant).toBeDefined()
    expect(r.variant!.lines).toEqual([1, 0, 0, 0, 1, 0])
  })

  it('rejects out-of-range values', () => {
    expect(() => interpretCast([5, 7, 7, 7, 7, 7])).toThrow()
    expect(() => interpretCast([10, 7, 7, 7, 7, 7])).toThrow()
  })

  it('rejects wrong length', () => {
    expect(() => interpretCast([7, 7, 7])).toThrow()
  })
})

describe('castHexagram', () => {
  it('produces valid output (line values in 6-9, valid hexagram, optional variant)', () => {
    for (let i = 0; i < 50; i++) {
      const r = castHexagram()
      expect(r.lineValues).toHaveLength(6)
      for (const v of r.lineValues) expect(v).toBeGreaterThanOrEqual(6)
      for (const v of r.lineValues) expect(v).toBeLessThanOrEqual(9)
      expect(r.original.number).toBeGreaterThanOrEqual(1)
      expect(r.original.number).toBeLessThanOrEqual(64)
      if (r.changingLines.length === 0) {
        expect(r.variant).toBeUndefined()
      } else {
        expect(r.variant).toBeDefined()
        expect(r.variant!.number).toBeGreaterThanOrEqual(1)
        expect(r.variant!.number).toBeLessThanOrEqual(64)
      }
    }
  })
})

describe('castFromNumber — backward compat', () => {
  it('returns synthetic cast with no changes for legacy 1-64 input', () => {
    const r = castFromNumber(42)
    expect(r.original.number).toBe(42)
    expect(r.changingLines).toEqual([])
    expect(r.variant).toBeUndefined()
    // All values should be 7 or 8 (少陽/少陰, no changes).
    for (const v of r.lineValues) expect(v === 7 || v === 8).toBe(true)
  })
})
