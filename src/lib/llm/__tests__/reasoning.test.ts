import { describe, it, expect } from 'vitest'
import { buildReasoningParam, extractReasoningText } from '../reasoning'

describe('buildReasoningParam', () => {
  it("emits { reasoning: { effort } } for 'low' | 'medium' | 'high'", () => {
    expect(buildReasoningParam('low')).toEqual({ reasoning: { effort: 'low' } })
    expect(buildReasoningParam('medium')).toEqual({
      reasoning: { effort: 'medium' },
    })
    expect(buildReasoningParam('high')).toEqual({
      reasoning: { effort: 'high' },
    })
  })

  it("returns an empty object for 'off' so spread omits the field", () => {
    const result = buildReasoningParam('off')
    expect(result).toEqual({})
    expect('reasoning' in result).toBe(false)
  })
})

describe('extractReasoningText', () => {
  it('returns reasoning string when present', () => {
    expect(
      extractReasoningText({ content: 'hi', reasoning: 'thinking...' })
    ).toBe('thinking...')
  })

  it('returns undefined when reasoning is missing, empty, or non-string', () => {
    expect(extractReasoningText({ content: 'hi' })).toBeUndefined()
    expect(extractReasoningText({ reasoning: '' })).toBeUndefined()
    expect(extractReasoningText({ reasoning: null })).toBeUndefined()
    expect(extractReasoningText(null)).toBeUndefined()
    expect(extractReasoningText(undefined)).toBeUndefined()
  })
})
