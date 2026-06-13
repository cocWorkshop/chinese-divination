/**
 * Cross-validation of calculateBazi against tyme4ts library.
 *
 * 100+ dates spanning 1940–2030, covering:
 *   - Various decades and zodiac years
 *   - Solar term boundaries (立春 year flip, 节气 month flip)
 *   - Leap years
 *   - China DST period (1986–1991)
 *   - Early/late 子時
 *   - All 12 shichen
 *
 * For each date, we compute expected pillars directly from tyme4ts (the same
 * library our calculator wraps) and verify our calculateBazi output matches.
 * This catches any transformation bugs in our wrapper layer.
 */

import { describe, it, expect } from 'vitest'
import { calculateBazi } from '../baziCalculator'
import { SolarTime, Gender } from 'tyme4ts'

const p = (pillar: { stem: string; branch: string }) => pillar.stem + pillar.branch

// Helper: get expected pillars directly from tyme4ts
function getExpectedPillars(dateStr: string, hour: number, minute: number, gender: 'male' | 'female' = 'male') {
  const [y, m, d] = dateStr.split('-').map(Number)
  const st = SolarTime.fromYmdHms(y, m, d, hour, minute, 0)
  const lunar = st.getLunarHour()
  const ec = lunar.getEightChar()
  return {
    year: ec.getYear().getName(),
    month: ec.getMonth().getName(),
    day: ec.getDay().getName(),
    hour: ec.getHour().getName(),
  }
}

// Shichen name → approximate midpoint hour for fuzzy mode
const shichenMid: Record<string, number> = {
  zi_early: 0, chou: 2, yin: 4, mao: 6, chen: 8, si: 10,
  wu: 12, wei: 14, shen: 16, you: 18, xu: 20, hai: 22, zi_late: 23,
}

