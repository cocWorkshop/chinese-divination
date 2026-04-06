/**
 * Shared birth-profile preprocessing for personal divination types
 * (bazi, ziwei, other=birth-date meihua).
 *
 * Handles lunar→solar conversion and normalizes the birth inputs read from
 * inputData. Event-based handlers (qimen, liuyao, meihua event-time, fengshui,
 * iching) do NOT use this.
 */

import { Lunar } from 'lunar-typescript'

export interface BirthInputs {
  /** Gregorian YYYY-MM-DD birth date (converted from lunar if user entered lunar). */
  solarBirthDate: string | undefined
  /** Fuzzy shichen key (zi/chou/...) or undefined. */
  birthTime: string | undefined
  /** Precise HH:mm string, only set when timeMode='precise'. */
  exactTime: string | undefined
  birthPlace: string
  gender: string
  timeMode: string
  birthEnvironment?: string
  birthLng: number | null
  birthLat: number | null
  /** Set iff user's input was lunar — preserves the original lunar YYYY-MM-DD for display. */
  lunarOriginal?: string
}

export function extractBirthInputs(inputData: Record<string, unknown>): BirthInputs {
  const rawBirthDate = inputData.birthDate as string | undefined
  const lunarToggle = inputData.lunarToggle as string | undefined

  let solarBirthDate = rawBirthDate
  let lunarOriginal: string | undefined

  if (lunarToggle === 'lunar' && rawBirthDate) {
    try {
      const [y, m, d] = rawBirthDate.split('-').map(Number)
      const lunarDate = Lunar.fromYmd(y, m, d)
      const solarDate = lunarDate.getSolar()
      solarBirthDate = `${solarDate.getYear()}-${String(solarDate.getMonth()).padStart(2, '0')}-${String(solarDate.getDay()).padStart(2, '0')}`
      lunarOriginal = rawBirthDate
      console.log(`Lunar ${rawBirthDate} → Solar ${solarBirthDate}`)
    } catch (lunarErr) {
      console.error('Lunar conversion failed:', lunarErr)
    }
  }

  return {
    solarBirthDate,
    birthTime: inputData.birthTime as string | undefined,
    exactTime: inputData.exactTime as string | undefined,
    birthPlace: (inputData.birthPlace as string | undefined) || '',
    gender: (inputData.gender as string | undefined) || 'male',
    timeMode: (inputData.timeMode as string | undefined) || 'fuzzy',
    birthEnvironment: inputData.birthEnvironment as string | undefined,
    birthLng: (inputData.birthLng as number | null | undefined) ?? null,
    birthLat: (inputData.birthLat as number | null | undefined) ?? null,
    lunarOriginal,
  }
}

/** True if the birth profile has enough data for bazi/ziwei (date + some time). */
export function hasBirthDateTime(birth: BirthInputs): boolean {
  return !!(birth.solarBirthDate && (birth.birthTime || birth.exactTime))
}
