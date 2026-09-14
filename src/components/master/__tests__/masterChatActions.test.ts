import { describe, it, expect } from 'vitest'
import { haptics, hapticLight, hapticMedium, hapticHeavy } from '@/lib/native'

describe('Native Haptics & Feedback Architecture', () => {
  it('provides comprehensive haptic helpers', () => {
    expect(typeof haptics.light).toBe('function')
    expect(typeof haptics.medium).toBe('function')
    expect(typeof haptics.heavy).toBe('function')
    expect(typeof haptics.diceToss).toBe('function')
    expect(typeof hapticLight).toBe('function')
    expect(typeof hapticMedium).toBe('function')
    expect(typeof hapticHeavy).toBe('function')
  })

  it('handles diceToss alias cleanly', () => {
    expect(haptics.diceToss).toBe(haptics.heavy)
  })
})
