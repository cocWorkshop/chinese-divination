import { describe, it, expect } from 'vitest'
import { ziweiHandler } from '../personal/ziwei'
import type { DivinationContext } from '../_types'

function makeCtx(inputData: Record<string, unknown>, overrides: Partial<DivinationContext> = {}): DivinationContext {
  return {
    type: 'ziwei',
    language: 'zh-TW',
    inputData,
    question: undefined,
    targetPersonInfo: '',
    clientDate: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('ziweiHandler.canHandle', () => {
  it('false without birth date+time', () => {
    expect(ziweiHandler.canHandle(makeCtx({}))).toBe(false)
  })
  it('true with date + fuzzy shichen', () => {
    expect(ziweiHandler.canHandle(makeCtx({ birthDate: '1988-09-17', birthTime: 'wu' }))).toBe(true)
  })
})

describe('ziweiHandler.calculate (fuzzy mode)', () => {
  it('produces a chart and userMessage with palaces + dayun', () => {
    const ctx = makeCtx({
      birthDate: '1988-09-17', birthTime: 'wu', gender: 'male', birthPlace: '北京',
    })
    const { chart, userMessage } = ziweiHandler.calculate(ctx)
    expect(chart).not.toBeNull()
    expect(chart!.chart.palaces.length).toBeGreaterThan(0)
    expect(userMessage).toContain('紫微斗数命盘精批')
    expect(userMessage).toContain('大限时间线')
    expect(userMessage).toContain('已识别格局')
    // Fuzzy mode should NOT mention true-solar-time correction.
    expect(userMessage).not.toMatch(/真太阳时校正/)
  })
})

describe('ziweiHandler.calculate (precise mode with true-solar-time)', () => {
  it('adds 真太阳时校正 info string', () => {
    const ctx = makeCtx({
      birthDate: '1988-09-17', timeMode: 'precise', exactTime: '14:35',
      gender: 'male', birthLng: 116.4, birthLat: 39.9, birthPlace: '北京',
    })
    const { chart, userMessage } = ziweiHandler.calculate(ctx)
    expect(chart).not.toBeNull()
    expect(userMessage).toMatch(/真太阳时校正/)
  })
})

describe('ziweiHandler.merge', () => {
  it('builds ziweiChart + overrides palaces + produces mainStars', () => {
    const ctx = makeCtx({ birthDate: '1988-09-17', birthTime: 'wu', gender: 'male' })
    const { chart } = ziweiHandler.calculate(ctx)
    expect(chart).not.toBeNull()

    const llmResult: Record<string, unknown> = {
      sections: { overview: 'x', career: 'y', marriage: 'z' },
      palaces: { '命宫': { analysis: 'LLM analysis of 命宫' } },
    }
    ziweiHandler.merge!(llmResult, chart!, ctx)

    expect(llmResult.ziweiChart).toBeDefined()
    const merged = llmResult.palaces as Record<string, { analysis?: string; heavenlyStem?: string }>
    // Programmatic heavenlyStem should be present on every palace.
    for (const palace of chart!.chart.palaces) {
      expect(merged[palace.name].heavenlyStem).toBe(palace.heavenlyStem)
    }
    // LLM analysis for 命宫 preserved.
    expect(merged['命宫'].analysis).toBe('LLM analysis of 命宫')
    // Palaces without LLM analysis default to ''.
    expect(merged['财帛'].analysis).toBe('')
    expect(Array.isArray(llmResult.mainStars)).toBe(true)
  })
})

describe('ziweiHandler.schema (Zod validation)', () => {
  it('rejects missing sections', () => {
    const result = ziweiHandler.schema.safeParse({ type: 'ziwei' })
    expect(result.success).toBe(false)
  })
})
