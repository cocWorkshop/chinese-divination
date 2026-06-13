import { describe, it, expect } from 'vitest'
import { extractBirthInputs, hasBirthDateTime } from '../_birthProfile'

describe('extractBirthInputs', () => {
  it('passes through solar birthDate unchanged', () => {
    const out = extractBirthInputs({
      birthDate: '1990-05-15', birthTime: 'wu', gender: 'male',
      birthPlace: '北京', timeMode: 'fuzzy',
    })
    expect(out.solarBirthDate).toBe('1990-05-15')
    expect(out.lunarOriginal).toBeUndefined()
    expect(out.birthTime).toBe('wu')
    expect(out.gender).toBe('male')
    expect(out.birthPlace).toBe('北京')
  })

  it('converts lunar date to solar and preserves the original', () => {
    const out = extractBirthInputs({
      birthDate: '1990-05-15', lunarToggle: 'lunar', birthTime: 'wu',
    })
    expect(out.lunarOriginal).toBe('1990-05-15')
    // Whatever solar date the library produces, it must be zero-padded YYYY-MM-DD and different from the lunar input.
    expect(out.solarBirthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(out.solarBirthDate).not.toBe('1990-05-15')
  })

  it('defaults missing scalars sensibly', () => {
    const out = extractBirthInputs({})
    expect(out.solarBirthDate).toBeUndefined()
    expect(out.birthPlace).toBe('')
    expect(out.gender).toBe('male')
    expect(out.timeMode).toBe('fuzzy')
    expect(out.birthLng).toBeNull()
    expect(out.birthLat).toBeNull()
  })

  it('preserves precise-mode exactTime and coordinates', () => {
    const out = extractBirthInputs({
      birthDate: '1990-05-15', timeMode: 'precise', exactTime: '14:35',
      birthLng: 116.4, birthLat: 39.9, birthPlace: '北京',
    })
    expect(out.timeMode).toBe('precise')
    expect(out.exactTime).toBe('14:35')
    expect(out.birthLng).toBe(116.4)
    expect(out.birthLat).toBe(39.9)
  })
})

describe('hasBirthDateTime', () => {
  it('true when solarBirthDate + fuzzy time', () => {
    expect(hasBirthDateTime({
      solarBirthDate: '1990-05-15', birthTime: 'wu', exactTime: undefined,
      birthPlace: '', gender: 'male', timeMode: 'fuzzy', birthLng: null, birthLat: null,
    })).toBe(true)
  })

  it('true when solarBirthDate + precise time', () => {
    expect(hasBirthDateTime({
      solarBirthDate: '1990-05-15', birthTime: undefined, exactTime: '14:35',
      birthPlace: '', gender: 'male', timeMode: 'precise', birthLng: null, birthLat: null,
    })).toBe(true)
  })

  it('false without a date', () => {
    expect(hasBirthDateTime({
      solarBirthDate: undefined, birthTime: 'wu', exactTime: undefined,
      birthPlace: '', gender: 'male', timeMode: 'fuzzy', birthLng: null, birthLat: null,
    })).toBe(false)
  })

  it('false without any time', () => {
    expect(hasBirthDateTime({
      solarBirthDate: '1990-05-15', birthTime: undefined, exactTime: undefined,
      birthPlace: '', gender: 'male', timeMode: 'fuzzy', birthLng: null, birthLat: null,
    })).toBe(false)
  })
})
