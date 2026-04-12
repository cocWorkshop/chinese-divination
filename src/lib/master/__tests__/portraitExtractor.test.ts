import { describe, it, expect } from 'vitest'
import { parseExtractorOutput, EXTRACTION_TURN_THRESHOLD } from '../portraitExtractor'

describe('parseExtractorOutput', () => {
  it('parses a clean JSON response', () => {
    const raw = JSON.stringify({
      topics: ['career', 'family'],
      preferences: { tone: 'direct', depth: 'concise', language: 'zh-TW' },
      lifeContext: '中年男性，已婚有一子',
      toneNotes: '偏好务实分析',
    })
    const result = parseExtractorOutput(raw)
    expect(result).not.toBeNull()
    expect(result?.topics).toEqual(['career', 'family'])
    expect(result?.preferences.tone).toBe('direct')
    expect(result?.preferences.depth).toBe('concise')
    expect(result?.preferences.language).toBe('zh-TW')
    expect(result?.lifeContext).toBe('中年男性，已婚有一子')
    expect(result?.toneNotes).toBe('偏好务实分析')
  })

  it('strips markdown code fences', () => {
    const raw = '```json\n{"topics":["career"],"preferences":{}}\n```'
    const result = parseExtractorOutput(raw)
    expect(result?.topics).toEqual(['career'])
  })

  it('finds JSON object embedded in prose', () => {
    const raw = 'Here is the updated portrait:\n{"topics":["health"],"preferences":{}}\nHope that helps.'
    const result = parseExtractorOutput(raw)
    expect(result?.topics).toEqual(['health'])
  })

  it('returns null for invalid JSON with no recoverable object', () => {
    expect(parseExtractorOutput('not json at all')).toBeNull()
    expect(parseExtractorOutput('')).toBeNull()
  })

  it('drops invalid preference values', () => {
    const raw = JSON.stringify({
      topics: ['career'],
      preferences: { tone: 'aggressive', depth: 'verbose', language: 'fr' },
    })
    const result = parseExtractorOutput(raw)
    expect(result).not.toBeNull()
    expect(result?.preferences.tone).toBeUndefined()
    expect(result?.preferences.depth).toBeUndefined()
    expect(result?.preferences.language).toBeUndefined()
  })

  it('caps topics at 12', () => {
    const raw = JSON.stringify({
      topics: Array.from({ length: 50 }, (_, i) => `topic${i}`),
      preferences: {},
    })
    const result = parseExtractorOutput(raw)
    expect(result?.topics.length).toBe(12)
  })

  it('filters non-string topic entries', () => {
    const raw = JSON.stringify({
      topics: ['career', 123, null, 'family', { foo: 'bar' }],
      preferences: {},
    })
    const result = parseExtractorOutput(raw)
    expect(result?.topics).toEqual(['career', 'family'])
  })

  it('truncates long lifeContext to 600 chars', () => {
    const longText = 'a'.repeat(1000)
    const raw = JSON.stringify({
      topics: [],
      preferences: {},
      lifeContext: longText,
    })
    const result = parseExtractorOutput(raw)
    expect(result?.lifeContext?.length).toBe(600)
  })

  it('handles missing fields gracefully', () => {
    const raw = JSON.stringify({})
    const result = parseExtractorOutput(raw)
    expect(result).not.toBeNull()
    expect(result?.topics).toEqual([])
    expect(result?.preferences).toEqual({})
    expect(result?.lifeContext).toBeNull()
    expect(result?.toneNotes).toBeNull()
  })
})

describe('extraction tunable constants', () => {
  it('EXTRACTION_TURN_THRESHOLD is in a sensible range', () => {
    expect(EXTRACTION_TURN_THRESHOLD).toBeGreaterThanOrEqual(3)
    expect(EXTRACTION_TURN_THRESHOLD).toBeLessThanOrEqual(30)
  })
})
