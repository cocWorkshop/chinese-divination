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

  it('repairs array string elements missing their OPENING quote (real qimen failure 2026-06-12)', () => {
    // Condensed from reading cmqa6heeo00049mpkvpeuc3ey: the LLM dropped the
    // opening quote of every element in keyAdvice/suggestedQuestions, which
    // hard-rejected an otherwise complete reading.
    const raw = `{
  "type": "qimen",
  "sections": {
    "situation": "當前陽遁六局芒種時，值符天蓬星落艮宮。"
  },
  "outcome": "中",
  "keyAdvice": [
    開盤後若急漲可視為兌宮假象，宜減倉鎖利，勿追高。",
    關注乾宮西北方位是否出現逆勢機會，但只宜小單試探。"
  ],
  "suggestedQuestions": [
    兌宮三奇得使表面吉，但病星玄武暗藏何種陷阱？",
    值符杜門門迫空亡，大盤策略該如何避實擊虛？"
  ]
}`
    const out = parseJsonFromLLMOutput(raw, 'qimen')
    expect(out[PARSE_FAILED_KEY]).toBeUndefined()
    expect((out.sections as Record<string, string>).situation).toContain('值符天蓬星')
    expect(out.keyAdvice).toEqual([
      '開盤後若急漲可視為兌宮假象，宜減倉鎖利，勿追高。',
      '關注乾宮西北方位是否出現逆勢機會，但只宜小單試探。',
    ])
    expect(out.suggestedQuestions).toHaveLength(2)
  })

  it('repairs trailing commas and single-quoted strings', () => {
    const raw = `{"sections": {'overview': 'hello',}, "outcome": "吉",}`
    const out = parseJsonFromLLMOutput(raw, 'meihua')
    expect(out[PARSE_FAILED_KEY]).toBeUndefined()
    expect((out.sections as Record<string, string>).overview).toBe('hello')
  })

  it('repairs unescaped newlines inside string values', () => {
    const raw = '{"interpretation": "第一行\n第二行", "outcome": "吉"}'
    const out = parseJsonFromLLMOutput(raw, 'liuyao')
    expect(out[PARSE_FAILED_KEY]).toBeUndefined()
    expect(out.interpretation).toContain('第二行')
  })

  it('still rejects pure prose even though jsonrepair would coerce it to a JSON string', () => {
    // jsonrepair('some prose') yields '"some prose"' — a valid JSON *string*.
    // The object-shape guard must reject it so the route hard-rejects instead
    // of saving a garbage reading.
    const out = parseJsonFromLLMOutput('抱歉，我無法生成此次解讀。', 'bazi')
    expect(out[PARSE_FAILED_KEY]).toBe(true)
  })
})
