import { describe, it, expect } from 'vitest'
import { ziweiSlicer } from '../ziwei'
import { sliceReading } from '../index'

const fullZiweiResult = {
  type: 'ziwei',
  version: 2,
  ziweiChart: {
    fiveElementsClass: '木三局',
    zodiac: '龙',
    soul: '文昌',
    body: '天相',
    yearStem: '甲',
    yearBranch: '子',
  },
  mainStars: [{ name: '紫微', palace: '命宫', element: '土' }],
  formation: { name: '紫微守命', level: '上格', analysis: '命主尊贵...' },
  palaces: {
    '命宫': { stars: ['紫微', '天相'], analysis: '命宫分析文本...'.padEnd(150, '。') },
    '财帛': { stars: ['武曲'], analysis: '财帛分析...'.padEnd(100, '。') },
    '官禄': { stars: ['太阳'], analysis: '官禄分析...'.padEnd(100, '。') },
    '夫妻': { stars: ['天府'], analysis: '夫妻分析...'.padEnd(100, '。') },
    '兄弟': { stars: [], analysis: '' },
    '子女': { stars: [], analysis: '' },
    '疾厄': { stars: [], analysis: '' },
    '迁移': { stars: [], analysis: '' },
    '仆役': { stars: [], analysis: '' },
    '田宅': { stars: [], analysis: '' },
    '福德': { stars: [], analysis: '' },
    '父母': { stars: [], analysis: '' },
  },
  sections: {
    overview: '命盘总论文本...'.padEnd(200, '。'),
    personality: '性格分析...'.padEnd(100, '。'),
    career: '事业分析...'.padEnd(150, '。'),
    marriage: '婚姻分析...'.padEnd(150, '。'),
    wealth: '财运分析...'.padEnd(150, '。'),
    health: '健康分析...'.padEnd(100, '。'),
    family: '六亲分析...'.padEnd(100, '。'),
  },
  daYunAnalysis: [
    { ageRange: '6-15', heavenlyStem: '甲', earthlyBranch: '子', theme: '启蒙', siHuaOverlay: '', keyEvents: [], advice: '' },
  ],
  keyPredictions: [
    { age: '28-30', event: '事业转折', basis: '官禄宫化禄' },
  ],
  keyAdvice: ['保持谦逊'],
  luckyInfo: { colors: ['黄色'], directions: ['中宫'] },
}

describe('ziweiSlicer.sliceHeader', () => {
  it('returns chart metadata + formation + preview of all palaces', () => {
    const header = ziweiSlicer.sliceHeader(fullZiweiResult)
    expect(header.chart).toMatchObject({ fiveElementsClass: '木三局', zodiac: '龙', soul: '文昌' })
    expect(header.formation).toMatchObject({ name: '紫微守命', level: '上格' })
    // Preview should have all 12 palaces but without analysis
    expect(header.palacesPreview).toBeDefined()
    const preview = header.palacesPreview as Record<string, Record<string, unknown>>
    expect(preview['命宫'].stars).toEqual(['紫微', '天相'])
    // The preview does NOT include analysis text
    expect(preview['命宫'].analysis).toBeUndefined()
  })

  it('returns 命宫 full object in mingGong', () => {
    const header = ziweiSlicer.sliceHeader(fullZiweiResult)
    const ming = header.mingGong as Record<string, unknown>
    expect(ming.stars).toEqual(['紫微', '天相'])
    expect(typeof ming.analysis).toBe('string')
  })
})

describe('ziweiSlicer.listSections', () => {
  it('returns all V2 section keys + chart chunks', () => {
    const keys = ziweiSlicer.listSections(fullZiweiResult)
    expect(keys).toContain('personality')
    expect(keys).toContain('career')
    expect(keys).toContain('marriage')
    expect(keys).toContain('wealth')
    expect(keys).toContain('health')
    expect(keys).toContain('family')
    expect(keys).toContain('palaces')
    expect(keys).toContain('daYunAnalysis')
    expect(keys).toContain('keyPredictions')
  })
})

describe('ziweiSlicer.getSection', () => {
  it('returns palaces as full object', () => {
    const s = ziweiSlicer.getSection(fullZiweiResult, 'palaces') as Record<string, unknown>
    expect(s).toBeDefined()
    expect(s['命宫']).toBeDefined()
  })
  it('returns keyPredictions as array', () => {
    const s = ziweiSlicer.getSection(fullZiweiResult, 'keyPredictions') as unknown[]
    expect(Array.isArray(s)).toBe(true)
    expect(s[0]).toMatchObject({ age: '28-30' })
  })
  it('returns null for unknown section', () => {
    expect(ziweiSlicer.getSection(fullZiweiResult, 'bogus')).toBeNull()
  })
})

describe('sliceReading — ziwei integration', () => {
  it('extracts overview and lists sections', () => {
    const sliced = sliceReading(
      'ziwei',
      'rid_zw',
      '2026-04-11T00:00:00Z',
      fullZiweiResult,
    )
    expect(sliced.type).toBe('ziwei')
    expect(sliced.overview).toMatch(/命盘总论/)
    expect(sliced.sections).toContain('career')
    expect(sliced.sections).toContain('palaces')
    expect(sliced.isPaipanOnly).toBe(false)
  })
})
