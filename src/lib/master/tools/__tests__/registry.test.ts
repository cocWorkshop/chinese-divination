import { describe, it, expect, vi, beforeEach } from 'vitest'
import { masterToolRegistry } from '../index'
import type { ToolContext } from '../_types'

function makeCtx(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    userId: 'user_test_1',
    lang: 'zh-TW',
    prisma: {} as never,
    ...overrides,
  } as ToolContext
}

describe('masterToolRegistry', () => {
  it('registers exactly 7 tools', () => {
    expect(masterToolRegistry.tools.length).toBe(7)
  })

  it('exposes expected tool names', () => {
    const names = masterToolRegistry.tools.map((t) => t.name).sort()
    expect(names).toEqual([
      'get_reading',
      'get_reading_detail',
      'get_user_profile',
      'list_family_members',
      'list_readings',
      'prefill_divination_form',
      'show_reading_card',
    ])
  })

  it('toolDefs() produces OpenAI-format function tools', () => {
    const defs = masterToolRegistry.toolDefs()
    expect(defs.length).toBe(7)
    for (const d of defs) {
      expect(d.type).toBe('function')
      expect(typeof d.function.name).toBe('string')
      expect(typeof d.function.description).toBe('string')
      expect(d.function.description!.length).toBeGreaterThan(50)
      expect(d.function.parameters).toBeDefined()
      expect((d.function.parameters as Record<string, unknown>).type).toBe('object')
    }
  })

  // Regression — Azure OpenAI's function-calling validator rejects a tool
  // schema if any property type is not one of the legal JSON Schema primitives.
  // A Zod v3→v4 migration broke z.literal() walking so `{type:'undefined'}`
  // was emitted for the literal `kind` discriminator in
  // prefill_divination_form's Target union, causing a 400 from OpenRouter.
  it('toolDefs() schemas contain only valid JSON Schema type values (no "undefined")', () => {
    const VALID_TYPES = new Set([
      'string', 'number', 'integer', 'boolean', 'object', 'array', 'null',
    ])
    const defs = masterToolRegistry.toolDefs()

    function walk(node: unknown, path: string): void {
      if (!node || typeof node !== 'object') return
      const obj = node as Record<string, unknown>
      if ('type' in obj) {
        const t = obj.type
        if (typeof t === 'string') {
          expect(VALID_TYPES.has(t), `invalid JSON Schema type "${t}" at ${path}`).toBe(true)
        } else if (Array.isArray(t)) {
          for (const sub of t) {
            expect(typeof sub === 'string' && VALID_TYPES.has(sub), `invalid type in array at ${path}`).toBe(true)
          }
        }
      }
      // Recurse into nested schema nodes.
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) {
          v.forEach((c, i) => walk(c, `${path}.${k}[${i}]`))
        } else if (v && typeof v === 'object') {
          walk(v, `${path}.${k}`)
        }
      }
    }

    for (const d of defs) {
      walk(d.function.parameters, d.function.name)
    }
  })

  it('prefill_divination_form target union preserves literal "kind" discriminator', () => {
    const def = masterToolRegistry.toolDefs().find(
      (d) => d.function.name === 'prefill_divination_form'
    )!
    const params = def.function.parameters as {
      properties: { target: { anyOf: Array<{ properties: { kind: { const?: unknown, type?: unknown } } }> } }
    }
    const branches = params.properties.target.anyOf
    expect(branches).toHaveLength(3)
    const kinds = branches.map((b) => b.properties.kind.const).sort()
    expect(kinds).toEqual(['family', 'newFamily', 'self'])
    for (const b of branches) {
      expect(b.properties.kind.type).toBe('string')
    }
  })

  it('execute() returns INVALID_INPUT for unknown tool name', async () => {
    const result = await masterToolRegistry.execute('nope', {}, makeCtx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_INPUT')
  })

  it('execute() validates input via the tool Zod schema', async () => {
    // get_reading requires { readingId: string }
    const result = await masterToolRegistry.execute('get_reading', {}, makeCtx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_INPUT')
  })

  it('catches synchronous handler errors and returns INTERNAL', async () => {
    const failingCtx = makeCtx({
      prisma: {
        user: { findUnique: () => { throw new Error('boom') } },
      } as never,
    })
    const result = await masterToolRegistry.execute('get_user_profile', {}, failingCtx)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL')
      expect(result.message).toMatch(/boom/)
    }
  })
})

