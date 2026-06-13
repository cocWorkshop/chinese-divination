import { describe, it, expect } from 'vitest'
import { BubbleStreamer, splitBubbles, BUBBLE_MARKER } from '../bubbleStream'

interface CapturedEvent {
  type: 'content' | 'break'
  text?: string
}

function captureRun(chunks: string[]): CapturedEvent[] {
  const events: CapturedEvent[] = []
  const s = new BubbleStreamer()
  const onContent = (t: string) => events.push({ type: 'content', text: t })
  const onBreak = () => events.push({ type: 'break' })
  for (const chunk of chunks) s.push(chunk, onContent, onBreak)
  s.flush(onContent)
  return events
}

describe('BubbleStreamer', () => {
  it('emits a single content event when no marker present', () => {
    expect(captureRun(['你今年走的是辛巳大運。'])).toEqual([
      { type: 'content', text: '你今年走的是辛巳大運。' },
    ])
  })

  it('splits on a single marker between bubbles', () => {
    expect(captureRun([`嗯。${BUBBLE_MARKER}你說，我聽著。`])).toEqual([
      { type: 'content', text: '嗯。' },
      { type: 'break' },
      { type: 'content', text: '你說，我聽著。' },
    ])
  })

  it('handles a marker split across two chunks', () => {
    const events = captureRun(['嗯。[NE', 'XT]你說，我聽著。'])
    expect(events).toEqual([
      { type: 'content', text: '嗯。' },
      { type: 'break' },
      { type: 'content', text: '你說，我聽著。' },
    ])
  })

  it('handles marker split character-by-character', () => {
    const chunks = ['你', '好', '[', 'N', 'E', 'X', 'T', ']', '在', '嗎']
    const events = captureRun(chunks)
    // We don't care exactly how content is grouped, only that order + break
    // position are correct.
    const breakIdx = events.findIndex((e) => e.type === 'break')
    expect(breakIdx).toBeGreaterThan(-1)
    const before = events
      .slice(0, breakIdx)
      .map((e) => e.text ?? '')
      .join('')
    const after = events
      .slice(breakIdx + 1)
      .map((e) => e.text ?? '')
      .join('')
    expect(before).toBe('你好')
    expect(after).toBe('在嗎')
  })

  it('emits multiple breaks for chained markers', () => {
    const events = captureRun([`A${BUBBLE_MARKER}B${BUBBLE_MARKER}C`])
    expect(events).toEqual([
      { type: 'content', text: 'A' },
      { type: 'break' },
      { type: 'content', text: 'B' },
      { type: 'break' },
      { type: 'content', text: 'C' },
    ])
  })

  it('does not emit a hanging partial marker as content', () => {
    // After 'A[NE' we should have emitted only 'A' so far (the '[NE' is
    // still buffered as a possible marker prefix).
    const s = new BubbleStreamer()
    const events: CapturedEvent[] = []
    s.push(
      'A[NE',
      (t) => events.push({ type: 'content', text: t }),
      () => events.push({ type: 'break' }),
    )
    expect(events).toEqual([{ type: 'content', text: 'A' }])
  })

  it('flush emits a held tail that turned out NOT to be a marker', () => {
    // Sequence ends with '[NE' that never completes. flush should release it.
    expect(captureRun(['hello [NE'])).toEqual([
      { type: 'content', text: 'hello ' },
      { type: 'content', text: '[NE' },
    ])
  })

  it('treats adjacent markers (no content between) as two breaks', () => {
    expect(captureRun([`${BUBBLE_MARKER}${BUBBLE_MARKER}done`])).toEqual([
      { type: 'break' },
      { type: 'break' },
      { type: 'content', text: 'done' },
    ])
  })
})

describe('splitBubbles', () => {
  it('returns one segment when no marker', () => {
    expect(splitBubbles('hello world')).toEqual(['hello world'])
  })

  it('splits stored multi-bubble content', () => {
    const stored = `嗯。${BUBBLE_MARKER}你說，我聽著。${BUBBLE_MARKER}慢慢說。`
    expect(splitBubbles(stored)).toEqual(['嗯。', '你說，我聽著。', '慢慢說。'])
  })

  it('drops empty segments from leading/trailing markers', () => {
    expect(splitBubbles(`${BUBBLE_MARKER}A${BUBBLE_MARKER}`)).toEqual(['A'])
  })

  it('returns single empty array entry for empty input', () => {
    expect(splitBubbles('')).toEqual([''])
  })
})