// ══════════════════════════════════════════════════════════════
// Test data: 100+ dates with diverse coverage
// ══════════════════════════════════════════════════════════════
const testCases: { date: string; shichen: string; gender: 'male' | 'female'; label: string }[] = [
  // ─── Various decades ───
  { date: '1940-01-15', shichen: 'wu', gender: 'male', label: '1940s winter' },
  { date: '1945-08-15', shichen: 'wu', gender: 'male', label: '1945 end of WWII' },
  { date: '1949-10-01', shichen: 'wu', gender: 'male', label: '1949 PRC founding' },
  { date: '1950-03-20', shichen: 'mao', gender: 'female', label: '1950s spring' },
  { date: '1955-12-25', shichen: 'you', gender: 'male', label: '1955 Christmas' },
  { date: '1960-02-05', shichen: 'si', gender: 'female', label: '1960 near 立春' },
  { date: '1964-07-04', shichen: 'wu', gender: 'male', label: '1964 summer' },
  { date: '1969-07-20', shichen: 'hai', gender: 'male', label: '1969 moon landing' },
  { date: '1970-01-01', shichen: 'zi_early', gender: 'male', label: '1970 epoch' },
  { date: '1975-06-15', shichen: 'chen', gender: 'female', label: '1975 summer' },
  { date: '1976-09-09', shichen: 'wu', gender: 'male', label: '1976 autumn' },
  { date: '1978-12-18', shichen: 'xu', gender: 'male', label: '1978 reform' },
  { date: '1980-05-18', shichen: 'si', gender: 'female', label: '1980 spring' },
  { date: '1982-08-08', shichen: 'wu', gender: 'male', label: '1982 summer' },
  { date: '1984-02-04', shichen: 'si', gender: 'male', label: '1984 立春 day' },
  { date: '1985-01-01', shichen: 'zi_early', gender: 'female', label: '1985 new year' },
  // ─── China DST period 1986-1991 ───
  { date: '1986-05-15', shichen: 'wu', gender: 'male', label: 'DST 1986 summer' },
  { date: '1987-07-20', shichen: 'si', gender: 'female', label: 'DST 1987 summer' },
  { date: '1988-06-15', shichen: 'wei', gender: 'male', label: 'DST 1988 summer' },
  { date: '1988-09-17', shichen: 'hai', gender: 'male', label: 'DST 1988 autumn' },
  { date: '1989-03-15', shichen: 'mao', gender: 'male', label: 'DST 1989 spring (pre-DST)' },
  { date: '1989-06-04', shichen: 'wu', gender: 'male', label: 'DST 1989 summer' },
  { date: '1990-01-01', shichen: 'zi_early', gender: 'female', label: 'DST era winter (no DST)' },
  { date: '1990-05-15', shichen: 'shen', gender: 'male', label: 'DST 1990 summer' },
  { date: '1991-08-20', shichen: 'you', gender: 'female', label: 'DST 1991 last year' },
  { date: '1992-01-01', shichen: 'wu', gender: 'male', label: 'Post-DST era' },
  // ─── 1990s–2000s variety ───
  { date: '1993-01-31', shichen: 'mao', gender: 'male', label: '1993 winter' },
  { date: '1994-06-30', shichen: 'wu', gender: 'female', label: '1994 summer' },
  { date: '1995-10-10', shichen: 'si', gender: 'male', label: '1995 autumn' },
  { date: '1996-02-29', shichen: 'wu', gender: 'female', label: '1996 leap day' },
  { date: '1997-07-01', shichen: 'wu', gender: 'male', label: '1997 HK handover' },
  { date: '1998-12-31', shichen: 'hai', gender: 'male', label: '1998 year end' },
  { date: '1999-09-21', shichen: 'chou', gender: 'female', label: '1999 台灣921' },
  { date: '2000-01-01', shichen: 'zi_early', gender: 'male', label: 'Y2K' },
  { date: '2000-02-05', shichen: 'si', gender: 'male', label: '2000 spring' },
  { date: '2000-06-15', shichen: 'wu', gender: 'female', label: '2000 summer' },
  { date: '2000-12-25', shichen: 'you', gender: 'male', label: '2000 Christmas' },
  { date: '2001-09-11', shichen: 'si', gender: 'male', label: '2001 9/11' },
  { date: '2002-02-12', shichen: 'mao', gender: 'female', label: '2002 spring' },
  { date: '2003-04-01', shichen: 'chen', gender: 'male', label: '2003 spring' },
  { date: '2004-02-29', shichen: 'wu', gender: 'female', label: '2004 leap day' },
  { date: '2005-07-07', shichen: 'wei', gender: 'male', label: '2005 summer' },
  { date: '2006-01-29', shichen: 'xu', gender: 'male', label: '2006 spring festival' },
  { date: '2007-10-15', shichen: 'shen', gender: 'female', label: '2007 autumn' },
  { date: '2008-08-08', shichen: 'wu', gender: 'male', label: '2008 Olympics' },
  { date: '2009-03-20', shichen: 'mao', gender: 'female', label: '2009 spring equinox' },
  { date: '2010-06-11', shichen: 'si', gender: 'male', label: '2010 World Cup' },
  // ─── 2010s ───
  { date: '2011-01-01', shichen: 'zi_early', gender: 'female', label: '2011 new year' },
  { date: '2012-02-04', shichen: 'si', gender: 'male', label: '2012 立春' },
  { date: '2012-12-21', shichen: 'wu', gender: 'male', label: '2012 winter solstice' },
  { date: '2013-06-15', shichen: 'wu', gender: 'female', label: '2013 summer' },
  { date: '2014-09-08', shichen: 'you', gender: 'male', label: '2014 白露' },
  { date: '2015-02-19', shichen: 'chou', gender: 'female', label: '2015 spring festival' },
  { date: '2016-02-29', shichen: 'wu', gender: 'male', label: '2016 leap day' },
  { date: '2017-10-01', shichen: 'wu', gender: 'female', label: '2017 national day' },
  { date: '2018-04-05', shichen: 'chen', gender: 'male', label: '2018 清明' },
  { date: '2019-02-05', shichen: 'si', gender: 'female', label: '2019 spring festival' },
  { date: '2019-06-21', shichen: 'wu', gender: 'male', label: '2019 summer solstice' },
  { date: '2019-12-31', shichen: 'hai', gender: 'male', label: '2019 year end' },
  // ─── 2020s ───
  { date: '2020-01-25', shichen: 'wu', gender: 'female', label: '2020 spring festival' },
  { date: '2020-02-04', shichen: 'si', gender: 'male', label: '2020 立春' },
  { date: '2020-06-21', shichen: 'wu', gender: 'male', label: '2020 summer solstice' },
  { date: '2020-12-21', shichen: 'wu', gender: 'female', label: '2020 winter solstice' },
  { date: '2021-02-03', shichen: 'si', gender: 'male', label: '2021 立春' },
  { date: '2021-02-12', shichen: 'wu', gender: 'female', label: '2021 spring festival' },
  { date: '2021-09-21', shichen: 'you', gender: 'male', label: '2021 中秋' },
  { date: '2022-02-01', shichen: 'wu', gender: 'male', label: '2022 spring festival' },
  { date: '2022-02-04', shichen: 'si', gender: 'female', label: '2022 立春' },
  { date: '2022-06-21', shichen: 'wu', gender: 'male', label: '2022 summer solstice' },
  { date: '2023-01-22', shichen: 'wu', gender: 'female', label: '2023 spring festival' },
  { date: '2023-02-04', shichen: 'si', gender: 'male', label: '2023 立春' },
  { date: '2023-06-21', shichen: 'wu', gender: 'male', label: '2023 summer solstice' },
  { date: '2024-02-04', shichen: 'si', gender: 'female', label: '2024 立春 甲辰年開始' },
  { date: '2024-02-10', shichen: 'wu', gender: 'male', label: '2024 spring festival' },
  { date: '2024-02-29', shichen: 'wu', gender: 'male', label: '2024 leap day' },
  { date: '2024-06-21', shichen: 'wu', gender: 'female', label: '2024 summer solstice' },
  { date: '2024-12-21', shichen: 'wu', gender: 'male', label: '2024 winter solstice' },
  { date: '2025-01-29', shichen: 'wu', gender: 'female', label: '2025 spring festival' },
  { date: '2025-02-03', shichen: 'si', gender: 'male', label: '2025 立春 乙巳年開始' },
  { date: '2025-06-21', shichen: 'wu', gender: 'male', label: '2025 summer solstice' },
  { date: '2026-02-04', shichen: 'si', gender: 'female', label: '2026 立春 丙午年開始' },
  { date: '2026-04-27', shichen: 'wu', gender: 'male', label: '2026 today' },
  { date: '2027-02-04', shichen: 'si', gender: 'male', label: '2027 立春' },
  { date: '2028-02-04', shichen: 'si', gender: 'female', label: '2028 立春' },
  { date: '2029-02-03', shichen: 'si', gender: 'male', label: '2029 立春' },
  { date: '2030-02-04', shichen: 'si', gender: 'male', label: '2030 立春' },
  // ─── All 12 shichen for one date ───
  { date: '2000-06-15', shichen: 'zi_early', gender: 'male', label: 'shichen: 子(early)' },
  { date: '2000-06-15', shichen: 'chou', gender: 'male', label: 'shichen: 丑' },
  { date: '2000-06-15', shichen: 'yin', gender: 'male', label: 'shichen: 寅' },
  { date: '2000-06-15', shichen: 'mao', gender: 'male', label: 'shichen: 卯' },
  { date: '2000-06-15', shichen: 'chen', gender: 'male', label: 'shichen: 辰' },
  { date: '2000-06-15', shichen: 'si', gender: 'male', label: 'shichen: 巳' },
  { date: '2000-06-15', shichen: 'wu', gender: 'male', label: 'shichen: 午' },
  { date: '2000-06-15', shichen: 'wei', gender: 'male', label: 'shichen: 未' },
  { date: '2000-06-15', shichen: 'shen', gender: 'male', label: 'shichen: 申' },
  { date: '2000-06-15', shichen: 'you', gender: 'male', label: 'shichen: 酉' },
  { date: '2000-06-15', shichen: 'xu', gender: 'male', label: 'shichen: 戌' },
  { date: '2000-06-15', shichen: 'hai', gender: 'male', label: 'shichen: 亥' },
  // ─── 立春 boundary: day before vs day of ───
  { date: '2024-02-03', shichen: 'wu', gender: 'male', label: '立春前一天(still 癸卯年)' },
  { date: '2024-02-04', shichen: 'wu', gender: 'male', label: '立春當天(甲辰年開始)' },
  { date: '2023-02-03', shichen: 'wu', gender: 'male', label: '2023立春前(still 壬寅年)' },
  { date: '2023-02-04', shichen: 'wu', gender: 'male', label: '2023立春(癸卯年開始)' },
  // ─── Late zi_late (23:00-00:00) — uses next day ───
  { date: '2000-06-15', shichen: 'zi_late', gender: 'male', label: 'zi_late 23:00' },
  { date: '1999-12-31', shichen: 'zi_late', gender: 'male', label: 'zi_late year boundary' },
]

