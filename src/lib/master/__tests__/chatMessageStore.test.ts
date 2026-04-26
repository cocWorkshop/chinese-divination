import { describe, it, expect } from 'vitest'
import { estimateTokens, isSessionStale } from '../chatMessageStore'

/**
 * Pure-function tests for chatMessageStore. The DB-touching functions
 * (appendMasterChatMessage, nextTurnIndex, etc.) are exercised through
 * the route integration tests in Phase 3+ when reads switch over.
 */

describe('estimateTokens', () => {
  it('returns 0 for null/undefined/empty', () => {
    expect(estimateTokens(null)).toBe(0)
    expect(estimateTokens(undefined)).toBe(0)
    expect(estimateTokens('')).toBe(0)
  })

  it('returns ceil(chars/4) for short text', () => {
    expect(estimateTokens('hi')).toBe(1) // 2 chars / 4 = 0.5 → ceil 1
    expect(estimateTokens('test')).toBe(1) // 4 / 4 = 1
    expect(estimateTokens('hello')).toBe(2) // 5 / 4 = 1.25 → 2
  })

  it('returns ceil(chars/4) for longer text', () => {
    const text = 'a'.repeat(400)
    expect(estimateTokens(text)).toBe(100)
  })

  it('handles unicode (CJK) characters by char count not byte count', () => {
    // Chinese chars are 1 char in JS string length, even though they're
    // multiple bytes in UTF-8. The estimate is char-based.
    expect(estimateTokens('你好')).toBe(1) // 2 chars → 1
    expect(estimateTokens('你好世界')).toBe(1) // 4 chars → 1
    expect(estimateTokens('一二三四五六七八九十')).toBe(3) // 10 chars / 4 = 2.5 → 3
  })

  it('is stable across calls', () => {
    const text = 'consistent test string'
    expect(estimateTokens(text)).toBe(estimateTokens(text))
  })
})

describe('isSessionStale', () => {
  const now = new Date('2026-04-25T12:00:00Z')

  it('returns false when staleHours is 0 or negative (disabled)', () => {
    const lastActivity = new Date('2020-01-01T00:00:00Z') // ancient
    expect(isSessionStale(lastActivity, now, 0)).toBe(false)
    expect(isSessionStale(lastActivity, now, -1)).toBe(false)
  })

  it('returns false when staleHours is non-finite (disabled)', () => {
    const lastActivity = new Date('2020-01-01T00:00:00Z')
    expect(isSessionStale(lastActivity, now, NaN)).toBe(false)
    expect(isSessionStale(lastActivity, now, Infinity)).toBe(false)
  })

  it('returns false when activity is within the threshold', () => {
    // 23h ago — under the 24h threshold
    const lastActivity = new Date(now.getTime() - 23 * 60 * 60 * 1000)
    expect(isSessionStale(lastActivity, now, 24)).toBe(false)
  })

  it('returns false at exactly the threshold (strict greater-than)', () => {
    const lastActivity = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    expect(isSessionStale(lastActivity, now, 24)).toBe(false)
  })

  it('returns true when activity is older than the threshold', () => {
    // 24h + 1ms ago — just barely past 24h
    const lastActivity = new Date(now.getTime() - (24 * 60 * 60 * 1000 + 1))
    expect(isSessionStale(lastActivity, now, 24)).toBe(true)
  })

  it('returns true for very old activity', () => {
    const lastActivity = new Date('2020-01-01T00:00:00Z')
    expect(isSessionStale(lastActivity, now, 24)).toBe(true)
  })

  it('honors custom staleHours values', () => {
    // 5h ago, threshold 4h → stale
    const fiveAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    expect(isSessionStale(fiveAgo, now, 4)).toBe(true)
    // 5h ago, threshold 6h → not stale
    expect(isSessionStale(fiveAgo, now, 6)).toBe(false)
  })

  it('returns false when lastActivity is in the future (clock skew)', () => {
    const future = new Date(now.getTime() + 60_000)
    expect(isSessionStale(future, now, 24)).toBe(false)
  })
})