describe('get_user_profile tool', () => {
  it('returns isComplete=true for a complete profile', async () => {
    const ctx = makeCtx({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            birthDate: '1990-01-01', birthTime: 'zi', gender: 'male', birthPlace: 'Beijing',
            exactTime: null, timeMode: 'fuzzy', calendarType: 'solar',
            birthEnvironment: null, birthLat: null, birthLng: null,
            name: 'Alice', language: 'zh',
          }),
        },
      } as never,
    })
    const result = await masterToolRegistry.execute('get_user_profile', {}, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.data as { isComplete: boolean }).isComplete).toBe(true)
    }
  })

  it('returns isComplete=false for a sparse profile', async () => {
    const ctx = makeCtx({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            birthDate: null, birthTime: null, gender: null, birthPlace: null,
            exactTime: null, timeMode: null, calendarType: null,
            birthEnvironment: null, birthLat: null, birthLng: null,
            name: null, language: 'zh',
          }),
        },
      } as never,
    })
    const result = await masterToolRegistry.execute('get_user_profile', {}, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.data as { isComplete: boolean }).isComplete).toBe(false)
    }
  })

  it('returns NOT_FOUND when user row is missing', async () => {
    const ctx = makeCtx({
      prisma: { user: { findUnique: vi.fn().mockResolvedValue(null) } } as never,
    })
    const result = await masterToolRegistry.execute('get_user_profile', {}, ctx)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })
})

describe('list_family_members tool', () => {
  it('returns members with isComplete computed', async () => {
    const ctx = makeCtx({
      prisma: {
        familyMember: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'fm1', relation: 'spouse', relationDetail: null, name: 'Alice',
              birthDate: '1992-05-10', birthTime: 'wu', exactTime: null, timeMode: 'fuzzy',
              birthPlace: 'Shanghai', gender: 'female', calendarType: 'solar',
            },
            {
              id: 'fm2', relation: 'other', relationDetail: '岳父', name: null,
              birthDate: null, birthTime: null, exactTime: null, timeMode: null,
              birthPlace: null, gender: 'male', calendarType: null,
            },
          ]),
        },
      } as never,
    })
    const result = await masterToolRegistry.execute('list_family_members', {}, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const { members } = result.data as { members: Array<{ id: string, isComplete: boolean, relationDetail: string | null }> }
      expect(members).toHaveLength(2)
      expect(members[0]).toMatchObject({ id: 'fm1', isComplete: true })
      expect(members[1]).toMatchObject({ id: 'fm2', isComplete: false, relationDetail: '岳父' })
    }
  })
})

describe('list_readings tool', () => {
  it('returns metadata-only summaries filtered by type', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'r1', type: 'bazi', createdAt: new Date('2026-04-01'),
        targetType: 'self', familyMemberId: null, question: null,
        llmRawOutput: 'some text', status: 'completed',
        result: JSON.stringify({ pillars: {} }),
      },
      {
        id: 'r2', type: 'bazi', createdAt: new Date('2026-03-01'),
        targetType: 'self', familyMemberId: null, question: null,
        llmRawOutput: null, status: 'completed',
        result: JSON.stringify({ paipanOnly: true, type: 'bazi' }),
      },
    ])
    const ctx = makeCtx({ prisma: { reading: { findMany } } as never })
    const result = await masterToolRegistry.execute('list_readings', { type: 'bazi', targetType: 'self' }, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const { readings } = result.data as { readings: Array<{ id: string, hasInterpretation: boolean, isPaipanOnly: boolean }> }
      expect(readings).toHaveLength(2)
      expect(readings[0]).toMatchObject({ id: 'r1', hasInterpretation: true, isPaipanOnly: false })
      expect(readings[1]).toMatchObject({ id: 'r2', hasInterpretation: false, isPaipanOnly: true })
    }

    // Verify the query was scoped to the user and excluded deleted rows.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user_test_1', type: 'bazi', targetType: 'self', deletedAt: null,
        }),
      }),
    )
  })

  it('rejects limit > 30', async () => {
    const result = await masterToolRegistry.execute('list_readings', { limit: 999 }, makeCtx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_INPUT')
  })
})