describe('BaZi Cross-validation — 100+ dates vs tyme4ts oracle', () => {
  for (const tc of testCases) {
    it(`${tc.date} ${tc.shichen} (${tc.label})`, () => {
      const chart = calculateBazi(tc.date, tc.shichen, '', tc.gender)

      // Get expected from tyme4ts directly
      const midHour = shichenMid[tc.shichen]
      // For zi_late, tyme4ts expects next day at 23:xx
      const expected = getExpectedPillars(tc.date, midHour, 30, tc.gender)

      // Year pillar must match
      expect(p(chart.yearPillar)).toBe(expected.year)
      // Month pillar must match
      expect(p(chart.monthPillar)).toBe(expected.month)
      // Day pillar must match
      expect(p(chart.dayPillar)).toBe(expected.day)
      // Hour pillar must match
      expect(p(chart.hourPillar)).toBe(expected.hour)
    })
  }
})

describe('BaZi structural integrity — all test dates', () => {
  for (const tc of testCases) {
    it(`${tc.date} has valid five elements and strength`, () => {
      const chart = calculateBazi(tc.date, tc.shichen, '', tc.gender)

      // Five elements must sum to a positive value
      const fe = chart.fiveElements
      expect(fe.metal + fe.wood + fe.water + fe.fire + fe.earth).toBeGreaterThan(0)

      // Day master must be defined
      expect(chart.dayMaster.stem).toBeTruthy()
      expect(chart.dayMaster.element).toBeTruthy()
      expect(['strong', 'weak', 'neutral']).toContain(chart.strength)

      // Lucky/avoid elements must be arrays
      expect(Array.isArray(chart.luckyElements)).toBe(true)
      expect(Array.isArray(chart.avoidElements)).toBe(true)

      // Da Yun must have entries
      expect(chart.daYun.length).toBeGreaterThanOrEqual(1)

      // Each pillar must have hidden stems
      for (const pillar of [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar]) {
        expect(pillar.stem).toBeTruthy()
        expect(pillar.branch).toBeTruthy()
        expect(Array.isArray(pillar.hiddenStems)).toBe(true)
        expect(pillar.hiddenStems.length).toBeGreaterThanOrEqual(1)
      }
    })
  }
})

