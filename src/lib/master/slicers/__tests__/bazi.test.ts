import { describe, it, expect } from 'vitest'
import { baziSlicer } from '../bazi'
import { sliceReading, getReadingSection } from '../index'

const fullBaziResult = {
  type: 'bazi',
  version: 2,
  pillars: {
    year: { stem: '甲', branch: '子', element: '木', nayin: '海中金', shenSha: [{ name: '天乙贵人', description: '...' }] },
    month: { stem: '丙', branch: '寅', element: '火', nayin: '炉中火' },
    day: { stem: '戊', branch: '午', element: '土', nayin: '天上火' },
    hour: { stem: '庚', branch: '申', element: '金', nayin: '石榴木' },
  },
  dayMaster: { stem: '戊', element: '土', yinYang: '阳', strength: 'strong', strengthLabel: '身强' },
  fiveElements: { metal: 2, wood: 1, water: 1, fire: 2, earth: 2 },
  luckyElements: ['金', '水'],
  avoidElements: ['火', '土'],
  formation: { name: '正官格', analysis: '日主戊土生于寅月，木旺当令...' },
  seasonalNote: '春月土虚，需火暖土',
  sections: {
    overview: '命主性格刚强，早年辛劳...'.padEnd(200, '。'),
    career: '事业运势分析...'.padEnd(150, '。'),
    marriage: '婚姻运势分析...'.padEnd(150, '。'),
    wealth: '财运分析...'.padEnd(150, '。'),
    health: '健康分析...'.padEnd(100, '。'),
  },
  daYunAnalysis: [
    { stem: '丁', branch: '卯', startAge: 5, endAge: 14, startYear: 1990, endYear: 1999, theme: '童年', interactions: '印生身', keyYears: [], advice: '读书为主' },
    { stem: '戊', branch: '辰', startAge: 15, endAge: 24, startYear: 2000, endYear: 2009, theme: '青年', interactions: '比肩', keyYears: [], advice: '稳扎稳打' },
  ],
  daYun: [
    { stem: '丁', branch: '卯', startAge: 5, startYear: 1990 },
    { stem: '戊', branch: '辰', startAge: 15, startYear: 2000 },
  ],
  liuNian: [
    { stem: '甲', branch: '辰', year: 2024, age: 40, tenGod: '七杀', isLucky: false },
  ],
  branchAnalysis: '年月寅木生日支午火，地支流通有情。',
  branchRelationships: {
    clashes: [{ pillars: ['日', '年'], branches: ['午', '子'] }],
    combines: [],
    harms: [],
    punishments: [],
  },
  keyAdvice: ['保持健康', '注意婚姻'],
  luckyInfo: { colors: ['白色', '黑色'], directions: ['西', '北'] },
  trueSolarTime: { originalTime: '14:00', correctedTime: '13:42', correctionMinutes: -18, longitude: 116.4, shichen: '未', shichenChanged: false },
}

describe('baziSlicer.sliceHeader', () => {
  it('returns pillars, dayMaster, fiveElements, formation in header', () => {
    const header = baziSlicer.sliceHeader(fullBaziResult)
    expect(header.pillars).toMatchObject({
      year: { stem: '甲', branch: '子', element: '木', nayin: '海中金' },
      day: { stem: '戊', branch: '午' },
    })
    expect(header.dayMaster).toMatchObject({ stem: '戊', strengthLabel: '身强' })
    expect(header.fiveElements).toEqual({ metal: 2, wood: 1, water: 1, fire: 2, earth: 2 })
    expect(header.formation).toMatchObject({ name: '正官格' })
    expect(header.seasonalNote).toBe('春月土虚，需火暖土')
  })

  it('does NOT leak daYun/liuNian/branchRelationships into header', () => {
    const header = baziSlicer.sliceHeader(fullBaziResult)
    expect(header.daYun).toBeUndefined()
    expect(header.liuNian).toBeUndefined()
    expect(header.branchRelationships).toBeUndefined()
    expect(header.daYunAnalysis).toBeUndefined()
  })

  it('does not strip shenSha inside pillar entries from the pillar itself — shenSha is a separate section', () => {
    // shenSha lives under pillars.year.shenSha but is fetched as a separate section.
    // The compact pillar in header intentionally omits shenSha to keep it small.
    const header = baziSlicer.sliceHeader(fullBaziResult)
    const year = header.pillars && (header.pillars as Record<string, unknown>).year
    expect(year).toBeDefined()
    expect((year as Record<string, unknown>).shenSha).toBeUndefined()
  })

  it('handles paipan-only (minimal) results without crashing', () => {
    const header = baziSlicer.sliceHeader({ paipanOnly: true, type: 'bazi' })
    expect(header).toBeDefined()
    expect(header.pillars).toBeNull()
    expect(header.dayMaster).toBeNull()
  })
})