describe('get_reading tool', () => {
  it('slices a bazi reading into header + sections', async () => {
    const ctx = makeCtx({
      prisma: {
        reading: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'r1', type: 'bazi',
            question: '測試問題',
            createdAt: new Date('2026-04-11T12:00:00Z'),
            result: JSON.stringify({
              type: 'bazi', version: 2,
              pillars: { year: { stem: '甲', branch: '子', element: '木', nayin: '海中金' } },
              dayMaster: { stem: '戊', element: '土', strengthLabel: '身强' },
              fiveElements: { metal: 0, wood: 1, water: 0, fire: 0, earth: 0 },
              formation: { name: '正官格', analysis: '...' },
              sections: { overview: '本命总论', career: 'career text', marriage: 'marriage text' },
              daYunAnalysis: [{ stem: '丁', branch: '卯' }],
            }),
          }),
        },
      } as never,
    })
    const result = await masterToolRegistry.execute('get_reading', { readingId: 'r1' }, ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const data = result.data as { header: Record<string, unknown>, overview: string, sections: string[], question?: string }
      expect((data.header.dayMaster as Record<string, unknown>).strengthLabel).toBe('身强')
      expect(data.overview).toBe('本命总论')
      expect(data.question).toBe('測試問題')
      expect(data.sections).toContain('career')
      expect(data.sections).toContain('marriage')
      expect(data.sections).toContain('daYunAnalysis')
    }
  })

  it('enforces 一事一占 discipline in get_reading and list_readings tool descriptions', () => {
    const getReadingDef = masterToolRegistry.get('get_reading')
    expect(getReadingDef?.description).toContain('一事一占')
    expect(getReadingDef?.description).toContain('prefill_divination_form')

    const listReadingsDef = masterToolRegistry.get('list_readings')
    expect(listReadingsDef?.description).toContain('一事一占')
    expect(listReadingsDef?.description).toContain('prefill_divination_form')
  })

  it('returns NOT_FOUND when reading does not belong to the user', async () => {
    const ctx = makeCtx({
      prisma: { reading: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
    })
    const result = await masterToolRegistry.execute('get_reading', { readingId: 'evil' }, ctx)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })
})

describe('get_reading_detail tool', () => {
  it('fetches a single section', async () => {
    const ctx = makeCtx({
      prisma: {
        reading: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'r1', type: 'bazi',
            result: JSON.stringify({
              sections: { career: 'career text 123' },
            }),
          }),
        },
      } as never,
    })
    const result = await masterToolRegistry.execute(
      'get_reading_detail',
      { readingId: 'r1', section: 'career' },
      ctx,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.data as { content: string }).content).toBe('career text 123')
    }
  })
})

