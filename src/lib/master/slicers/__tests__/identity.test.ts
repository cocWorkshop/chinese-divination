import { describe, it, expect } from 'vitest'
import { createIdentitySlicer } from '../_identity'
import { sliceReading } from '../index'

const ichingResult = {
  type: 'iching',
  hexagram: { name: '乾为天', number: 1 },
  sections: {
    overview: '本卦象辞...',
    interpretation: '爻辞解析...',
    advice: '行事建议...',
  },
  keyAdvice: ['静待时机'],
}

describe('createIdentitySlicer', () => {
  it('returns full result (minus overview) in header', () => {
    const slicer = createIdentitySlicer('iching')
    const header = slicer.sliceHeader(ichingResult)
    // Header retains top-level fields
    expect((header as Record<string, unknown>).hexagram).toBeDefined()
    // Sections kept but overview stripped
    const sections = (header as Record<string, unknown>).sections as Record<string, unknown>
    expect(sections.overview).toBeUndefined()
    expect(sections.interpretation).toBeDefined()
  })

  it('getOverview returns the overview string', () => {
    const slicer = createIdentitySlicer('iching')
    expect(slicer.getOverview(ichingResult)).toBe('本卦象辞...')
  })

  it('listSections returns keys under sections except overview', () => {
    const slicer = createIdentitySlicer('iching')
    const keys = slicer.listSections(ichingResult)
    expect(keys).toContain('interpretation')
    expect(keys).toContain('advice')
    expect(keys).not.toContain('overview')
  })

  it('getSection returns string values', () => {
    const slicer = createIdentitySlicer('iching')
    expect(slicer.getSection(ichingResult, 'interpretation')).toBe('爻辞解析...')
    expect(slicer.getSection(ichingResult, 'nonexistent')).toBeNull()
  })
})

describe('sliceReading — identity types dispatch', () => {
  it('handles iching', () => {
    const sliced = sliceReading('iching', 'r1', '2026-04-11', ichingResult)
    expect(sliced.overview).toBe('本卦象辞...')
    expect(sliced.sections).toEqual(['advice', 'interpretation'])
  })

  it('falls back to identity slicer for unknown types', () => {
    const sliced = sliceReading('unknown_type', 'r2', '2026-04-11', { sections: { overview: 'x' } })
    expect(sliced.overview).toBe('x')
  })
})
