import { describe, it, expect } from 'vitest'
import { baziHandler } from '../personal/bazi'
import type { DivinationContext } from '../_types'

function makeCtx(inputData: Record<string, unknown>, overrides: Partial<DivinationContext> = {}): DivinationContext {
  return {
    type: 'bazi',
    language: 'zh-TW',
    inputData,
    question: undefined,
    targetPersonInfo: '',
    clientDate: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('baziHandler.canHandle', () => {
  it('false without birthDate', () => {
    expect(baziHandler.canHandle(makeCtx({ birthTime: 'wu' }))).toBe(false)
  })
  it('false without birthTime or exactTime', () => {
    expect(baziHandler.canHandle(makeCtx({ birthDate: '1988-09-17' }))).toBe(false)
  })
  it('true with birthDate + fuzzy birthTime', () => {
    expect(baziHandler.canHandle(makeCtx({ birthDate: '1988-09-17', birthTime: 'wu' }))).toBe(true)
  })
  it('true with birthDate + exactTime (precise mode)', () => {
    expect(baziHandler.canHandle(makeCtx({
      birthDate: '1988-09-17', timeMode: 'precise', exactTime: '11:30',
    }))).toBe(true)
  })
})

describe('baziHandler.calculate', () => {
  it('produces a BaZi chart and userMessage with today\'s pillars', () => {
    const ctx = makeCtx({
      birthDate: '1988-09-17', birthTime: 'wu', gender: 'male', birthPlace: '北京',
    })
    const { chart, userMessage } = baziHandler.calculate(ctx)
    expect(chart).not.toBeNull()
    expect(chart!.yearPillar.stem).toBeDefined()
    expect(chart!.dayMaster.stem).toBeDefined()
    expect(chart!.daYun.length).toBeGreaterThan(0)
    expect(userMessage).toContain('八字命理精批')
    expect(userMessage).toContain('四柱')
    expect(userMessage).toContain('1988-09-17')
    expect(userMessage).toContain('北京')
  })

  it('includes targetPersonInfo when set', () => {
    const ctx = makeCtx(
      { birthDate: '1988-09-17', birthTime: 'wu', gender: 'male' },
      { targetPersonInfo: '此次预测对象为用户的配偶（张三）' }
    )
    const { userMessage } = baziHandler.calculate(ctx)
    expect(userMessage).toContain('配偶（张三）')
  })

  it('notes lunar-original when user input was lunar', () => {
    const ctx = makeCtx({
      birthDate: '1988-08-07', lunarToggle: 'lunar', birthTime: 'wu', gender: 'male',
    })
    const { userMessage } = baziHandler.calculate(ctx)
    expect(userMessage).toMatch(/农历/)
  })

  it('falls back to generic message when solarBirthDate is missing post-extract', () => {
    // hasBirthDateTime should reject this upstream, but calculate() also guards.
    const ctx = makeCtx({ birthTime: 'wu', gender: 'male' })
    const { chart, userMessage } = baziHandler.calculate(ctx)
    expect(chart).toBeNull()
    expect(userMessage).toContain('请为我')
  })
})

describe('baziHandler.merge', () => {
  it('injects pillars, dayMaster, fiveElements, daYun into the LLM result', () => {
    const ctx = makeCtx({ birthDate: '1988-09-17', birthTime: 'wu', gender: 'male' })
    const { chart } = baziHandler.calculate(ctx)
    expect(chart).not.toBeNull()

    const llmResult: Record<string, unknown> = {
      sections: { overview: 'x', career: 'y', marriage: 'z' },
    }
    baziHandler.merge!(llmResult, chart!, ctx)

    expect(llmResult.pillars).toBeDefined()
    expect((llmResult.pillars as { year: { stem: string } }).year.stem).toBe(chart!.yearPillar.stem)
    expect((llmResult.dayMaster as { stem: string }).stem).toBe(chart!.dayMaster.stem)
    expect(llmResult.fiveElements).toBe(chart!.fiveElements)
    expect(llmResult.daYun).toBe(chart!.daYun)
    expect(llmResult.qiYun).toBe(chart!.qiYun)
  })

  it('uses programmatic luckyElements when LLM omits them', () => {
    const ctx = makeCtx({ birthDate: '1988-09-17', birthTime: 'wu', gender: 'male' })
    const { chart } = baziHandler.calculate(ctx)
    const llmResult: Record<string, unknown> = { sections: { a: 1, b: 2, c: 3 } }
    baziHandler.merge!(llmResult, chart!, ctx)
    expect(llmResult.luckyElements).toBe(chart!.luckyElements)
    expect(llmResult.avoidElements).toBe(chart!.avoidElements)
  })

  it('preserves LLM luckyElements when present', () => {
    const ctx = makeCtx({ birthDate: '1988-09-17', birthTime: 'wu', gender: 'male' })
    const { chart } = baziHandler.calculate(ctx)
    const llmResult: Record<string, unknown> = {
      sections: { a: 1, b: 2, c: 3 },
      luckyElements: ['金', '水'],
    }
    baziHandler.merge!(llmResult, chart!, ctx)
    expect(llmResult.luckyElements).toEqual(['金', '水'])
  })
})

describe('baziHandler.schema (Zod validation)', () => {
  it('accepts sections with ≥3 keys', () => {
    const result = baziHandler.schema.passthrough().safeParse({
      type: 'bazi',
      version: 2,
      formation: { name: '正官格', analysis: '月令正官透出' },
      sections: { overview: 'x', career: 'y', marriage: 'z', wealth: 'w', health: 'h' },
      daYunAnalysis: [],
      pillars: {
        year: { stem: '甲', branch: '子', element: '木', nayin: '海中金' },
        month: { stem: '甲', branch: '子', element: '木', nayin: '海中金' },
        day: { stem: '甲', branch: '子', element: '木', nayin: '海中金' },
        hour: { stem: '甲', branch: '子', element: '木', nayin: '海中金' },
      },
      dayMaster: { stem: '甲', element: '木', strength: 'strong', strengthLabel: '身强' },
      fiveElements: { metal: 1, wood: 2, water: 1, fire: 1, earth: 1 },
      keyAdvice: ['a'],
      luckyInfo: { colors: ['红'], directions: ['南'] },
    })
    expect(result.success).toBe(true)
  })
  it('rejects missing sections', () => {
    const result = baziHandler.schema.safeParse({ type: 'bazi' })
    expect(result.success).toBe(false)
  })
})

describe('baziHandler.buildSchema', () => {
  it('includes suggestedQuestions honoring language + age', () => {
    const schema = baziHandler.buildSchema!(makeCtx(
      { birthDate: '1988-09-17' },
      { userAge: 36, userGender: 'male', language: 'zh-TW' }
    ))
    expect(Array.isArray(schema.suggestedQuestions)).toBe(true)
    expect((schema.suggestedQuestions as string[]).length).toBe(3)
    // zh-TW, age provided → prompts should contain the age hint.
    expect((schema.suggestedQuestions as string[])[0]).toContain('36岁')
  })

  it('emits English prompts when language=en', () => {
    const schema = baziHandler.buildSchema!(makeCtx({}, { language: 'en' }))
    expect((schema.suggestedQuestions as string[])[0]).toMatch(/compelling question/i)
  })
})
