import { describe, it, expect } from 'vitest'
import {
  isClosed,
  findLatestPendingCTA,
  type DetectableMsg,
} from '../activationDetect'

const ts = (offsetMin = 0): string =>
  new Date(Date.now() + offsetMin * 60_000).toISOString()

const userMsg = (content: string, offsetMin = 0): DetectableMsg => ({
  role: 'user',
  content,
  timestamp: ts(offsetMin),
  kind: 'text',
})

const assistantMsg = (content: string, offsetMin = 0): DetectableMsg => ({
  role: 'assistant',
  content,
  timestamp: ts(offsetMin),
  kind: 'text',
})

const ctaMsg = (
  type: string,
  target: string | undefined,
  offsetMin = 0,
): DetectableMsg => ({
  role: 'assistant',
  content: '',
  timestamp: ts(offsetMin),
  kind: 'cta_card',
  ctaPayload: {
    divinationType: type,
    ctaContext: target ? { target } : undefined,
  },
})

const readingCardMsg = (offsetMin = 0): DetectableMsg => ({
  role: 'assistant',
  content: '',
  timestamp: ts(offsetMin),
  kind: 'reading_card',
})

describe('isClosed — zh-TW', () => {
  it('returns true when master closes with 保重 and user just thanked', () => {
    const msgs = [
      userMsg('好的，謝謝大師', -2),
      assistantMsg('好。多保重，有事再來找我。', -1),
    ]
    expect(isClosed(msgs, 'zh-TW')).toBe(true)
  })

  it('returns true when master says 祝您 and user said 謝謝', () => {
    const msgs = [
      userMsg('謝謝', -2),
      assistantMsg('祝您一切順利。', -1),
    ]
    expect(isClosed(msgs, 'zh-TW')).toBe(true)
  })

  it('returns false when master closer but user is mid-question', () => {
    const msgs = [
      userMsg('那我下個月適合搬家嗎？', -3),
      assistantMsg('適合。記得保重身體。', -2),
    ]
    expect(isClosed(msgs, 'zh-TW')).toBe(false)
  })

  it('returns false when master never sent a closing phrase', () => {
    const msgs = [
      userMsg('好', -2),
      assistantMsg('您命局裡的水偏旺，這幾年要注意...', -1),
    ]
    expect(isClosed(msgs, 'zh-TW')).toBe(false)
  })

  it('returns false on an empty transcript', () => {
    expect(isClosed([], 'zh-TW')).toBe(false)
  })
})

describe('isClosed — en', () => {
  it('returns true when master says take care and user says thanks', () => {
    const msgs = [
      userMsg('Thanks!', -2),
      assistantMsg('Take care.', -1),
    ]
    expect(isClosed(msgs, 'en')).toBe(true)
  })

  it('returns true with bye exchange', () => {
    const msgs = [
      userMsg('Bye', -2),
      assistantMsg('See you. Good luck.', -1),
    ]
    expect(isClosed(msgs, 'en')).toBe(true)
  })

  it('returns false when assistant ended on an open question', () => {
    const msgs = [
      userMsg('Got it', -2),
      assistantMsg('What about your career — want me to look at the 官祿宮?', -1),
    ]
    expect(isClosed(msgs, 'en')).toBe(false)
  })

  it('returns false when user is asking another question even if master mentioned bye', () => {
    const msgs = [
      userMsg('One more thing — should I move?', -2),
      assistantMsg('You should. Bye for now is too early — let me check the 大運.', -1),
    ]
    expect(isClosed(msgs, 'en')).toBe(false)
  })
})

describe('findLatestPendingCTA', () => {
  it('returns null on empty transcript', () => {
    expect(findLatestPendingCTA([])).toBeNull()
  })

  it('returns null when no CTA exists', () => {
    const msgs = [userMsg('hi', -5), assistantMsg('hello', -4)]
    expect(findLatestPendingCTA(msgs)).toBeNull()
  })

  it('returns the latest CTA when there is one un-fulfilled', () => {
    const msgs: DetectableMsg[] = [
      userMsg('幫我排個八字', -10),
      ctaMsg('bazi', '為自己', -9),
      userMsg('好，我去填', -8),
    ]
    const found = findLatestPendingCTA(msgs)
    expect(found).not.toBeNull()
    expect(found?.type).toBe('bazi')
    expect(found?.target).toBe('self')
  })

  it('infers family target when ctaContext.target is a person name', () => {
    const msgs: DetectableMsg[] = [
      ctaMsg('bazi', '為配偶 張三', -5),
    ]
    expect(findLatestPendingCTA(msgs)?.target).toBe('family')
  })

  it('infers self when ctaContext is missing', () => {
    const msgs: DetectableMsg[] = [ctaMsg('ziwei', undefined, -5)]
    expect(findLatestPendingCTA(msgs)?.target).toBe('self')
  })

  it('returns the most recent CTA when multiple un-fulfilled exist', () => {
    const msgs: DetectableMsg[] = [
      ctaMsg('bazi', '為自己', -10),
      userMsg('好', -9),
      ctaMsg('ziwei', '為自己', -5),
    ]
    expect(findLatestPendingCTA(msgs)?.type).toBe('ziwei')
  })

  it('returns null when a reading_card supersedes the latest CTA', () => {
    const msgs: DetectableMsg[] = [
      ctaMsg('bazi', '為自己', -10),
      readingCardMsg(-5),
    ]
    expect(findLatestPendingCTA(msgs)).toBeNull()
  })

  it('returns null when assistant has already followed up after the CTA (prevents repeated nagging)', () => {
    const msgs: DetectableMsg[] = [
      userMsg('想看八字', -15),
      ctaMsg('bazi', '為自己', -10),
      assistantMsg('上次為您推薦的八字排盤，您還想做嗎？', -5),
    ]
    // Assistant already asked once; subsequent chat opens must NOT keep nagging
    expect(findLatestPendingCTA(msgs)).toBeNull()
  })
})