describe('baziSlicer.listSections', () => {
  it('returns deterministic keys for a full result', () => {
    const keys = baziSlicer.listSections(fullBaziResult)
    expect(keys).toContain('career')
    expect(keys).toContain('marriage')
    expect(keys).toContain('wealth')
    expect(keys).toContain('health')
    expect(keys).toContain('daYunAnalysis')
    expect(keys).toContain('daYun')
    expect(keys).toContain('liuNian')
    expect(keys).toContain('branchAnalysis')
    expect(keys).toContain('branchRelationships')
    expect(keys).toContain('shenSha')
  })

  it('omits personality when sections.personality is absent (bazi V2 does not have it)', () => {
    const keys = baziSlicer.listSections(fullBaziResult)
    expect(keys).not.toContain('personality')
  })

  it('returns empty keys list for paipan-only minimal result', () => {
    expect(baziSlicer.listSections({ paipanOnly: true, type: 'bazi' })).toEqual([])
  })
})

describe('baziSlicer.getSection', () => {
  it('returns career as string', () => {
    expect(typeof baziSlicer.getSection(fullBaziResult, 'career')).toBe('string')
  })
  it('returns daYunAnalysis as array', () => {
    const s = baziSlicer.getSection(fullBaziResult, 'daYunAnalysis')
    expect(Array.isArray(s)).toBe(true)
  })
  it('returns shenSha collected from pillars', () => {
    const s = baziSlicer.getSection(fullBaziResult, 'shenSha') as unknown[]
    expect(Array.isArray(s)).toBe(true)
    expect(s.length).toBeGreaterThan(0)
    expect(s[0]).toMatchObject({ pillar: 'year', name: '天乙贵人' })
  })
  it('returns null for unknown section', () => {
    expect(baziSlicer.getSection(fullBaziResult, 'nonexistent')).toBeNull()
  })
})

describe('sliceReading — bazi integration', () => {
  it('parses string result and slices it', () => {
    const sliced = sliceReading(
      'bazi',
      'rid_123',
      '2026-04-11T00:00:00Z',
      JSON.stringify(fullBaziResult),
    )
    expect(sliced.id).toBe('rid_123')
    expect(sliced.type).toBe('bazi')
    expect(sliced.isPaipanOnly).toBe(false)
    expect(sliced.overview).toMatch(/命主性格/)
    expect(sliced.sections.length).toBeGreaterThan(5)
  })

  it('detects paipan-only flag; chart-derived sections remain listable', () => {
    // Paipan-only still has chart data (pillars), so shenSha is legitimately
    // enumerable from the pillar-level data. LLM narrative sections are absent.
    const sliced = sliceReading(
      'bazi',
      'rid_456',
      '2026-04-11T00:00:00Z',
      { paipanOnly: true, type: 'bazi', pillars: fullBaziResult.pillars },
    )
    expect(sliced.isPaipanOnly).toBe(true)
    expect(sliced.sections).not.toContain('career')
    expect(sliced.sections).not.toContain('marriage')
    expect(sliced.overview).toBeNull()
  })

  it('returns empty envelope for null / malformed result without throwing', () => {
    const sliced1 = sliceReading('bazi', 'x', 'y', null)
    expect(sliced1.header).toEqual({})
    expect(sliced1.sections).toEqual([])

    const sliced2 = sliceReading('bazi', 'x', 'y', 'not json at all')
    expect(sliced2.header).toEqual({})
  })
})

describe('getReadingSection — bazi', () => {
  it('extracts a single section from a string result', () => {
    const s = getReadingSection('bazi', JSON.stringify(fullBaziResult), 'career')
    expect(typeof s).toBe('string')
  })
  it('returns null for unknown section', () => {
    expect(getReadingSection('bazi', JSON.stringify(fullBaziResult), 'bogus')).toBeNull()
  })
})