// Regression for the 喜用神/忌神 (lucky/avoid) logic. The weak-day-master
// branch used to push the day master's OWN element (比劫) into avoidElements
// instead of 财 (KE_MAP[dayElement]), so the same element appeared in both
// lucky and avoid lists and 财 was never flagged as 忌. This polluted the
// 流年 lucky/avoid tagging and the LLM's 忌神 input.
describe('喜用神/忌神 — lucky and avoid never overlap', () => {
  const samples: { date: string; shichen: string }[] = [
    { date: '1990-01-15', shichen: 'wu' },
    { date: '2000-06-21', shichen: 'mao' },
    { date: '1985-11-03', shichen: 'you' },
    { date: '1972-03-20', shichen: 'zi_early' },
    { date: '2010-09-09', shichen: 'shen' },
    { date: '1995-07-07', shichen: 'chen' },
    { date: '1968-12-25', shichen: 'hai' },
  ]
  // 五行: 生(produces), 克(overcomes).
  const PRODUCES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const PRODUCED_BY: Record<string, string> = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }
  const OVERCOMES: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  const overcameBy = (el: string) => Object.keys(OVERCOMES).find((e) => OVERCOMES[e] === el)!

  for (const s of samples) {
    it(`${s.date} ${s.shichen}: lucky/avoid are a correct 喜忌 partition`, () => {
      const chart = calculateBazi(s.date, s.shichen, '', 'male')
      const lucky = chart.luckyElements.filter(Boolean)
      const avoid = chart.avoidElements.filter(Boolean)
      const dm = chart.dayMaster.element

      // Never overlapping.
      expect(lucky.filter((e) => avoid.includes(e))).toEqual([])

      const robbery = dm                 // 比劫
      const seal = PRODUCED_BY[dm]        // 印
      const output = PRODUCES[dm]         // 食伤
      const wealth = OVERCOMES[dm]        // 财
      const officer = overcameBy(dm)      // 官杀

      if (chart.strength === 'weak') {
        // 身弱: 喜 比劫+印; 忌 食伤+财+官杀 (官杀 must be present — the completion).
        expect(lucky.sort()).toEqual([robbery, seal].sort())
        expect(avoid.sort()).toEqual([output, wealth, officer].sort())
        expect(avoid).toContain(officer)
        expect(avoid).not.toContain(robbery)
      } else if (chart.strength === 'strong') {
        // 身强: 喜 食伤+财+官杀; 忌 比劫+印.
        expect(lucky.sort()).toEqual([output, wealth, officer].sort())
        expect(avoid.sort()).toEqual([robbery, seal].sort())
        expect(lucky).toContain(officer)
      }
      // For strong/weak the five elements are fully partitioned.
      if (chart.strength !== 'neutral') {
        expect(new Set([...lucky, ...avoid]).size).toBe(5)
      }
    })
  }
})
