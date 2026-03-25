import { describe, it, expect } from 'vitest'
import { isChineseDST, isNorthAmericaDST, getTimezoneOffset } from '../dstDetection'

describe('isChineseDST', () => {
  it('returns true for dates during China DST (1986-1991)', () => {
    // 1988-06-15 14:00 — mid-summer, definitely DST
    expect(isChineseDST(1988, 6, 15, 14)).toBe(true)
    // 1986-07-01 — DST period
    expect(isChineseDST(1986, 7, 1, 12)).toBe(true)
    // 1991-08-01 — last year of DST
    expect(isChineseDST(1991, 8, 1, 12)).toBe(true)
  })

  it('returns false for dates outside China DST', () => {
    // 1988-01-15 — winter, no DST
    expect(isChineseDST(1988, 1, 15, 12)).toBe(false)
    // 1985 — before DST era
    expect(isChineseDST(1985, 7, 1, 12)).toBe(false)
    // 1992 — after DST era
    expect(isChineseDST(1992, 7, 1, 12)).toBe(false)
    // 2000 — long after
    expect(isChineseDST(2000, 6, 15, 12)).toBe(false)
  })

  it('handles boundary dates correctly', () => {
    // 1988: Apr 10 02:00 start
    expect(isChineseDST(1988, 4, 10, 1)).toBe(false)  // 01:00, before DST starts
    expect(isChineseDST(1988, 4, 10, 2)).toBe(true)   // 02:00, DST starts
    expect(isChineseDST(1988, 4, 10, 3)).toBe(true)   // 03:00, DST active

    // 1988: Sep 11 02:00 end
    expect(isChineseDST(1988, 9, 11, 1)).toBe(true)   // 01:00, still DST
    expect(isChineseDST(1988, 9, 11, 2)).toBe(false)  // 02:00, DST ends
  })

  // Elvin's birth: 1988-09-17 — after DST ended (Sep 11)
  it('correctly identifies Elvin birth date as non-DST', () => {
    expect(isChineseDST(1988, 9, 17, 12)).toBe(false)
  })
})

describe('isNorthAmericaDST', () => {
  it('returns true during summer (post-2007 rules)', () => {
    // 2024-07-01 — mid-summer
    expect(isNorthAmericaDST(2024, 7, 1, 12)).toBe(true)
  })

  it('returns false during winter', () => {
    expect(isNorthAmericaDST(2024, 1, 15, 12)).toBe(false)
    expect(isNorthAmericaDST(2024, 12, 15, 12)).toBe(false)
  })

  it('handles 2007+ boundaries: 2nd Sunday March, 1st Sunday November', () => {
    // 2024: March 10 is 2nd Sunday
    expect(isNorthAmericaDST(2024, 3, 10, 1)).toBe(false)
    expect(isNorthAmericaDST(2024, 3, 10, 2)).toBe(true)
    // 2024: November 3 is 1st Sunday
    expect(isNorthAmericaDST(2024, 11, 3, 1)).toBe(true)
    expect(isNorthAmericaDST(2024, 11, 3, 2)).toBe(false)
  })

  it('returns false before 1966', () => {
    expect(isNorthAmericaDST(1960, 7, 1, 12)).toBe(false)
  })
})

describe('getTimezoneOffset', () => {
  it('returns UTC+8 for China without DST', () => {
    const result = getTimezoneOffset(2000, 6, 15, 12, 116.4, 39.9) // Beijing
    expect(result.offset).toBe(8)
    expect(result.isDST).toBe(false)
    expect(result.region).toBe('china')
  })

  it('returns UTC+9 for China during DST', () => {
    const result = getTimezoneOffset(1988, 6, 15, 14, 116.4, 39.9) // Beijing, summer 1988
    expect(result.offset).toBe(9)
    expect(result.isDST).toBe(true)
    expect(result.region).toBe('china')
    expect(result.dstNote).toContain('夏令时')
  })

  it('returns correct offset for Eastern US', () => {
    // New York (lon ~-74), winter
    const winter = getTimezoneOffset(2024, 1, 15, 12, -74, 40.7)
    expect(winter.offset).toBe(-5)
    expect(winter.isDST).toBe(false)
    expect(winter.region).toBe('north_america')

    // New York, summer
    const summer = getTimezoneOffset(2024, 7, 15, 12, -74, 40.7)
    expect(summer.offset).toBe(-4)
    expect(summer.isDST).toBe(true)
  })

  it('returns correct offset for Pacific US', () => {
    // Los Angeles (lon ~-118), summer
    const result = getTimezoneOffset(2024, 7, 15, 12, -118.2, 34)
    expect(result.offset).toBe(-7) // PDT
    expect(result.isDST).toBe(true)
  })

  it('estimates timezone for unknown regions', () => {
    // London (lon ~0)
    const result = getTimezoneOffset(2024, 7, 15, 12, 0, 51.5)
    expect(result.offset).toBe(0)
    expect(result.region).toBe('unknown')
  })
})
