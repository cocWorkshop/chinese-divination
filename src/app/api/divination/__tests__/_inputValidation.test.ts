import { describe, it, expect } from 'vitest'
import {
  validateInputData,
  sanitizeLanguage,
  sanitizeQuestion,
  validateNewFamilyMember,
} from '../_inputValidation'

describe('validateInputData', () => {
  it('accepts a normal birth profile object', () => {
    const r = validateInputData({ birthDate: '1990-05-15', gender: 'male' })
    expect(r.ok).toBe(true)
  })

  it('rejects non-objects (array, string, null, undefined)', () => {
    for (const bad of [[1, 2], 'hello', null, undefined, 42]) {
      const r = validateInputData(bad)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBeTruthy()
    }
  })

  it('rejects payloads above the 20KB cap', () => {
    const big = { junk: 'x'.repeat(25_000) }
    const r = validateInputData(big)
    expect(r.ok).toBe(false)
  })

  it('accepts payloads just under the cap', () => {
    const ok = { junk: 'x'.repeat(5_000) }
    expect(validateInputData(ok).ok).toBe(true)
  })

  it('strips non-JSON values via round-trip (undefined fields)', () => {
    const r = validateInputData({ a: 1, b: undefined })
    expect(r.ok).toBe(true)
    if (r.ok) expect(Object.keys(r.value)).toEqual(['a'])
  })
})

describe('sanitizeLanguage', () => {
  it('whitelists zh-TW / en', () => {
    expect(sanitizeLanguage('en')).toBe('en')
    expect(sanitizeLanguage('zh-TW')).toBe('zh-TW')
  })

  it('everything else falls back to zh-TW', () => {
    for (const bad of ['zh', 'EN', '', undefined, null, 123]) {
      expect(sanitizeLanguage(bad)).toBe('zh-TW')
    }
  })
})

describe('sanitizeQuestion', () => {
  it('undefined / null / empty → null value', () => {
    for (const v of [undefined, null, '']) {
      const r = sanitizeQuestion(v)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBeFalsy()
    }
  })

  it('rejects non-strings', () => {
    const r = sanitizeQuestion(123)
    expect(r.ok).toBe(false)
  })

  it('rejects > 500 chars', () => {
    const r = sanitizeQuestion('x'.repeat(501))
    expect(r.ok).toBe(false)
  })

  it('keeps a normal question', () => {
    const r = sanitizeQuestion('今年事業運如何？')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('今年事業運如何？')
  })
})

describe('validateNewFamilyMember', () => {
  it('undefined / null → null (not creating a member)', () => {
    for (const v of [undefined, null]) {
      const r = validateNewFamilyMember(v)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value).toBeNull()
    }
  })

  it('missing relation → null', () => {
    const r = validateNewFamilyMember({ name: '小明' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })

  it('caps name / relationDetail lengths', () => {
    const r = validateNewFamilyMember({
      relation: 'other',
      name: 'x'.repeat(500),
      relationDetail: 'y'.repeat(500),
    })
    expect(r.ok).toBe(true)
    if (r.ok && r.value) {
      expect(r.value.name!.length).toBe(100)
      expect(r.value.relationDetail!.length).toBe(100)
      expect(r.value.relation).toBe('other')
    }
  })

  it('trims whitespace on name and relationDetail', () => {
    const r = validateNewFamilyMember({ relation: 'spouse', name: '  阿美  ', relationDetail: '  ' })
    expect(r.ok).toBe(true)
    if (r.ok && r.value) {
      expect(r.value.name).toBe('阿美')
      expect(r.value.relationDetail).toBeNull()
    }
  })

  it('rejects non-object shapes', () => {
    for (const bad of ['str', 42, [{}]]) {
      const r = validateNewFamilyMember(bad)
      expect(r.ok).toBe(false)
    }
  })
})
