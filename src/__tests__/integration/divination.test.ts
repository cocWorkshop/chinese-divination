/**
 * Integration tests for all divination types.
 *
 * Tests the handler pipeline: extractBirthInputs → calculator → chart output.
 * Calls handler.calculate() directly (no HTTP/auth needed).
 *
 * Coverage:
 *   - BaZi: 15 cases (solar/lunar, precise/fuzzy, DST, various decades)
 *   - ZiWei: 13 cases (shichen, gender pairs, various dates, precise, DST)
 *   - LiuYao: 5 cases (various line combinations)
 *   - QiMen: 5 cases (various dates/times)
 *   - MeiHua: 5 cases (various dates/shichen)
 *   - Cross-type: 4 consistency + prompt checks
 */

import { describe, it, expect } from 'vitest'
import { selectHandler, type DivinationContext } from '@/app/api/divination/handlers'

function makeCtx(type: string, inputData: Record<string, unknown>): DivinationContext {
  return {
    type,
    inputData,
    language: 'zh-TW',
    targetPersonInfo: '',
    clientDate: new Date(),
  }
}

// ══════════════════════════════════════════════════════════════
// BaZi — 15 cases
// ══════════════════════════════════════════════════════════════
describe('BaZi Integration — handler.calculate()', () => {
  const cases = [
    { label: '1988 autumn male fuzzy', input: { birthDate: '1988-09-17', birthTime: 'hai', gender: 'male', lunarToggle: 'solar' } },
    { label: '1990 spring female fuzzy', input: { birthDate: '1990-05-15', birthTime: 'si', gender: 'female', lunarToggle: 'solar' } },
    { label: '2000 summer male fuzzy', input: { birthDate: '2000-06-15', birthTime: 'wu', gender: 'male', lunarToggle: 'solar' } },
    { label: '2024 spring female fuzzy', input: { birthDate: '2024-02-10', birthTime: 'mao', gender: 'female', lunarToggle: 'solar' } },
    { label: '1988 lunar male', input: { birthDate: '1988-08-07', birthTime: 'hai', gender: 'male', lunarToggle: 'lunar' } },
    { label: '2024 lunar spring fest', input: { birthDate: '2024-01-01', birthTime: 'wu', gender: 'male', lunarToggle: 'lunar' } },
    { label: '2000 precise Shanghai', input: { birthDate: '2000-06-15', birthTime: 'wu', exactTime: '12:30', gender: 'male', lunarToggle: 'solar', timeMode: 'precise', birthPlace: '上海', birthLng: 121.47, birthLat: 31.23 } },
    { label: '2000 precise Urumqi', input: { birthDate: '2000-06-15', birthTime: 'wu', exactTime: '13:00', gender: 'male', lunarToggle: 'solar', timeMode: 'precise', birthPlace: '乌鲁木齐', birthLng: 87.6, birthLat: 43.8 } },
    { label: '1988 DST summer precise', input: { birthDate: '1988-06-15', birthTime: 'wei', exactTime: '15:00', gender: 'male', lunarToggle: 'solar', timeMode: 'precise', birthPlace: '上海', birthLng: 121.47, birthLat: 31.23 } },
    { label: '1989 DST fuzzy', input: { birthDate: '1989-06-04', birthTime: 'wu', gender: 'male', lunarToggle: 'solar' } },
    { label: 'early zi', input: { birthDate: '2000-06-15', birthTime: 'zi_early', gender: 'male', lunarToggle: 'solar' } },
    { label: 'late zi', input: { birthDate: '2000-06-15', birthTime: 'zi_late', gender: 'male', lunarToggle: 'solar' } },
    { label: 'lichun 2024-02-04', input: { birthDate: '2024-02-04', birthTime: 'si', gender: 'male', lunarToggle: 'solar' } },
    { label: 'leap day 2024', input: { birthDate: '2024-02-29', birthTime: 'wu', gender: 'female', lunarToggle: 'solar' } },
    { label: '1950s', input: { birthDate: '1955-12-25', birthTime: 'you', gender: 'male', lunarToggle: 'solar' } },
  ]

  for (const tc of cases) {
    it(tc.label, () => {
      const ctx = makeCtx('bazi', tc.input)
      const handler = selectHandler(ctx)
      expect(handler).toBeDefined()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { chart, userMessage } = handler.calculate(ctx) as { chart: any; userMessage: string }
      expect(chart).not.toBeNull()
      expect(userMessage).toContain('八字')
      expect(chart.yearPillar.stem).toBeTruthy()
      expect(chart.monthPillar.stem).toBeTruthy()
      expect(chart.dayPillar.stem).toBeTruthy()
      expect(chart.hourPillar.stem).toBeTruthy()
      expect(chart.dayMaster.stem).toBeTruthy()
      expect(['strong', 'weak', 'neutral']).toContain(chart.strength)
      const fe = chart.fiveElements
      expect(fe.metal + fe.wood + fe.water + fe.fire + fe.earth).toBeGreaterThan(0)
      expect(chart.daYun.length).toBeGreaterThanOrEqual(1)
      if (tc.input.timeMode === 'precise') {
        expect(chart.trueSolarTime).toBeDefined()
      }
      // No English field names in prompt
      expect(userMessage).not.toContain('fourPillars')
      expect(userMessage).not.toContain('tenGodStrength')
      expect(userMessage).toContain('四柱')
    })
  }
})

