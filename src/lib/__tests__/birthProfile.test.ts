/**
 * Tests for birth profile preprocessing:
 *   - Lunar→Solar date conversion
 *   - Birth input extraction
 *   - Calendar type handling
 */

import { describe, it, expect } from 'vitest'
import { extractBirthInputs, hasBirthDateTime } from '../../app/api/divination/handlers/_birthProfile'
import { Lunar } from 'lunar-typescript'

describe('extractBirthInputs — lunar→solar conversion', () => {
  it('converts lunar 1988-08-07 to correct solar date', () => {
    const result = extractBirthInputs({
      birthDate: '1988-08-07',
      lunarToggle: 'lunar',
      birthTime: 'hai',
      gender: 'male',
    })
    // 1988年農曆八月初七 → 公曆 1988-09-17
    expect(result.solarBirthDate).toBe('1988-09-17')
    expect(result.lunarOriginal).toBe('1988-08-07')
  })

  it('solar input is not converted', () => {
    const result = extractBirthInputs({
      birthDate: '1988-09-17',
      lunarToggle: 'solar',
      birthTime: 'hai',
      gender: 'male',
    })
    expect(result.solarBirthDate).toBe('1988-09-17')
    expect(result.lunarOriginal).toBeUndefined()
  })

  it('no lunarToggle defaults to solar (no conversion)', () => {
    const result = extractBirthInputs({
      birthDate: '2000-01-15',
      birthTime: 'wu',
      gender: 'female',
    })
    expect(result.solarBirthDate).toBe('2000-01-15')
    expect(result.lunarOriginal).toBeUndefined()
  })

  it('converts lunar 2024-01-01 (spring fest) correctly', () => {
    const result = extractBirthInputs({
      birthDate: '2024-01-01',
      lunarToggle: 'lunar',
      birthTime: 'wu',
      gender: 'male',
    })
    // 2024年農曆正月初一 → 公曆 2024-02-10
    const expected = Lunar.fromYmd(2024, 1, 1).getSolar()
    const expectedStr = `${expected.getYear()}-${String(expected.getMonth()).padStart(2, '0')}-${String(expected.getDay()).padStart(2, '0')}`
    expect(result.solarBirthDate).toBe(expectedStr)
  })

  it('converts lunar 1990-04-15 correctly', () => {
    const result = extractBirthInputs({
      birthDate: '1990-04-15',
      lunarToggle: 'lunar',
      birthTime: 'si',
      gender: 'female',
    })
    const expected = Lunar.fromYmd(1990, 4, 15).getSolar()
    const expectedStr = `${expected.getYear()}-${String(expected.getMonth()).padStart(2, '0')}-${String(expected.getDay()).padStart(2, '0')}`
    expect(result.solarBirthDate).toBe(expectedStr)
    expect(result.lunarOriginal).toBe('1990-04-15')
  })

  it('handles lunar year-end (十二月三十/廿九)', () => {
    const result = extractBirthInputs({
      birthDate: '1999-12-29',
      lunarToggle: 'lunar',
      birthTime: 'zi',
      gender: 'male',
    })
    // 1999年農曆十二月廿九 → 公曆 2000年2月某日
    expect(result.solarBirthDate).toBeDefined()
    expect(result.solarBirthDate!.startsWith('2000')).toBe(true) // crosses into next solar year
    expect(result.lunarOriginal).toBe('1999-12-29')
  })
})

describe('extractBirthInputs — field extraction', () => {
  it('extracts all fields correctly', () => {
    const result = extractBirthInputs({
      birthDate: '2000-06-15',
      birthTime: 'wu',
      exactTime: '12:30',
      birthPlace: '北京',
      gender: 'female',
      timeMode: 'precise',
      birthEnvironment: '城市',
      birthLng: 116.40,
      birthLat: 39.90,
    })
    expect(result.solarBirthDate).toBe('2000-06-15')
    expect(result.birthTime).toBe('wu')
    expect(result.exactTime).toBe('12:30')
    expect(result.birthPlace).toBe('北京')
    expect(result.gender).toBe('female')
    expect(result.timeMode).toBe('precise')
    expect(result.birthEnvironment).toBe('城市')
    expect(result.birthLng).toBe(116.40)
    expect(result.birthLat).toBe(39.90)
  })

  it('defaults gender to male when missing', () => {
    const result = extractBirthInputs({ birthDate: '2000-01-01', birthTime: 'wu' })
    expect(result.gender).toBe('male')
  })

  it('defaults timeMode to fuzzy when missing', () => {
    const result = extractBirthInputs({ birthDate: '2000-01-01', birthTime: 'wu' })
    expect(result.timeMode).toBe('fuzzy')
  })

  it('defaults birthPlace to empty string when missing', () => {
    const result = extractBirthInputs({ birthDate: '2000-01-01', birthTime: 'wu' })
    expect(result.birthPlace).toBe('')
  })
})

describe('hasBirthDateTime', () => {
  it('returns true when date + birthTime present', () => {
    const birth = extractBirthInputs({ birthDate: '2000-01-01', birthTime: 'wu' })
    expect(hasBirthDateTime(birth)).toBe(true)
  })

  it('returns true when date + exactTime present', () => {
    const birth = extractBirthInputs({ birthDate: '2000-01-01', exactTime: '12:00', timeMode: 'precise' })
    expect(hasBirthDateTime(birth)).toBe(true)
  })

  it('returns false when date missing', () => {
    const birth = extractBirthInputs({ birthTime: 'wu' })
    expect(hasBirthDateTime(birth)).toBe(false)
  })

  it('returns false when both time fields missing', () => {
    const birth = extractBirthInputs({ birthDate: '2000-01-01' })
    expect(hasBirthDateTime(birth)).toBe(false)
  })
})

describe('Lunar→Solar conversion consistency with tyme4ts', () => {
  // Verify that lunar-typescript's conversion matches what we'd expect
  // from the Chinese calendar for well-known dates

  const knownConversions = [
    { lunar: { y: 2024, m: 1, d: 1 }, desc: '2024 春節', solarMonth: 2, solarDay: 10 },
    { lunar: { y: 2023, m: 1, d: 1 }, desc: '2023 春節', solarMonth: 1, solarDay: 22 },
    { lunar: { y: 2025, m: 1, d: 1 }, desc: '2025 春節', solarMonth: 1, solarDay: 29 },
    { lunar: { y: 2022, m: 1, d: 1 }, desc: '2022 春節', solarMonth: 2, solarDay: 1 },
    { lunar: { y: 2020, m: 1, d: 1 }, desc: '2020 春節', solarMonth: 1, solarDay: 25 },
  ]

  for (const kc of knownConversions) {
    it(`${kc.desc}: lunar ${kc.lunar.y}-${kc.lunar.m}-${kc.lunar.d} → solar month=${kc.solarMonth} day=${kc.solarDay}`, () => {
      const lunarDate = Lunar.fromYmd(kc.lunar.y, kc.lunar.m, kc.lunar.d)
      const solarDate = lunarDate.getSolar()
      expect(solarDate.getMonth()).toBe(kc.solarMonth)
      expect(solarDate.getDay()).toBe(kc.solarDay)
    })
  }
})
