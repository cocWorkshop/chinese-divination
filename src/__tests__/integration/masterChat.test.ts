/**
 * Master Chat integration tests — 25 scenarios.
 * Tests deterministic parts without LLM calls.
 * Uses self-contained test fixtures created in beforeAll and cleaned up in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { renderGreeting, pickOpener, type GreetingInput } from '@/lib/master/greetings'
import { buildMasterSystemPrompt } from '@/lib/master/systemPrompt/buildSystemPrompt'
import { masterToolRegistry } from '@/lib/master/tools'
import { buildSkillsCatalog } from '@/lib/master/skills'
import type { ToolContext } from '@/lib/master/tools/_types'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TEST_EMAIL = `test-master-chat-${process.pid}@test.local`

let userId: string
let testReadingId: string
let testFamilyMemberId: string
let ctx: ToolContext

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: '测试用户',
      birthDate: '1990-05-15',
      birthTime: 'wu',
      gender: 'male',
      credits: 10,
    },
  })
  userId = user.id

  const reading = await prisma.reading.create({
    data: {
      userId,
      type: 'bazi',
      status: 'completed',
      result: JSON.stringify({ summary: '测试测算结果', overview: '整体运势平稳' }),
      inputData: { birthDate: '1990-05-15' },
    },
  })
  testReadingId = reading.id

  const member = await prisma.familyMember.create({
    data: {
      userId,
      relation: 'parent',
      name: '测试家属',
      gender: 'male',
      birthDate: '1965-01-01',
      birthTime: 'zi',
    },
  })
  testFamilyMemberId = member.id

  ctx = { userId, lang: 'zh-TW', prisma }
})

afterAll(async () => {
  if (userId) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  }
  await prisma.$disconnect()
})

// ═══ Scenarios 1-3: Greetings ═══
describe('Master Greeting', () => {
  it('S1: first-time user greeting', () => {
    const input: GreetingInput = {
      lang: 'zh-TW',
      hasReadings: false,
      lastReading: null,
      readingTypeCounts: {},
      temporalContext: { dayGanZhi: '甲子', jieQi: '穀雨', yearGanZhi: '丙午' },
    }
    const result = renderGreeting(input)
    expect(result.text).toBeTruthy()
    expect(result.text.length).toBeGreaterThan(10)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('S2: returning user with readings', () => {
    const result = renderGreeting({
      lang: 'zh-TW',
      hasReadings: true,
      lastReading: { type: 'bazi', createdAt: new Date().toISOString() },
      readingTypeCounts: { bazi: 3, ziwei: 1 },
      temporalContext: { dayGanZhi: '甲子', jieQi: '穀雨', yearGanZhi: '丙午' },
    })
    expect(result.text).toBeTruthy()
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('S3: pickOpener returns bilingual openers', () => {
    const zh = pickOpener('zh-TW')
    expect(zh.length).toBeGreaterThan(5)
    const en = pickOpener('en')
    expect(en.length).toBeGreaterThan(5)
    expect(zh).not.toBe(en)
  })
})

// ═══ Scenarios 4-9: Tool execution ═══
describe('Master Tools', () => {
  it('S4: get_user_profile', async () => {
    const result = await masterToolRegistry.execute('get_user_profile', {}, ctx)
    expect(result.ok).toBe(true)
  })

  it('S5: list_family_members', async () => {
    const result = await masterToolRegistry.execute('list_family_members', {}, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const members = (result.data as { members: unknown[] }).members
      expect(Array.isArray(members)).toBe(true)
      expect(members.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('S6: list_readings', async () => {
    const result = await masterToolRegistry.execute('list_readings', { type: 'bazi' }, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const readings = (result.data as { readings: unknown[] }).readings
      expect(Array.isArray(readings)).toBe(true)
      expect(readings.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('S7: get_reading valid id', async () => {
    const result = await masterToolRegistry.execute('get_reading', { readingId: testReadingId }, ctx)
    expect(result.ok).toBe(true)
  })

  it('S8: get_reading invalid id → NOT_FOUND', async () => {
    const result = await masterToolRegistry.execute('get_reading', { readingId: 'nonexistent_xxxxx' }, ctx)
    expect(result.ok).toBe(false)
  })

  it('S9: prefill_divination_form self', async () => {
    const result = await masterToolRegistry.execute('prefill_divination_form', { type: 'bazi', target: { kind: 'self' } }, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const d = result.data as { url: string; ctaContext: { target: string } }
      expect(d.url).toContain('/divination/bazi')
      expect(d.ctaContext.target).toContain('自己')
    }
  })
})

// ═══ Scenarios 10-12: Prefill targets ═══
describe('Master Prefill targets', () => {
  it('S10: self target', async () => {
    const r = await masterToolRegistry.execute('prefill_divination_form', { type: 'ziwei', target: { kind: 'self' } }, ctx)
    expect(r.ok).toBe(true)
    if (r.ok) expect((r.data as { divinationType: string }).divinationType).toBe('ziwei')
  })

  it('S11: existing family member', async () => {
    const r = await masterToolRegistry.execute('prefill_divination_form', { type: 'bazi', target: { kind: 'family', familyMemberId: testFamilyMemberId } }, ctx)
    expect(r.ok).toBe(true)
    if (r.ok) expect((r.data as { url: string }).url).toContain('familyMemberId')
  })

  it('S12: new family member', async () => {
    const r = await masterToolRegistry.execute('prefill_divination_form', {
      type: 'bazi', target: { kind: 'newFamily', relation: 'spouse', name: '测试' },
      prefill: { birthDate: '1990-05-15', birthTime: 'wu', gender: 'female' },
    }, ctx)
    expect(r.ok).toBe(true)
    if (r.ok) {
      const d = r.data as { ctaContext: { target: string; birthDate: string } }
      expect(d.ctaContext.target).toContain('配偶')
      expect(d.ctaContext.birthDate).toBe('1990-05-15')
    }
  })
})

// ═══ Scenarios 13-15: System prompt ═══
describe('Master System Prompt', () => {
  it('S13: zh-TW prompt', () => {
    const p = buildMasterSystemPrompt({ lang: 'zh-TW', currentDateTime: new Date().toISOString() })
    expect(p).toContain('玄機')
    expect(p).toContain('get_user_profile')
    expect(p.length).toBeGreaterThan(500)
  })

  it('S14: en prompt', () => {
    const p = buildMasterSystemPrompt({ lang: 'en', currentDateTime: new Date().toISOString() })
    expect(p).toContain('Xuanji')
    expect(p.length).toBeGreaterThan(500)
  })

  it('S15: prompt with portrait', () => {
    const p = buildMasterSystemPrompt({ lang: 'zh-TW', currentDateTime: new Date().toISOString(), personalizedPrompt: 'User interested in career, software engineer, prefers direct answers' })
    expect(p).toContain('career')
  })
})

// ═══ Scenarios 16-18: Skills ═══
describe('Master Skills', () => {
  it('S16: zh skills catalog', () => {
    const c = buildSkillsCatalog('zh-TW')
    expect(c).toContain('合盘')
  })

  it('S17: gua_ming_hu_can in catalog', () => {
    const c = buildSkillsCatalog('zh-TW')
    expect(c).toContain('卦命互参')
  })

  it('S18: en skills catalog', () => {
    const c = buildSkillsCatalog('en')
    expect(c.length).toBeGreaterThan(50)
  })
})

// ═══ Scenarios 19-21: Error handling ═══
describe('Master Errors', () => {
  it('S19: wrong user → NOT_FOUND', async () => {
    const r = await masterToolRegistry.execute('get_reading', { readingId: 'any' }, { userId: 'fake_user', lang: 'zh-TW', prisma })
    expect(r.ok).toBe(false)
  })

  it('S20: other relation without detail → error', async () => {
    const r = await masterToolRegistry.execute('prefill_divination_form', {
      type: 'bazi', target: { kind: 'newFamily', relation: 'other' },
    }, ctx)
    expect(r.ok).toBe(false)
  })

  it('S21: list_readings unknown type → error or empty', async () => {
    const r = await masterToolRegistry.execute('list_readings', { type: 'fake' }, ctx)
    // Might return ok with empty array, or fail with validation error — both are acceptable
    if (r.ok) {
      expect((r.data as { readings: unknown[] }).readings).toHaveLength(0)
    } else {
      expect(typeof r.code).toBe('string')
    }
  })
})

// ═══ Scenarios 22-25: Edge cases ═══
describe('Master Edge cases', () => {
  it('S22: registry has 6 tools', () => {
    expect(masterToolRegistry.tools.length).toBe(7)
    expect(masterToolRegistry.get('get_user_profile')).toBeDefined()
    expect(masterToolRegistry.get('prefill_divination_form')).toBeDefined()
  })

  it('S23: prefill URL params correct', async () => {
    const r = await masterToolRegistry.execute('prefill_divination_form', {
      type: 'bazi', target: { kind: 'self' },
      prefill: { birthDate: '1990-01-15', birthTime: 'wu', gender: 'male' },
    }, { userId, lang: 'en', prisma })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const d = r.data as { url: string }
      expect(d.url).toContain('birthDate=1990-01-15')
      expect(d.url).toContain('birthTime=wu')
    }
  })

  it('S24: en prefill English text', async () => {
    const r = await masterToolRegistry.execute('prefill_divination_form', {
      type: 'bazi', target: { kind: 'self' },
    }, { userId, lang: 'en', prisma })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const d = r.data as { ctaContext: { target: string }; ctaLabel: string }
      expect(d.ctaContext.target).toContain('yourself')
      expect(d.ctaLabel).toContain('Start')
    }
  })

  it('S25: greeting with various temporal contexts', () => {
    const tcs = [
      { dayGanZhi: '甲子', jieQi: '立春', yearGanZhi: '甲辰' },
      { dayGanZhi: '庚午', jieQi: '夏至', yearGanZhi: '乙巳' },
      { dayGanZhi: '壬申', jieQi: '冬至', yearGanZhi: '丙午' },
    ]
    for (const tc of tcs) {
      const r = renderGreeting({
        lang: 'zh-TW',
        hasReadings: true,
        lastReading: { type: 'bazi', createdAt: new Date().toISOString() },
        readingTypeCounts: { bazi: 1 },
        temporalContext: tc,
      })
      expect(r.text).toBeTruthy()
    }
  })
})