// ══════════════════════════════════════════════════════════════
// ZiWei — 13 cases
// ══════════════════════════════════════════════════════════════
describe('ZiWei Integration — handler.calculate()', () => {
  const cases = [
    { label: '1988 male hai', input: { birthDate: '1988-09-17', birthTime: 'hai', gender: 'male', lunarToggle: 'solar' } },
    { label: '1990 female wu', input: { birthDate: '1990-05-15', birthTime: 'wu', gender: 'female', lunarToggle: 'solar' } },
    { label: '2000 male zi', input: { birthDate: '2000-06-15', birthTime: 'zi', gender: 'male', lunarToggle: 'solar' } },
    { label: '2000 male mao', input: { birthDate: '2000-06-15', birthTime: 'mao', gender: 'male', lunarToggle: 'solar' } },
    { label: '2000 male you', input: { birthDate: '2000-06-15', birthTime: 'you', gender: 'male', lunarToggle: 'solar' } },
    { label: '2024 female si', input: { birthDate: '2024-02-10', birthTime: 'si', gender: 'female', lunarToggle: 'solar' } },
    { label: '1988 lunar', input: { birthDate: '1988-08-07', birthTime: 'hai', gender: 'male', lunarToggle: 'lunar' } },
    { label: 'gender male', input: { birthDate: '1990-08-15', birthTime: 'wu', gender: 'male', lunarToggle: 'solar' } },
    { label: 'gender female', input: { birthDate: '1990-08-15', birthTime: 'wu', gender: 'female', lunarToggle: 'solar' } },
    { label: 'leap day', input: { birthDate: '2024-02-29', birthTime: 'chen', gender: 'male', lunarToggle: 'solar' } },
    { label: 'precise Shanghai', input: { birthDate: '2000-06-15', birthTime: 'wu', exactTime: '12:30', gender: 'male', lunarToggle: 'solar', timeMode: 'precise', birthPlace: '上海', birthLng: 121.47, birthLat: 31.23 } },
    { label: 'DST precise', input: { birthDate: '1988-06-15', birthTime: 'wu', exactTime: '14:00', gender: 'male', lunarToggle: 'solar', timeMode: 'precise', birthPlace: '上海', birthLng: 121.47, birthLat: 31.23 } },
    { label: '2026 today', input: { birthDate: '2026-04-27', birthTime: 'wu', gender: 'male', lunarToggle: 'solar' } },
  ]

  for (const tc of cases) {
    it(tc.label, () => {
      const ctx = makeCtx('ziwei', tc.input)
      const handler = selectHandler(ctx)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { chart, userMessage } = handler.calculate(ctx) as { chart: any; userMessage: string }
      expect(chart).not.toBeNull()
      expect(userMessage).toContain('紫微')
      const zChart = chart.chart
      expect(zChart.palaces).toHaveLength(12)
      expect(zChart.palaces.find((p: { name: string }) => p.name === '命宫')).toBeDefined()
      expect(zChart.siHua).toHaveLength(4)
      expect(zChart.fiveElementsClass).toBeTruthy()
      // No English field names
      expect(userMessage).not.toContain('dayunTimeline')
      expect(userMessage).toContain('大限时间线')
    })
  }

  it('gender affects 大限 direction', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = selectHandler(makeCtx('ziwei', { birthDate: '1990-08-15', birthTime: 'wu', gender: 'male', lunarToggle: 'solar' })).calculate(makeCtx('ziwei', { birthDate: '1990-08-15', birthTime: 'wu', gender: 'male', lunarToggle: 'solar' })) as { chart: any }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = selectHandler(makeCtx('ziwei', { birthDate: '1990-08-15', birthTime: 'wu', gender: 'female', lunarToggle: 'solar' })).calculate(makeCtx('ziwei', { birthDate: '1990-08-15', birthTime: 'wu', gender: 'female', lunarToggle: 'solar' })) as { chart: any }
    const mNames = m.chart.chart.palaces.filter((p: { decadal: { range: number[] } }) => p.decadal?.range?.[0] > 0).sort((a: { decadal: { range: number[] } }, b: { decadal: { range: number[] } }) => a.decadal.range[0] - b.decadal.range[0]).map((p: { name: string }) => p.name)
    const fNames = f.chart.chart.palaces.filter((p: { decadal: { range: number[] } }) => p.decadal?.range?.[0] > 0).sort((a: { decadal: { range: number[] } }, b: { decadal: { range: number[] } }) => a.decadal.range[0] - b.decadal.range[0]).map((p: { name: string }) => p.name)
    expect(mNames).not.toEqual(fNames)
  })
})

