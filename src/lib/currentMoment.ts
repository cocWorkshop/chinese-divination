/**
 * Describe "now" the way a divination master needs it: the user's LOCAL
 * solar date + weekday, plus 農曆 and 干支 (年/月/日/時) — the latter being
 * load-bearing for 流年/大運, 應期推算, and 擇日.
 *
 * The Master server runs in UTC, but the audience is largely UTC+8, so the
 * caller passes the client's instant + timezone offset; we shift to local
 * wall-clock before deriving anything calendar-related.
 */

import { SolarTime, SolarDay } from 'tyme4ts'

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

export interface MomentParts {
  /** Local solar date+time, e.g. "2026-06-06 (週六) 22:30". */
  solar: string
  /** 農曆, e.g. "農曆 丙午年 五月初一". */
  lunar: string
  /** 干支 day pillar, e.g. "庚子日". */
  dayGanZhi: string
  /** 干支 year pillar (節氣/立春-based, matches 流年). */
  yearGanZhi: string
  /** 干支 month pillar (節氣-based). */
  monthGanZhi: string
  /** 干支 hour pillar (時辰干支). */
  hourGanZhi: string
  /** 旬空 (日空地支, e.g. "戌亥"). */
  xunKong: string
  /** One-line rendering for the system prompt. */
  line: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * @param instant   the UTC instant ("now") — e.g. new Date() or Date.parse(clientTime).
 * @param tzOffsetMin  Date.prototype.getTimezoneOffset() value from the client
 *                     (minutes local is BEHIND UTC; UTC+8 → -480). Defaults to 0 (UTC).
 */
export function describeMoment(instant: Date, tzOffsetMin = 0): MomentParts {
  // Shift the instant so UTC-readers yield the client's local wall-clock.
  const local = new Date(instant.getTime() - tzOffsetMin * 60000)
  const y = local.getUTCFullYear()
  const mo = local.getUTCMonth() + 1
  const d = local.getUTCDate()
  const hh = local.getUTCHours()
  const mm = local.getUTCMinutes()
  const wd = WEEKDAY_ZH[local.getUTCDay()]

  const solar = `${y}-${pad(mo)}-${pad(d)} (週${wd}) ${pad(hh)}:${pad(mm)}`

  // 干支: read EightChar at local noon for year/month/day to keep "today" stable
  // (the day pillar rolls at 子時/23:00 — noon keeps "today" consistent across afternoon).
  // Read hour pillar at the actual wall-clock time.
  const ecNoon = SolarTime.fromYmdHms(y, mo, d, 12, 0, 0).getLunarHour().getEightChar()
  const ecActual = SolarTime.fromYmdHms(y, mo, d, hh, mm, 0).getLunarHour().getEightChar()

  const gz = (sc: { getHeavenStem(): { getName(): string }; getEarthBranch(): { getName(): string } }) =>
    sc.getHeavenStem().getName() + sc.getEarthBranch().getName()

  const yearGanZhi = gz(ecNoon.getYear())
  const monthGanZhi = gz(ecNoon.getMonth())
  const dayGanZhi = gz(ecNoon.getDay())
  const hourGanZhi = gz(ecActual.getHour())
  const xunKong = ecNoon.getDay().getExtraEarthBranches().map(b => b.getName()).join('')

  // 農曆 date.
  const lunarDay = SolarDay.fromYmd(y, mo, d).getLunarDay()
  const lunar = `農曆 ${yearGanZhi}年 ${lunarDay.getLunarMonth().getName()}${lunarDay.getName()}`

  const line = `${solar} ｜ ${lunar} ｜ 今日 ${dayGanZhi}日（年 ${yearGanZhi} · 月 ${monthGanZhi} · 時 ${hourGanZhi}）｜ 旬空 ${xunKong}`

  return { solar, lunar, dayGanZhi: `${dayGanZhi}日`, yearGanZhi, monthGanZhi, hourGanZhi, xunKong, line }
}

/**
 * Generate an accurate pre-computed Markdown calendar table for the next N days.
 * Preempts LLM hallucinations on day GanZhi, lunar dates, and weekday correspondence (Issue #150).
 */
export function generateCalendarReferenceTable(startDate: Date, daysCount = 14, tzOffsetMin = 0): string {
  const lines: string[] = [
    '| 公历日期 | 星期 | 农历 | 日柱干支 | 旬空 | 节气/备考 |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |',
  ]

  const localStart = new Date(startDate.getTime() - tzOffsetMin * 60000)

  for (let i = 0; i < daysCount; i++) {
    const cur = new Date(localStart.getTime() + i * 86400000)
    const y = cur.getUTCFullYear()
    const mo = cur.getUTCMonth() + 1
    const d = cur.getUTCDate()
    const wd = WEEKDAY_ZH[cur.getUTCDay()]

    const sd = SolarDay.fromYmd(y, mo, d)
    const ld = sd.getLunarDay()
    const ec = SolarTime.fromYmdHms(y, mo, d, 12, 0, 0).getLunarHour().getEightChar()
    const dayGz = ec.getDay().getName()
    const kw = ec.getDay().getExtraEarthBranches().map(b => b.getName()).join('')
    const term = sd.getTerm() ? sd.getTerm().getName() : ''

    const relNote = i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : ''
    const notes = [relNote, term].filter(Boolean).join(' · ')

    lines.push(`| ${y}-${pad(mo)}-${pad(d)} | 星期${wd} | ${ld.getLunarMonth().getName()}${ld.getName()} | ${dayGz}日 | ${kw}空 | ${notes || '—'} |`)
  }

  return lines.join('\n')
}

/**
 * Compose a strict calendar prompt section with precomputed table and anti-hallucination rules.
 */
export function buildCalendarPromptSection(instant: Date, tzOffsetMin = 0, isEnglish = false): string {
  const m = describeMoment(instant, tzOffsetMin)
  const table = generateCalendarReferenceTable(instant, 14, tzOffsetMin)

  if (isEnglish) {
    return `【Current Authoritative Date & Calendar Anchor】
- Current Solar Time: ${m.solar}
- Current Lunar Date: ${m.lunar}
- Four Pillars: Year ${m.yearGanZhi}, Month ${m.monthGanZhi}, Day ${m.dayGanZhi} (Jia-Zi), Hour ${m.hourGanZhi}
- Day XunKong (Void): ${m.xunKong}

【Strict Time Verification Rule — Zero Hallucination】
When answering ANY question about dates, days of the week, lunar calendar, Ganzhi day pillars, or timing:
1. You MUST directly consult the pre-computed Calendar Reference Table below.
2. DO NOT calculate or guess Ganzhi pillars yourself — LLM Ganzhi calculations are strictly forbidden.
3. Every date reference (e.g. "next Tuesday", "the 25th", "tomorrow") MUST match the table below exactly.

【Calendar Reference Table (Next 14 Days)】
${table}`
  }

  return `【当前权威时间与天干地支基准】
- 当前公历：${m.solar}
- 当前农历：${m.lunar}
- 四柱干支：${m.yearGanZhi}年 ${m.monthGanZhi}月 ${m.dayGanZhi} ${m.hourGanZhi}时
- 当日旬空：${m.xunKong}空

【时间与干支绝对自检查规则（严禁幻觉推算）】
在回答用户涉及任何公历日期、农历日期、星期几、干支日柱、节日或应期推算的问题时：
1. 必须无条件查阅并引用下方【预计算干支日历对照表】，不得自行根据规律心算或推测干支！
2. 任何特定日期（例如“下周二是什么日”、“这个月25日是什么干支”）必须严格从表中直接提取对应干支与农历，严禁擅自捏造！
3. 若用户询问日柱或干支正误，以上表为唯一权威事实依据进行解答和校准。

【预计算干支日历对照表（未来14天逐日速查）】
${table}`
}
