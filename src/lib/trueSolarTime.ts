export function equationOfTime(dayOfYear: number): number {
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180)
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
}

export function trueSolarTime(
  date: Date,
  longitude: number,
  timezone: number = 8
): Date {
  const centralLongitude = timezone * 15
  const longitudeCorrection = (longitude - centralLongitude) * 4

  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  const eot = equationOfTime(dayOfYear)
  const totalCorrectionMinutes = longitudeCorrection + eot

  return new Date(date.getTime() + totalCorrectionMinutes * 60 * 1000)
}

export function getTrueSolarTimeCorrection(
  date: Date,
  longitude: number,
  timezone: number = 8
): number {
  const centralLongitude = timezone * 15
  const longitudeCorrection = (longitude - centralLongitude) * 4
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const eot = equationOfTime(dayOfYear)
  return longitudeCorrection + eot
}

export interface ShichenInfo {
  branch: string
  name: string
  range: string
}

const shichenList: ShichenInfo[] = [
  { branch: '子', name: 'zi', range: '23:00-01:00' },
  { branch: '丑', name: 'chou', range: '01:00-03:00' },
  { branch: '寅', name: 'yin', range: '03:00-05:00' },
  { branch: '卯', name: 'mao', range: '05:00-07:00' },
  { branch: '辰', name: 'chen', range: '07:00-09:00' },
  { branch: '巳', name: 'si', range: '09:00-11:00' },
  { branch: '午', name: 'wu', range: '11:00-13:00' },
  { branch: '未', name: 'wei', range: '13:00-15:00' },
  { branch: '申', name: 'shen', range: '15:00-17:00' },
  { branch: '酉', name: 'you', range: '17:00-19:00' },
  { branch: '戌', name: 'xu', range: '19:00-21:00' },
  { branch: '亥', name: 'hai', range: '21:00-23:00' },
]

export function getShichen(trueSolarDate: Date): ShichenInfo {
  const hour = trueSolarDate.getHours()
  const totalMinutes = hour * 60 + trueSolarDate.getMinutes()

  let idx: number
  if (totalMinutes >= 23 * 60 || totalMinutes < 1 * 60) idx = 0
  else if (totalMinutes < 3 * 60) idx = 1
  else if (totalMinutes < 5 * 60) idx = 2
  else if (totalMinutes < 7 * 60) idx = 3
  else if (totalMinutes < 9 * 60) idx = 4
  else if (totalMinutes < 11 * 60) idx = 5
  else if (totalMinutes < 13 * 60) idx = 6
  else if (totalMinutes < 15 * 60) idx = 7
  else if (totalMinutes < 17 * 60) idx = 8
  else if (totalMinutes < 19 * 60) idx = 9
  else if (totalMinutes < 21 * 60) idx = 10
  else idx = 11

  return shichenList[idx]
}

export function shichenNameToBranch(name: string): string {
  const map: Record<string, string> = {
    'zi': '子', 'zi_early': '子', 'zi_late': '子', 'chou': '丑', 'yin': '寅', 'mao': '卯',
    'chen': '辰', 'si': '巳', 'wu': '午', 'wei': '未',
    'shen': '申', 'you': '酉', 'xu': '戌', 'hai': '亥',
    '子': '子', '丑': '丑', '寅': '寅', '卯': '卯',
    '辰': '辰', '巳': '巳', '午': '午', '未': '未',
    '申': '申', '酉': '酉', '戌': '戌', '亥': '亥',
  }
  return map[name] || '子'
}

export function shichenToHourRange(branch: string): { start: number; end: number } {
  const ranges: Record<string, { start: number; end: number }> = {
    '子': { start: 23, end: 1 },
    '丑': { start: 1, end: 3 },
    '寅': { start: 3, end: 5 },
    '卯': { start: 5, end: 7 },
    '辰': { start: 7, end: 9 },
    '巳': { start: 9, end: 11 },
    '午': { start: 11, end: 13 },
    '未': { start: 13, end: 15 },
    '申': { start: 15, end: 17 },
    '酉': { start: 17, end: 19 },
    '戌': { start: 19, end: 21 },
    '亥': { start: 21, end: 23 },
  }
  return ranges[branch] || { start: 23, end: 1 }
}