// ══════════════════════════════════════════════════════════════
// LiuYao — 5 cases
// ══════════════════════════════════════════════════════════════
describe('LiuYao Integration', () => {
  const cases = [
    { label: 'all yang (乾)', input: { liuyaoLines: JSON.stringify([{coins:[1,1,1],value:7},{coins:[1,1,1],value:7},{coins:[1,1,1],value:7},{coins:[1,1,1],value:7},{coins:[1,1,1],value:7},{coins:[1,1,1],value:7}]), question: '事业', readingDateTime: '2026-04-27T10:00:00' } },
    { label: 'mixed changing', input: { liuyaoLines: JSON.stringify([{coins:[1,1,1],value:7},{coins:[0,0,0],value:8},{coins:[1,1,1],value:9},{coins:[1,1,1],value:7},{coins:[0,0,0],value:8},{coins:[1,1,1],value:7}]), question: '感情', readingDateTime: '2026-04-27T10:00:00' } },
    { label: 'multi changing', input: { liuyaoLines: JSON.stringify([{coins:[1,1,1],value:9},{coins:[0,0,0],value:6},{coins:[1,1,1],value:7},{coins:[0,0,0],value:8},{coins:[1,1,1],value:9},{coins:[0,0,0],value:6}]), question: '财运', readingDateTime: '2026-04-27T10:00:00' } },
    { label: 'all yin (坤)', input: { liuyaoLines: JSON.stringify([{coins:[0,0,0],value:8},{coins:[0,0,0],value:8},{coins:[0,0,0],value:8},{coins:[0,0,0],value:8},{coins:[0,0,0],value:8},{coins:[0,0,0],value:8}]), question: '健康', readingDateTime: '2026-04-27T10:00:00' } },
    { label: 'one old yin', input: { liuyaoLines: JSON.stringify([{coins:[1,1,1],value:7},{coins:[1,1,1],value:7},{coins:[0,0,0],value:6},{coins:[0,0,0],value:8},{coins:[0,0,0],value:8},{coins:[1,1,1],value:7}]), question: '投资', readingDateTime: '2026-04-27T10:00:00' } },
  ]
  for (const tc of cases) {
    it(tc.label, () => {
      const ctx = makeCtx('liuyao', tc.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { chart } = selectHandler(ctx).calculate(ctx) as { chart: any }
      expect(chart).not.toBeNull()
      expect(chart.originalHexagram.lines).toHaveLength(6)
      const rawLines = JSON.parse(tc.input.liuyaoLines) as { value: number }[]
      if (rawLines.some(l => l.value === 6 || l.value === 9)) {
        expect(chart.changedHexagram).not.toBeNull()
      }
    })
  }
})

// ══════════════════════════════════════════════════════════════
// QiMen — 5 cases
// ══════════════════════════════════════════════════════════════
describe('QiMen Integration', () => {
  const cases = [
    { label: 'spring morning', input: { question: '签约', readingDateTime: '2026-04-27T09:00:00' } },
    { label: 'summer afternoon', input: { question: '方位', readingDateTime: '2026-07-15T14:30:00' } },
    { label: 'autumn evening', input: { question: '投资', readingDateTime: '2026-10-01T19:00:00' } },
    { label: 'winter night', input: { question: '搬家', readingDateTime: '2026-01-15T22:00:00' } },
    { label: 'midnight', input: { question: '决策', readingDateTime: '2026-04-27T00:30:00' } },
  ]
  for (const tc of cases) {
    it(tc.label, () => {
      const ctx = makeCtx('qimen', tc.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { chart } = selectHandler(ctx).calculate(ctx) as { chart: any }
      expect(chart).not.toBeNull()
      expect(chart.palaces).toHaveLength(9)
      expect(chart.zhiFu).toBeTruthy()
      expect(chart.grid).toHaveLength(3)
    })
  }
})

// ══════════════════════════════════════════════════════════════
// MeiHua — 5 cases
// ══════════════════════════════════════════════════════════════
describe('MeiHua Integration', () => {
  const cases = [
    { label: 'morning', input: { question: '运势', readingDateTime: '2026-04-27T08:00:00' } },
    { label: 'noon', input: { question: '合作', readingDateTime: '2026-04-27T12:00:00' } },
    { label: 'evening', input: { question: '感情', readingDateTime: '2026-04-27T18:00:00' } },
    { label: 'other month', input: { question: '事业', readingDateTime: '2026-06-15T10:00:00' } },
    { label: 'winter', input: { question: '总结', readingDateTime: '2026-12-21T14:00:00' } },
  ]
  for (const tc of cases) {
    it(tc.label, () => {
      const ctx = makeCtx('meihua', tc.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { chart } = selectHandler(ctx).calculate(ctx) as { chart: any }
      expect(chart).not.toBeNull()
      expect(chart.benGua).toBeDefined()
      expect(chart.huGua).toBeDefined()
      expect(chart.bianGua).toBeDefined()
      expect(chart.tiYongRelation).toBeTruthy()
    })
  }
})

// ══════════════════════════════════════════════════════════════
// Cross-type consistency
// ══════════════════════════════════════════════════════════════
describe('Cross-type consistency', () => {
  it('bazi deterministic', () => {
    const ctx = makeCtx('bazi', { birthDate: '1988-09-17', birthTime: 'hai', gender: 'male', lunarToggle: 'solar' })
    const h = selectHandler(ctx)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r1 = h.calculate(ctx) as { chart: any }, r2 = h.calculate(ctx) as { chart: any }
    expect(r1.chart.yearPillar.stem + r1.chart.yearPillar.branch).toBe(r2.chart.yearPillar.stem + r2.chart.yearPillar.branch)
  })

  it('lunar bazi = solar equivalent', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r1 = selectHandler(makeCtx('bazi', { birthDate: '1988-08-07', birthTime: 'hai', gender: 'male', lunarToggle: 'lunar' })).calculate(makeCtx('bazi', { birthDate: '1988-08-07', birthTime: 'hai', gender: 'male', lunarToggle: 'lunar' })) as { chart: any }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r2 = selectHandler(makeCtx('bazi', { birthDate: '1988-09-17', birthTime: 'hai', gender: 'male', lunarToggle: 'solar' })).calculate(makeCtx('bazi', { birthDate: '1988-09-17', birthTime: 'hai', gender: 'male', lunarToggle: 'solar' })) as { chart: any }
    expect(r1.chart.yearPillar.stem).toBe(r2.chart.yearPillar.stem)
    expect(r1.chart.dayPillar.stem).toBe(r2.chart.dayPillar.stem)
  })
})
