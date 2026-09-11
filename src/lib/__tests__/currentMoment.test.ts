import { describe, expect, it } from 'vitest'
import { describeMoment } from '../currentMoment'

// Golden values from issue #150 (user-verified against a real calendar:
// 2026-06-19 = 甲子日, 2026-06-25 = 庚午日). Equivalence between this
// tyme4ts-based source and calculateBazi is covered by baziCrossValidation.test.ts.
describe('describeMoment', () => {
  it('returns the correct day ganzhi for a known date (UTC+8)', () => {
    const m = describeMoment(new Date('2026-06-19T04:00:00.000Z'), -480) // 12:00 local
    expect(m.dayGanZhi).toBe('甲子日')
    expect(m.solar).toContain('2026-06-19')
  })

  it('advances the day pillar across days', () => {
    const m = describeMoment(new Date('2026-06-25T04:00:00.000Z'), -480)
    expect(m.dayGanZhi).toBe('庚午日')
  })

  it('renders the caller-local wall clock, not the server clock', () => {
    // 17:00Z = already 2026-06-20 01:00 in UTC+8, still 2026-06-19 in UTC.
    expect(describeMoment(new Date('2026-06-19T17:00:00.000Z'), -480).solar).toContain('2026-06-20')
    expect(describeMoment(new Date('2026-06-19T17:00:00.000Z'), 0).solar).toContain('2026-06-19')
  })

  it('keeps 晚子時 on the same day by pinning local noon', () => {
    // 23:59 local June 19 (15:59Z): day pillar must still be June 19's 甲子.
    expect(describeMoment(new Date('2026-06-19T15:59:00.000Z'), -480).dayGanZhi).toBe('甲子日')
  })

  it('renders a one-line prompt block with lunar + ganzhi', () => {
    const m = describeMoment(new Date('2026-06-19T04:00:00.000Z'), -480)
    expect(m.line).toContain('甲子日')
    expect(m.line).toContain('農曆')
  })
})
