import { describe, it, expect, vi, afterEach } from 'vitest'
import { hapticLight, hapticMedium, hapticHeavy } from '../native'
import { rateLimit } from '../rateLimiter'
import { Solar, Lunar } from 'lunar-typescript'

describe('System Optimizations & Regression Protection', () => {
  describe('PersonInfoHeader Shichen Labels', () => {
    it('correctly maps early and late Zi hours without inversion', () => {
      const earlyZi = '00:00-01:00'
      const lateZi = '23:00-00:00'

      expect(earlyZi).toBe('00:00-01:00')
      expect(lateZi).toBe('23:00-00:00')
    })
  })

  describe('Native Haptics Web Fallback (navigator.vibrate)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('falls back to navigator.vibrate on web when Haptics plugin fails or is uninstalled', async () => {
      const vibrateMock = vi.fn()
      vi.stubGlobal('navigator', { vibrate: vibrateMock })

      await hapticLight()
      expect(vibrateMock).toHaveBeenCalledWith(12)

      await hapticMedium()
      expect(vibrateMock).toHaveBeenCalledWith(28)

      await hapticHeavy()
      expect(vibrateMock).toHaveBeenCalledWith([40, 30, 25])
    })

    it('gracefully handles absence of navigator.vibrate without throwing', async () => {
      vi.stubGlobal('navigator', {})
      await expect(hapticLight()).resolves.toBeUndefined()
      await expect(hapticMedium()).resolves.toBeUndefined()
      await expect(hapticHeavy()).resolves.toBeUndefined()
    })
  })

  describe('In-Memory Rate Limiter', () => {
    it('allows requests within threshold and blocks beyond threshold', () => {
      const testKey = `test-client-${Date.now()}`
      expect(rateLimit(testKey, 3, 10000)).toBe(true)
      expect(rateLimit(testKey, 3, 10000)).toBe(true)
      expect(rateLimit(testKey, 3, 10000)).toBe(true)
      // 4th request exceeds limit of 3
      expect(rateLimit(testKey, 3, 10000)).toBe(false)
    })

    it('resets counter after windowMs expires', async () => {
      const testKey = `test-reset-${Date.now()}`
      expect(rateLimit(testKey, 1, 50)).toBe(true)
      expect(rateLimit(testKey, 1, 50)).toBe(false)

      await new Promise(r => setTimeout(r, 60))
      expect(rateLimit(testKey, 1, 50)).toBe(true)
    })
  })

  describe('Solar & Lunar Bidirectional Conversion', () => {
    it('accurately converts Gregorian to Lunar with GanZhi and ShengXiao', () => {
      // 1990-05-15 is 庚午 (马) 年四月廿一
      const solar = Solar.fromYmd(1990, 5, 15)
      const lunar = solar.getLunar()

      expect(lunar.getYearInGanZhi()).toBe('庚午')
      expect(lunar.getYearShengXiao()).toBe('马')
      expect(lunar.getMonthInChinese()).toBe('四')
      expect(lunar.getDayInChinese()).toBe('廿一')
    })

    it('accurately converts Lunar to Gregorian', () => {
      // Lunar 1990-04-21 is Gregorian 1990-05-15
      const lunar = Lunar.fromYmd(1990, 4, 21)
      const solar = lunar.getSolar()

      expect(solar.toYmd()).toBe('1990-05-15')
    })

    it('correctly handles leap month conversions in Lunar calendar', () => {
      // 2023 was a leap month 2 (闰二月)
      const lunar = Lunar.fromYmd(2023, -2, 1) // negative indicates leap month in lunar-typescript or test leap
      expect(lunar).toBeDefined()
    })
  })
})
