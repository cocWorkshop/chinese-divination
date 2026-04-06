import { describe, it, expect } from 'vitest'
import { parseJsonFromLLMOutput } from '../_jsonParse'

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

  it('falls back to {raw, sections} on invalid JSON', () => {
    const out = parseJsonFromLLMOutput('not json at all', 'bazi')
    expect(out.type).toBe('bazi')
    expect(out.raw).toBe('not json at all')
    expect((out.sections as { overview: string }).overview).toBe('not json at all')
    expect(out.keyAdvice).toEqual([])
  })

  it('parses fenced JSON with leading prose', () => {
    const raw = 'Certainly! Here is the analysis.\n\n```json\n{"sections": {"overview": "hi"}, "type": "iching"}\n```\n'
    const out = parseJsonFromLLMOutput(raw, 'iching')
    expect(out.type).toBe('iching')
  })
})
