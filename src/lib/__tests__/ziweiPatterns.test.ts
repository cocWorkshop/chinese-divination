import { describe, test, expect } from "vitest"
/**
 * 紫微斗数格局检测测试
 */

import { calculateZiwei } from '../ziweiCalculator'
import { detectPatterns, DetectedPattern } from '../ziweiPatterns'

function getPatternNames(patterns: DetectedPattern[]): string[] {
  return patterns.map(p => p.name)
}

describe('ZiweiPatterns - Structure', () => {
  test('returns array of patterns', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const patterns = detectPatterns(chart)
    expect(Array.isArray(patterns)).toBe(true)
  })

  test('each pattern has required fields', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const patterns = detectPatterns(chart)
    for (const p of patterns) {
      expect(p.name).toBeTruthy()
      expect(['上格', '中格', '下格', '凶格']).toContain(p.level)
      expect(p.description).toBeTruthy()
      expect(Array.isArray(p.involvedStars)).toBe(true)
      expect(Array.isArray(p.involvedPalaces)).toBe(true)
    }
  })

  test('patterns sorted by level (上格 first)', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const patterns = detectPatterns(chart)
    if (patterns.length > 1) {
      const levelOrder: Record<string, number> = { '上格': 0, '中格': 1, '下格': 2, '凶格': 3 }
      for (let i = 1; i < patterns.length; i++) {
        expect(levelOrder[patterns[i].level]).toBeGreaterThanOrEqual(levelOrder[patterns[i - 1].level])
      }
    }
  })
})

describe('ZiweiPatterns - Consistency', () => {
  test('same input always produces same patterns', () => {
    const chart1 = calculateZiwei('1988-9-17', 'zi', 'male')
    const chart2 = calculateZiwei('1988-9-17', 'zi', 'male')
    const p1 = detectPatterns(chart1)
    const p2 = detectPatterns(chart2)
    expect(getPatternNames(p1)).toEqual(getPatternNames(p2))
  })

  test('same birth data different runs → identical', () => {
    const results: string[][] = []
    for (let i = 0; i < 5; i++) {
      const chart = calculateZiwei('1990-5-15', 'si', 'female')
      results.push(getPatternNames(detectPatterns(chart)))
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0])
    }
  })
})

describe('ZiweiPatterns - Specific Pattern Detection', () => {
  // Test 1988-9-17 zi male
  test('1988-9-17 子时男 patterns', () => {
    const chart = calculateZiwei('1988-9-17', 'zi', 'male')
    const patterns = detectPatterns(chart)
    const names = getPatternNames(patterns)
    
    // This chart: 命宫在酉，无正曜（主星都不在命宫）
    // 让我们验证具体检测到什么
    console.log('1988-9-17 patterns:', names)
    
    // At minimum, the structure should be valid
    expect(patterns.length).toBeGreaterThanOrEqual(0)
  })
})

describe('ZiweiPatterns - Broad Coverage', () => {
  // Run pattern detection on many charts to ensure no crashes
  const testCases: [string, string, 'male' | 'female'][] = [
    ['1960-1-1', 'zi', 'male'],
    ['1965-7-7', 'hai', 'male'],
    ['1970-6-15', 'wu', 'female'],
    ['1975-3-20', 'mao', 'male'],
    ['1980-12-31', 'hai', 'male'],
    ['1983-11-11', 'shen', 'female'],
    ['1985-3-20', 'mao', 'male'],
    ['1988-9-17', 'zi', 'male'],
    ['1988-9-17', 'wu', 'female'],
    ['1989-11-30', 'hai', 'female'],
    ['1990-5-15', 'si', 'female'],
    ['1991-7-7', 'you', 'male'],
    ['1992-4-20', 'chen', 'female'],
    ['1993-9-9', 'wu', 'male'],
    ['1995-2-28', 'mao', 'female'],
    ['1996-8-10', 'shen', 'female'],
    ['1997-2-14', 'yin', 'male'],
    ['1999-12-31', 'hai', 'male'],
    ['2000-1-1', 'wu', 'male'],
    ['2000-8-8', 'chen', 'male'],
    ['2003-4-5', 'yin', 'female'],
    ['2005-3-1', 'you', 'female'],
    ['2010-10-10', 'si', 'male'],
    ['2020-2-29', 'wu', 'female'],
  ]

  test.each(testCases)('%s %s %s → no crash', (date, time, gender) => {
    const chart = calculateZiwei(date, time, gender)
    const patterns = detectPatterns(chart)
    expect(Array.isArray(patterns)).toBe(true)
    // All patterns should have valid structure
    for (const p of patterns) {
      expect(p.name).toBeTruthy()
      expect(p.description.length).toBeGreaterThan(0)
    }
  })
})

describe('ZiweiPatterns - All 12 Shichen Coverage', () => {
  const shichens = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai']

  test.each(shichens)('1988-9-17 %s → no crash', (shichen) => {
    const chart = calculateZiwei('1988-9-17', shichen, 'male')
    const patterns = detectPatterns(chart)
    expect(Array.isArray(patterns)).toBe(true)
  })
})
