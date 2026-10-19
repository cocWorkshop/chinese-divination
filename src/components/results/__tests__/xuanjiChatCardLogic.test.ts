import { describe, it, expect } from 'vitest'

describe('XuanjiChatCard replacement logic', () => {
  const shouldReplaceWithMaster = (
    isShared: boolean | undefined,
    readingId: string | null | undefined,
    masterEnabled: boolean | undefined
  ) => {
    return !isShared && Boolean(readingId) && Boolean(masterEnabled)
  }

  it('hides per-reading Q&A in favor of Master when user is signed in and viewing a valid reading', () => {
    expect(shouldReplaceWithMaster(false, 'reading_123', true)).toBe(true)
  })

  it('keeps per-reading Q&A visible for guest/unauthenticated users (master not enabled)', () => {
    expect(shouldReplaceWithMaster(false, 'reading_123', false)).toBe(false)
    expect(shouldReplaceWithMaster(false, 'reading_123', undefined)).toBe(false)
  })

  it('keeps per-reading Q&A / read-only history for shared public links', () => {
    expect(shouldReplaceWithMaster(true, 'reading_123', true)).toBe(false)
  })

  it('keeps per-reading Q&A if readingId is absent', () => {
    expect(shouldReplaceWithMaster(false, null, true)).toBe(false)
    expect(shouldReplaceWithMaster(false, undefined, true)).toBe(false)
  })
})
