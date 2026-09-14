import { describe, it, expect } from 'vitest'
import {
  describeMoment,
  generateCalendarReferenceTable,
  buildCalendarPromptSection,
} from '../currentMoment'

describe('describeMoment & Calendar Reference System (Issue #150)', () => {
  // Test instant: 2026-06-19 14:00 in UTC+8 (UTC instant: 06:00Z, tzOffsetMin: -480)
  const june19Utc = new Date('2026-06-19T06:00:00.000Z')
  const tzBeijing = -480

  it('accurately computes 2026-06-19 four pillars and xunKong', () => {
    const m = describeMoment(june19Utc, tzBeijing)
    expect(m.solar).toContain('2026-06-19')
    expect(m.solar).toContain('週五')
    expect(m.yearGanZhi).toBe('丙午')
    expect(m.monthGanZhi).toBe('甲午')
    expect(m.dayGanZhi).toBe('甲子日')
    expect(m.hourGanZhi).toBe('辛未')
    expect(m.xunKong).toBe('戌亥')
    expect(m.lunar).toContain('五月初五')
  })

  it('generates accurate 14-day calendar reference table with specific target dates', () => {
    const table = generateCalendarReferenceTable(june19Utc, 14, tzBeijing)
    // 2026-06-19 is 甲子日 (Today)
    expect(table).toContain('2026-06-19')
    expect(table).toContain('甲子日')
    expect(table).toContain('戌亥空')

    // 2026-06-21 is 夏至 (Summer Solstice)
    expect(table).toContain('2026-06-21')
    expect(table).toContain('夏至')

    // 2026-06-23 is 下周二 戊辰日 (Issue #150 explicitly tested)
    expect(table).toContain('2026-06-23')
    expect(table).toContain('戊辰日')

    // 2026-06-25 is 庚午日 (Issue #150 explicitly tested)
    expect(table).toContain('2026-06-25')
    expect(table).toContain('庚午日')
  })

  it('builds calendar prompt section with strict time verification rules', () => {
    const section = buildCalendarPromptSection(june19Utc, tzBeijing, false)
    expect(section).toContain('甲子日')
    expect(section).toContain('庚午日')
    expect(section).toContain('戊辰日')
    expect(section).toContain('时间与干支绝对自检查规则')
    expect(section).toContain('严禁')
  })

  it('builds English calendar prompt section with strict time verification rules', () => {
    const section = buildCalendarPromptSection(june19Utc, tzBeijing, true)
    expect(section).toContain('Jia-Zi')
    expect(section).toContain('Calendar Reference Table')
    expect(section).toContain('Strict Time Verification Rule')
  })
})
