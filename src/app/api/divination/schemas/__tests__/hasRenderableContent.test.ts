import { describe, it, expect } from 'vitest'
import { hasRenderableContent } from '../_validate'

describe('hasRenderableContent (route hard-reject #2 gate)', () => {
  it('rejects empty object', () => {
    expect(hasRenderableContent({})).toBe(false)
  })

  it('rejects empty sections object', () => {
    expect(hasRenderableContent({ sections: {} })).toBe(false)
  })

  it('rejects sections whose values are all empty/whitespace strings', () => {
    // Regression: the old key-count check passed this, saving (and charging
    // for) a blank reading.
    expect(hasRenderableContent({ sections: { overview: '' } })).toBe(false)
    expect(hasRenderableContent({ sections: { overview: '   ', career: '\n' } })).toBe(false)
  })

  it('rejects empty interpretation string', () => {
    expect(hasRenderableContent({ interpretation: '' })).toBe(false)
    expect(hasRenderableContent({ interpretation: '  ' })).toBe(false)
  })

  it('rejects metadata-only output', () => {
    expect(hasRenderableContent({ type: 'qimen', outcome: '吉', sections: {} })).toBe(false)
  })

  it('accepts one content-bearing section among empty ones (partial/truncated reading)', () => {
    expect(hasRenderableContent({ sections: { overview: '', situation: '值符天蓬星落艮宫' } })).toBe(true)
  })

  it('accepts a non-empty interpretation string', () => {
    expect(hasRenderableContent({ interpretation: '此卦大吉' })).toBe(true)
  })

  it('accepts object-valued sections with content, rejects empty object sections', () => {
    expect(hasRenderableContent({ sections: { detail: { text: 'x' } } })).toBe(true)
    expect(hasRenderableContent({ sections: { detail: {} } })).toBe(false)
  })

  it('accepts object-shaped interpretation with content', () => {
    expect(hasRenderableContent({ interpretation: { overall: '吉' } })).toBe(true)
  })

  it('ignores array-shaped sections (not a valid sections shape)', () => {
    expect(hasRenderableContent({ sections: ['text'] })).toBe(false)
  })
})
