import { describe, it, expect } from 'vitest'
import { parseJsonFromLLMOutput, PARSE_FAILED_KEY } from '../_jsonParse'

describe('parseJsonFromLLMOutput', () => {
  it('parses plain JSON', () => {
    const out = parseJsonFromLLMOutput('{"foo": 1, "bar": "baz"}', 'bazi')
    expect(out.foo).toBe(1)
    expect(out.bar).toBe('baz')
  })

  it('strips ```json fences', () => {
    const raw = '```json\n{"a": 1}\n```'
    const out = parseJsonFromLLMOutput(raw, 'bazi')
    expect(out.a).toBe(1)
  })

  it('strips bare ``` fences', () => {
    const raw = '```\n{"a": 2}\n```'
    const out = parseJsonFromLLMOutput(raw, 'bazi')
    expect(out.a).toBe(2)
  })

  it('strips leading prose before the first brace', () => {
    const raw = 'Here is your reading:\n\n{"sections": {"overview": "..."}}'
    const out = parseJsonFromLLMOutput(raw, 'bazi')
    expect(out.sections).toBeDefined()
  })

  it('strips trailing prose after the last brace', () => {
    const raw = '{"a": 1}\n\nHope this helps!'
    const out = parseJsonFromLLMOutput(raw, 'bazi')
    expect(out.a).toBe(1)
  })

  it('marks unparseable input with PARSE_FAILED_KEY and does NOT inject raw text into sections', () => {
    // Regression: previously the fallback shoved rawText into
    // `sections.overview`, which fooled the route's hard-reject check
    // and let raw JSON-shaped LLM output land on the result page.
    const out = parseJsonFromLLMOutput('not json at all', 'bazi')
    expect(out[PARSE_FAILED_KEY]).toBe(true)
    expect(out.type).toBe('bazi')
    expect(out.rawText).toBe('not json at all')
    // The crucial guarantee: nothing renderable is fabricated.
    expect(out.sections).toBeUndefined()
    expect(out.interpretation).toBeUndefined()
  })

  it('parses fenced JSON with leading prose', () => {
    const raw = 'Certainly! Here is the analysis.\n\n```json\n{"sections": {"overview": "hi"}, "type": "iching"}\n```\n'
    const out = parseJsonFromLLMOutput(raw, 'iching')
    expect(out.type).toBe('iching')
  })
})
