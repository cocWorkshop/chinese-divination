/**
 * DST (Daylight Saving Time) auto-detection for true solar time calculation.
 * 
 * Supports:
 * - China DST (1986-1991): UTC+9 during summer
 * - North America DST: timezone detection from longitude + DST rules
 */

// China DST periods (1986-1991)
// Format: [startMonth, startDay, endMonth, endDay]
const CHINA_DST_PERIODS: Record<number, [number, number, number, number]> = {
  1986: [5, 4, 9, 14],
  1987: [4, 12, 9, 13],
  1988: [4, 10, 9, 11],
  1989: [4, 16, 9, 17],
  1990: [4, 15, 9, 16],
  1991: [4, 14, 9, 15],
}

/**
 * Check if a date falls within China's DST period (1986-1991).
 * DST started at 02:00 on start date, ended at 02:00 on end date.
 */
export function isChineseDST(year: number, month: number, day: number, hour: number = 12): boolean {
  const period = CHINA_DST_PERIODS[year]
  if (!period) return false

  const [startMonth, startDay, endMonth, endDay] = period

  // Create comparable values: month * 100 + day (plus hour consideration for boundary days)
  const dateVal = month * 10000 + day * 100 + hour
  const startVal = startMonth * 10000 + startDay * 100 + 2  // DST starts at 02:00
  const endVal = endMonth * 10000 + endDay * 100 + 2        // DST ends at 02:00

  return dateVal >= startVal && dateVal < endVal
}

/**
 * Get the Nth occurrence of a given weekday in a month.
 * weekday: 0=Sunday, 1=Monday, ...
 * Returns the day of month.
 */
function getNthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay()
  let firstOccurrence = 1 + ((weekday - firstDay + 7) % 7)
  return firstOccurrence + (n - 1) * 7
}

/**
 * Get the last occurrence of a given weekday in a month.
 */
function getLastWeekday(year: number, month: number, weekday: number): number {
  const lastDay = new Date(year, month, 0).getDate() // last day of month
  const lastDayWeekday = new Date(year, month - 1, lastDay).getDay()
  const diff = (lastDayWeekday - weekday + 7) % 7
  return lastDay - diff
}

/**
 * Check if a date falls within North America DST.
 * 
 * Post-2007 (Energy Policy Act of 2005):
 *   Start: 2nd Sunday of March at 02:00
 *   End: 1st Sunday of November at 02:00
 * 
 * 1987-2006:
 *   Start: 1st Sunday of April at 02:00
 *   End: Last Sunday of October at 02:00
 * 
 * 1966-1986 (Uniform Time Act):
 *   Start: Last Sunday of April at 02:00
 *   End: Last Sunday of October at 02:00
 * 
 * Before 1966: no standardized DST, return false
 */
export function isNorthAmericaDST(year: number, month: number, day: number, hour: number = 12): boolean {
  if (year < 1966) return false

  let startMonth: number, startDay: number, endMonth: number, endDay: number

  if (year >= 2007) {
    // 2nd Sunday of March → 1st Sunday of November
    startMonth = 3
    startDay = getNthWeekday(year, 3, 0, 2)
    endMonth = 11
    endDay = getNthWeekday(year, 11, 0, 1)
  } else if (year >= 1987) {
    // 1st Sunday of April → Last Sunday of October
    startMonth = 4
    startDay = getNthWeekday(year, 4, 0, 1)
    endMonth = 10
    endDay = getLastWeekday(year, 10, 0)
  } else {
    // Last Sunday of April → Last Sunday of October
    startMonth = 4
    startDay = getLastWeekday(year, 4, 0)
    endMonth = 10
    endDay = getLastWeekday(year, 10, 0)
  }

  const dateVal = month * 10000 + day * 100 + hour
  const startVal = startMonth * 10000 + startDay * 100 + 2
  const endVal = endMonth * 10000 + endDay * 100 + 2

  return dateVal >= startVal && dateVal < endVal
}

/**
 * Approximate standard timezone from longitude for North America.
 * Returns standard UTC offset (negative for west).
 */
function getNATimezoneFromLongitude(longitude: number): number {
  // Approximate timezone boundaries for continental North America
  if (longitude >= -57) return -3.5    // Newfoundland (NST)
  if (longitude >= -67.5) return -4    // Atlantic (AST)
  if (longitude >= -82.5) return -5    // Eastern (EST)
  if (longitude >= -97.5) return -6    // Central (CST)
  if (longitude >= -112.5) return -7   // Mountain (MST)
  return -8                             // Pacific (PST)
}

/**
 * Detect if coordinates are in North America.
 */
function isNorthAmerica(longitude: number, latitude?: number | null): boolean {
  if (latitude != null && (latitude < 15 || latitude > 85)) return false
  return longitude >= -170 && longitude <= -50
}

/**
 * Detect if coordinates are in China region.
 */
function isChina(longitude: number, latitude?: number | null): boolean {
  if (latitude != null && (latitude < 18 || latitude > 54)) return false
  return longitude >= 73 && longitude <= 135
}

export interface TimezoneResult {
  /** UTC offset in hours (e.g. 8 for CST, -5 for EST) */
  offset: number
  /** Whether DST is active */
  isDST: boolean
  /** Region identifier */
  region: 'china' | 'north_america' | 'unknown'
  /** Human-readable DST note */
  dstNote?: string
}

/**
 * Get the timezone offset for a birth date/time and location.
 * 
 * @param year - Birth year
 * @param month - Birth month (1-12)
 * @param day - Birth day
 * @param hour - Birth hour (0-23)
 * @param longitude - Birth longitude
 * @param latitude - Birth latitude (optional, helps with region detection)
 * @returns TimezoneResult with offset and DST info
 */
export function getTimezoneOffset(
  year: number,
  month: number,
  day: number,
  hour: number,
  longitude: number,
  latitude?: number | null
): TimezoneResult {
  // China region
  if (isChina(longitude, latitude)) {
    const dst = isChineseDST(year, month, day, hour)
    return {
      offset: dst ? 9 : 8,
      isDST: dst,
      region: 'china',
      dstNote: dst ? '中国夏令时 (1986-1991) 已校正，时间减去1小时' : undefined,
    }
  }

  // North America
  if (isNorthAmerica(longitude, latitude)) {
    const standardOffset = getNATimezoneFromLongitude(longitude)
    const dst = isNorthAmericaDST(year, month, day, hour)
    return {
      offset: dst ? standardOffset + 1 : standardOffset,
      isDST: dst,
      region: 'north_america',
      dstNote: dst ? 'North America DST active, +1hr offset applied' : undefined,
    }
  }

  // Default: estimate from longitude (15° per hour)
  const estimatedOffset = Math.round(longitude / 15)
  return {
    offset: estimatedOffset,
    isDST: false,
    region: 'unknown',
  }
}
