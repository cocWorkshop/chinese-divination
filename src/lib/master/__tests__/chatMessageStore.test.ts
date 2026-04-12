import { describe, it, expect } from 'vitest'
import { estimateTokens } from '../chatMessageStore'

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