describe('prefill_divination_form tool', () => {
  beforeEach(() => { /* no-op, ensures fresh test scope */ })

  it('builds a /divination/bazi URL for self target with prefill', async () => {
    const result = await masterToolRegistry.execute(
      'prefill_divination_form',
      {
        type: 'bazi',
        target: { kind: 'self' },
        prefill: {
          birthDate: '1990-01-01',
          birthTime: 'wu',
          birthPlace: 'Beijing',
          gender: 'male',
          timeMode: 'fuzzy',
        },
      },
      makeCtx(),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const data = result.data as { url: string, ctaLabel: string, divinationType: string }
      expect(data.divinationType).toBe('bazi')
      expect(data.url).toMatch(/^\/divination\/bazi\?/)
      expect(data.url).toContain('target=self')
      expect(data.url).toContain('birthDate=1990-01-01')
      expect(data.url).toContain('birthTime=wu')
      expect(data.url).toContain('gender=male')
      expect(data.ctaLabel).toBeTruthy()
    }
  })

  it('builds a newFamily URL with __new__ and relation', async () => {
    const result = await masterToolRegistry.execute(
      'prefill_divination_form',
      {
        type: 'ziwei',
        target: { kind: 'newFamily', relation: 'father', name: '老爸' },
        prefill: { birthDate: '1960-05-05', gender: 'male' },
      },
      makeCtx(),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const url = (result.data as { url: string }).url
      expect(url).toContain('target=family')
      expect(url).toContain('familyMemberId=__new__')
      expect(url).toContain('relation=father')
      expect(url).toMatch(/memberName=/)
    }
  })

  it("rejects newFamily with relation='other' missing relationDetail", async () => {
    const result = await masterToolRegistry.execute(
      'prefill_divination_form',
      { type: 'bazi', target: { kind: 'newFamily', relation: 'other' } },
      makeCtx(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_INPUT')
      expect(result.message).toMatch(/relationDetail is required/)
    }
  })

  it("accepts newFamily with relation='other' + relationDetail", async () => {
    const result = await masterToolRegistry.execute(
      'prefill_divination_form',
      {
        type: 'bazi',
        target: { kind: 'newFamily', relation: 'other', relationDetail: '岳父' },
      },
      makeCtx(),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const url = (result.data as { url: string }).url
      expect(url).toContain('relationDetail=%E5%B2%B3%E7%88%B6')
    }
  })
})

describe('show_reading_card tool', () => {
  function makeReadingFindFirst(reading: unknown) {
    return vi.fn().mockResolvedValue(reading)
  }

  it('returns a card payload with title/subtitle/url for an owned reading', async () => {
    const findFirst = makeReadingFindFirst({
      id: 'r1',
      type: 'bazi',
      createdAt: new Date('2026-04-11T12:00:00Z'),
      targetType: 'self',
      question: null,
      result: '{}',
    })
    const ctx = makeCtx({
      prisma: { reading: { findFirst } } as never,
    })
    const result = await masterToolRegistry.execute(
      'show_reading_card',
      { readingId: 'r1' },
      ctx,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const data = result.data as {
        readingId: string
        divinationType: string
        title: string
        subtitle: string
        url: string
      }
      expect(data.readingId).toBe('r1')
      expect(data.divinationType).toBe('bazi')
      expect(data.title).toBe('八字命盤') // zh-TW default
      expect(data.subtitle).toContain('2026年4月11日')
      expect(data.url).toBe('/dashboard?reading=r1')
    }
    // Ownership: query MUST scope by user id
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'r1', userId: 'user_test_1', deletedAt: null }),
      }),
    )
  })

  it('returns NOT_FOUND when the reading does not belong to the user', async () => {
    const ctx = makeCtx({
      prisma: { reading: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
    })
    const result = await masterToolRegistry.execute(
      'show_reading_card',
      { readingId: 'evil' },
      ctx,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_FOUND')
  })

  it('renders English title when ctx.lang is en', async () => {
    const findFirst = makeReadingFindFirst({
      id: 'r2',
      type: 'ziwei',
      createdAt: new Date('2026-04-11T12:00:00Z'),
      targetType: 'self',
      question: null,
      result: '{}',
    })
    const ctx = makeCtx({
      lang: 'en',
      prisma: { reading: { findFirst } } as never,
    })
    const result = await masterToolRegistry.execute(
      'show_reading_card',
      { readingId: 'r2' },
      ctx,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const data = result.data as { title: string }
      expect(data.title).toBe('Zi Wei Reading')
    }
  })

  it('passes through optional note when provided', async () => {
    const findFirst = makeReadingFindFirst({
      id: 'r3',
      type: 'bazi',
      createdAt: new Date('2026-04-11T12:00:00Z'),
      targetType: 'self',
      question: null,
      result: '{}',
    })
    const ctx = makeCtx({
      prisma: { reading: { findFirst } } as never,
    })
    const result = await masterToolRegistry.execute(
      'show_reading_card',
      { readingId: 'r3', note: '你最近一次的八字' },
      ctx,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const data = result.data as { note?: string }
      expect(data.note).toBe('你最近一次的八字')
    }
  })

  it('includes question snippet in subtitle for family-member readings', async () => {
    const findFirst = makeReadingFindFirst({
      id: 'r4',
      type: 'bazi',
      createdAt: new Date('2026-04-11T12:00:00Z'),
      targetType: 'family',
      question: '父亲今年的运势如何',
      result: '{}',
    })
    const ctx = makeCtx({
      prisma: { reading: { findFirst } } as never,
    })
    const result = await masterToolRegistry.execute(
      'show_reading_card',
      { readingId: 'r4' },
      ctx,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const data = result.data as { subtitle: string }
      expect(data.subtitle).toContain('家人')
      expect(data.subtitle).toContain('父亲今年的运势如何')
    }
  })
})
