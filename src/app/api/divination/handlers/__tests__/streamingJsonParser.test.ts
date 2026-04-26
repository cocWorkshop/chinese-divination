import { describe, it, expect } from 'vitest'
import { StreamingJsonParser, type ParserEvent } from '../_streamingJsonParser'

function captureRun(chunks: string[]): ParserEvent[] {
  const events: ParserEvent[] = []
  const p = new StreamingJsonParser()
  for (const c of chunks) p.push(c, (e) => events.push(e))
  p.end((e) => events.push(e))
  return events
}

function setAtPath(
  root: Record<string, unknown>,
  path: (string | number)[],
  value: unknown,
): void {
  let cur = root as Record<string | number, unknown>
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    const next = path[i + 1]
    const wantArray = typeof next === 'number'
    const existing = cur[key]
    if (existing === undefined) {
      const fresh = wantArray ? [] : {}
      cur[key] = fresh
      cur = fresh as Record<string | number, unknown>
    } else {
      cur = existing as Record<string | number, unknown>
    }
  }
  cur[path[path.length - 1]] = value
}

function reconstruct(events: ParserEvent[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const e of events) {
    if (e.type !== 'value_done') continue
    setAtPath(out, e.path, e.value)
  }
  return out
}

describe('StreamingJsonParser — basics', () => {
  it('parses a flat object', () => {
    const events = captureRun(['{"a":"hello","b":42}'])
    const obj = reconstruct(events)
    expect(obj).toEqual({ a: 'hello', b: 42 })
    expect(events.some((e) => e.type === 'done')).toBe(true)
  })

  it('emits value_chunk events char-by-char during a string value', () => {
    const events = captureRun(['{"x":"hi"}'])
    const chunks = events.filter((e) => e.type === 'value_chunk')
    const concat = chunks
      .map((c) => (c.type === 'value_chunk' ? c.text : ''))
      .join('')
    expect(concat).toBe('hi')
    for (const c of chunks) {
      if (c.type === 'value_chunk') {
        expect(JSON.stringify(c.path)).toBe('["x"]')
      }
    }
  })

  it('survives chunks that split a key in half', () => {
    const events = captureRun(['{"foo', 'bar":"value"}'])
    expect(reconstruct(events)).toEqual({ foobar: 'value' })
  })

  it('survives chunks that split a string value in half', () => {
    const events = captureRun(['{"x":"hel', 'lo"}'])
    const chunks = events
      .filter((e) => e.type === 'value_chunk')
      .map((c) => (c.type === 'value_chunk' ? c.text : ''))
    expect(chunks.join('')).toBe('hello')
  })

  it('handles escape sequences', () => {
    const events = captureRun(['{"x":"hello\\nworld\\t!"}'])
    const done = events.find((e) => e.type === 'value_done')
    expect(done && done.type === 'value_done' ? done.value : null).toBe('hello\nworld\t!')
  })

  it('handles escaped quote inside string', () => {
    const events = captureRun(['{"x":"say \\"hi\\""}'])
    const done = events.find((e) => e.type === 'value_done')
    expect(done && done.type === 'value_done' ? done.value : null).toBe('say "hi"')
  })
})

describe('StreamingJsonParser — nested + arrays', () => {
  it('emits correct paths for nested objects', () => {
    const events = captureRun(['{"a":{"b":"deep"}}'])
    const done = events.find(
      (e) => e.type === 'value_done' && e.value === 'deep',
    )
    expect(done && done.type === 'value_done' ? done.path : null).toEqual([
      'a',
      'b',
    ])
  })

  it('emits correct paths for arrays of strings', () => {
    const events = captureRun(['{"items":["one","two","three"]}'])
    const dones: { path: (string | number)[]; value: unknown }[] = []
    for (const e of events) {
      if (e.type === 'value_done') dones.push({ path: e.path, value: e.value })
    }
    expect(dones).toEqual([
      { path: ['items', 0], value: 'one' },
      { path: ['items', 1], value: 'two' },
      { path: ['items', 2], value: 'three' },
    ])
  })

  it('emits correct paths for arrays of objects', () => {
    const events = captureRun(['{"daYun":[{"theme":"A"},{"theme":"B"}]}'])
    const dones: { path: (string | number)[]; value: unknown }[] = []
    for (const e of events) {
      if (e.type === 'value_done') dones.push({ path: e.path, value: e.value })
    }
    expect(dones).toContainEqual({ path: ['daYun', 0, 'theme'], value: 'A' })
    expect(dones).toContainEqual({ path: ['daYun', 1, 'theme'], value: 'B' })
  })

  it('reconstructs a complex bazi-shaped document', () => {
    const json = JSON.stringify({
      type: 'bazi',
      version: 2,
      formation: { name: '七殺格', analysis: '月柱七殺當令' },
      sections: { overview: '你日主戊土', career: '事業上...' },
      daYunAnalysis: [
        { stem: '庚', branch: '寅', theme: '早年', keyYears: [{ year: 2009 }] },
      ],
      keyAdvice: ['條一', '條二'],
    })
    const events = captureRun([json])
    expect(reconstruct(events)).toEqual(JSON.parse(json))
  })
})

describe('StreamingJsonParser — robustness', () => {
  it('skips leading prose/code-fence garbage before the JSON starts', () => {
    const events = captureRun(['Sure! ```json\n{"a":1}\n```'])
    expect(reconstruct(events)).toEqual({ a: 1 })
  })

  it('ignores trailing prose after the closing brace', () => {
    const events = captureRun(['{"a":1}\n\nThanks!'])
    expect(reconstruct(events)).toEqual({ a: 1 })
  })

  it('emits done exactly once when stream is well-formed', () => {
    const events = captureRun(['{"a":1}'])
    const dones = events.filter((e) => e.type === 'done')
    expect(dones).toHaveLength(1)
  })

  it('emits a chunk-by-chunk path-tagged stream for sections', () => {
    const json = '{"sections":{"overview":"abc","career":"xyz"}}'
    const tokens: string[] = []
    for (let i = 0; i < json.length; i += 2) tokens.push(json.slice(i, i + 2))

    const events: ParserEvent[] = []
    const p = new StreamingJsonParser()
    for (const t of tokens) p.push(t, (e) => events.push(e))
    p.end((e) => events.push(e))

    const byPath = new Map<string, string>()
    for (const e of events) {
      if (e.type !== 'value_chunk') continue
      const k = JSON.stringify(e.path)
      byPath.set(k, (byPath.get(k) ?? '') + e.text)
    }
    expect(byPath.get('["sections","overview"]')).toBe('abc')
    expect(byPath.get('["sections","career"]')).toBe('xyz')
  })

  it('reports truncated input via error event', () => {
    const events = captureRun(['{"a":"unfini'])
    expect(events.some((e) => e.type === 'error')).toBe(true)
  })

  it('numbers, booleans, and null parse correctly', () => {
    const events = captureRun(['{"n":12,"f":1.5,"e":-3e2,"t":true,"x":false,"y":null}'])
    expect(reconstruct(events)).toEqual({
      n: 12,
      f: 1.5,
      e: -300,
      t: true,
      x: false,
      y: null,
    })
  })
})
