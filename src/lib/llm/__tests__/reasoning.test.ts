import { describe, it, expect } from 'vitest'
import { buildReasoningParam, extractReasoningText } from '../reasoning'

describe('buildReasoningParam', () => {
  it("emits { reasoning: { effort } } without maxTokens", () => {
    expect(buildReasoningParam('low')).toEqual({ reasoning: { effort: 'low' } })
    expect(buildReasoningParam('medium')).toEqual({
      reasoning: { effort: 'medium' },
    })
    expect(buildReasoningParam('high')).toEqual({
      reasoning: { effort: 'high' },
    })
  })

  it("uses max_tokens (without effort) when maxTokens is provided", () => {
    // OpenRouter doesn't allow both effort + max_tokens
    expect(buildReasoningParam('low', 20000)).toEqual({
      reasoning: { max_tokens: 4000 },
    })
    expect(buildReasoningParam('medium', 20000)).toEqual({
      reasoning: { max_tokens: 8000 },
    })
    expect(buildReasoningParam('high', 20000)).toEqual({
      reasoning: { max_tokens: 12000 },
    })
  })

  it("clamps reasoning max_tokens to at least 1024", () => {
    expect(buildReasoningParam('low', 2000)).toEqual({
      reasoning: { max_tokens: 1024 },
    })
  })

  it("returns an empty object for 'off' so spread omits the field", () => {
    const result = buildReasoningParam('off')
    expect(result).toEqual({})
    expect('reasoning' in result).toBe(false)
  })

  it("returns empty for 'off' even when maxTokens is given", () => {
    const result = buildReasoningParam('off', 20000)
    expect(result).toEqual({})
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
