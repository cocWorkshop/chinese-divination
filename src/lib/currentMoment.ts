/**
 * Describe "now" the way a divination master needs it: the user's LOCAL
 * solar date + weekday, plus 農曆 and 干支 (年/月/日) — the latter being
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

  // 干支: read the EightChar at local noon so the day pillar is unambiguous
  // (the day pillar rolls at 子時/23:00 — noon keeps "today" stable).
  const ec = SolarTime.fromYmdHms(y, mo, d, 12, 0, 0).getLunarHour().getEightChar()
  const gz = (sc: { getHeavenStem(): { getName(): string }; getEarthBranch(): { getName(): string } }) =>
    sc.getHeavenStem().getName() + sc.getEarthBranch().getName()
  const yearGanZhi = gz(ec.getYear())
  const monthGanZhi = gz(ec.getMonth())
  const dayGanZhi = gz(ec.getDay())

  // 農曆 date.
  const lunarDay = SolarDay.fromYmd(y, mo, d).getLunarDay()
  const lunar = `農曆 ${yearGanZhi}年 ${lunarDay.getLunarMonth().getName()}${lunarDay.getName()}`

  const line = `${solar} ｜ ${lunar} ｜ 今日 ${dayGanZhi}日（年 ${yearGanZhi} · 月 ${monthGanZhi}）`

  return { solar, lunar, dayGanZhi: `${dayGanZhi}日`, yearGanZhi, monthGanZhi, line }
}
