import { describe, it, expect } from 'vitest'
import { calculateMeihua, calculateMeihuaByNumbers } from '../meihuaCalculator'

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

  // Regression: 卦象 lines are stored bottom→top. A prior bug stored them
  // top→bottom, scrambling 互卦/变卦 (本卦 name survived but 互/变 were wrong).
  it('builds correct 互卦 / 变卦 from bottom→top lines', () => {
    const m = calculateMeihua('2026-04-27', 'wu')
    expect(m.benGua.name).toBe('风雷益')
    expect(m.benGua.lines).toEqual([1, 0, 0, 0, 1, 1]) // 震(下)[1,0,0] + 巽(上)[0,1,1]
    expect(m.huGua.name).toBe('山地剥')                  // 互卦 of 益
    expect(m.changingLine).toBe(4)
    expect(m.bianGua.name).toBe('天雷无妄')              // 益 动四爻 → 无妄
  })
})

describe('calculateMeihuaByNumbers (Issue #155: 报数起卦法)', () => {
  it('correctly calculates the exact example from Issue #155 (numbers: 33, 66)', () => {
    // 33 / 8 = 4 余 1 → 上卦 1 (乾)
    // 66 / 8 = 8 余 2 → 下卦 2 (兑)
    // 本卦: 上乾下兑 → 天泽履
    // 互卦: 本卦 2,3,4爻为下(离), 3,4,5爻为上(巽) → 风火家人
    // 动爻: (33 + 66) % 6 = 99 % 6 = 3 → 第 3 爻动
    // 变卦: 天泽履动第3爻 → 乾为天
    const chart = calculateMeihuaByNumbers(33, 66)

    expect(chart.upperNum).toBe(1)
    expect(chart.lowerNum).toBe(2)
    expect(chart.changingLine).toBe(3)

    expect(chart.benGua.name).toBe('天泽履')
    expect(chart.benGua.upper.name).toBe('乾')
    expect(chart.benGua.lower.name).toBe('兑')

    expect(chart.huGua.name).toBe('风火家人')
    expect(chart.huGua.upper.name).toBe('巽')
    expect(chart.huGua.lower.name).toBe('离')

    expect(chart.bianGua.name).toBe('乾为天')
    expect(chart.bianGua.upper.name).toBe('乾')
    expect(chart.bianGua.lower.name).toBe('乾')

    // 动爻在下卦(3) → 上卦为体(乾金), 下卦为用(兑金) → 比和
    expect(chart.tiGua.name).toBe('乾')
    expect(chart.yongGua.name).toBe('兑')
    expect(chart.tiYongRelation).toBe('体用比和')
    expect(chart.method).toBe('numbers')
    expect(chart.numbers).toEqual([33, 66])
  })

  it('handles numbers divisible by 8 (mod 8 == 0 → 8 坤) and divisible by 6 (mod 6 == 0 → 6)', () => {
    // 16 % 8 == 0 → 8 坤
    // 24 % 8 == 0 → 8 坤
    // 动爻: (16 + 24) % 6 = 40 % 6 = 4 → 第 4 爻动
    const chart = calculateMeihuaByNumbers(16, 24)
    expect(chart.upperNum).toBe(8)
    expect(chart.lowerNum).toBe(8)
    expect(chart.changingLine).toBe(4)
    expect(chart.benGua.name).toBe('坤为地')
    // 重卦互卦依然为坤为地
    expect(chart.huGua.name).toBe('坤为地')
    // 坤为地(0,0,0,0,0,0) 动第4爻(0-indexed: 3) → (0,0,0,1,0,0) → 雷地豫
    expect(chart.bianGua.name).toBe('雷地豫')
    // 体用卦取自本卦: 本卦为坤为地(上坤下坤)，动爻在上卦(4) → 下卦为体(坤土), 上卦为用(坤土) → 体用比和
    expect(chart.tiGua.name).toBe('坤')
    expect(chart.yongGua.name).toBe('坤')
    expect(chart.tiYongRelation).toBe('体用比和')
  })

  it('correctly assigns ti and yong when moving line is in upper trigram (lines 4-6)', () => {
    // 17 % 8 = 1 (乾), 24 % 8 = 8 (坤) → 本卦 天地否 (上乾下坤)
    // (17 + 24) % 6 = 41 % 6 = 5 → 动爻为 5
    // 动爻在第5爻(上卦) → 下卦为体(坤土), 上卦为用(乾金)
    // 土生金 → 体生用
    const chart = calculateMeihuaByNumbers(17, 24)
    expect(chart.upperNum).toBe(1)
    expect(chart.lowerNum).toBe(8)
    expect(chart.changingLine).toBe(5)
    expect(chart.benGua.name).toBe('天地否')
    expect(chart.tiGua.name).toBe('坤')
    expect(chart.yongGua.name).toBe('乾')
    expect(chart.tiYongRelation).toBe('体生用')
  })

  it('handles sum divisible by 6 (changingLine should be 6, not 0)', () => {
    // 8 + 16 = 24 % 6 == 0 → 动爻为 6
    const chart = calculateMeihuaByNumbers(8, 16)
    expect(chart.changingLine).toBe(6)
    // 坤为地 动第6爻 → 地山谦? 6爻翻转: (0,0,0,0,0,1) 上艮下坤 → 山地剥
    expect(chart.bianGua.name).toBe('山地剥')
  })

  it('validates number input ranges and rounds decimals if given', () => {
    const chart = calculateMeihuaByNumbers(1.2, 8.8)
    expect(chart.upperNum).toBe(1) // round(1.2) = 1
    expect(chart.lowerNum).toBe(1) // round(8.8) = 9 % 8 = 1
  })
})

