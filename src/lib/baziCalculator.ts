import { Solar, Lunar } from 'lunar-typescript'
import { cityLongitudes } from './cityLongitudes'
import { trueSolarTime, getTrueSolarTimeCorrection, getShichen, shichenNameToBranch, shichenToHourRange } from './trueSolarTime'

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const

const STEM_ELEMENT: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}

const STEM_YINYANG: Record<string, '阳' | '阴'> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴',
}

const HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己','癸','辛'],
  '寅': ['甲','丙','戊'],
  '卯': ['乙'],
  '辰': ['戊','乙','癸'],
  '巳': ['丙','庚','戊'],
  '午': ['丁','己'],
  '未': ['己','丁','乙'],
  '申': ['庚','壬','戊'],
  '酉': ['辛'],
  '戌': ['戊','辛','丁'],
  '亥': ['壬','甲'],
}

// Hidden stem weights: main qi = 1.0, middle qi = 0.5, residual qi = 0.3
const HIDDEN_STEM_WEIGHTS: Record<string, number[]> = {
  '子': [1.0],
  '丑': [0.6, 0.3, 0.1],
  '寅': [0.6, 0.3, 0.1],
  '卯': [1.0],
  '辰': [0.6, 0.3, 0.1],
  '巳': [0.6, 0.3, 0.1],
  '午': [0.7, 0.3],
  '未': [0.6, 0.3, 0.1],
  '申': [0.6, 0.3, 0.1],
  '酉': [1.0],
  '戌': [0.6, 0.3, 0.1],
  '亥': [0.7, 0.3],
}

const NAYIN: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水', '甲午': '砂石金', '乙未': '砂石金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '砂中土', '丁巳': '砂中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
}

// Five elements production cycle: 木→火→土→金→水→木
const PRODUCES: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
const PRODUCED_BY: Record<string, string> = { '火': '木', '土': '火', '金': '土', '水': '金', '木': '水' }

function tenGod(dayStem: string, otherStem: string): string {
  if (dayStem === otherStem) return '比肩'
  const dayEl = STEM_ELEMENT[dayStem]
  const otherEl = STEM_ELEMENT[otherStem]
  const dayYY = STEM_YINYANG[dayStem]
  const otherYY = STEM_YINYANG[otherStem]
  const samePolarity = dayYY === otherYY

  if (dayEl === otherEl) return samePolarity ? '比肩' : '劫财'
  if (PRODUCES[dayEl] === otherEl) return samePolarity ? '食神' : '伤官'
  if (PRODUCED_BY[dayEl] === otherEl) return samePolarity ? '偏印' : '正印'
  if (isKe(dayEl, otherEl)) return samePolarity ? '偏财' : '正财'
  // Other克me
  if (isKe(otherEl, dayEl)) return samePolarity ? '七杀' : '正官'

  return '比肩' // fallback
}

const KE_MAP: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }
function isKe(a: string, b: string): boolean { return KE_MAP[a] === b }

// Shen Sha calculations
function calculateShenSha(
  yearBranch: string, dayBranch: string, dayStem: string,
  monthBranch: string, hourBranch: string
): { name: string; description: string }[] {
  const result: { name: string; description: string }[] = []
  const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch]
  const bi = (b: string) => (BRANCHES as readonly string[]).indexOf(b)

  // 天乙贵人 (by day stem)
  const tianyiMap: Record<string, string[]> = {
    '甲': ['丑','未'], '戊': ['丑','未'], '庚': ['丑','未'],
    '乙': ['子','申'], '己': ['子','申'],
    '丙': ['酉','亥'], '丁': ['酉','亥'],
    '壬': ['卯','巳'], '癸': ['卯','巳'],
    '辛': ['寅','午'],
  }
  const tianyiBranches = tianyiMap[dayStem] || []
  for (const b of allBranches) {
    if (tianyiBranches.includes(b)) {
      result.push({ name: '天乙贵人', description: '逢凶化吉，贵人相助' })
      break
    }
  }

  // 文昌 (by day stem)
  const wenchangMap: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
    '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
  }
  const wc = wenchangMap[dayStem]
  if (wc && allBranches.includes(wc)) {
    result.push({ name: '文昌', description: '聪明好学，利于考试功名' })
  }

  // 驿马 (by year branch or day branch)
  const yimaMap: Record<string, string> = {
    '寅': '申', '午': '申', '戌': '申',
    '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
  }
  const yima = yimaMap[yearBranch]
  if (yima && allBranches.includes(yima)) {
    result.push({ name: '驿马', description: '主奔波劳碌，利于出行变动' })
  }

  // 桃花 (by year branch or day branch)
  const taohuaMap: Record<string, string> = {
    '寅': '卯', '午': '卯', '戌': '卯',
    '申': '酉', '子': '酉', '辰': '酉',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子',
  }
  const taohua = taohuaMap[yearBranch]
  if (taohua && allBranches.includes(taohua)) {
    result.push({ name: '桃花', description: '人缘好，异性缘佳' })
  }

  // 华盖 (by year branch)
  const huagaiMap: Record<string, string> = {
    '寅': '戌', '午': '戌', '戌': '戌',
    '申': '辰', '子': '辰', '辰': '辰',
    '巳': '丑', '酉': '丑', '丑': '丑',
    '亥': '未', '卯': '未', '未': '未',
  }
  const huagai = huagaiMap[yearBranch]
  if (huagai && allBranches.includes(huagai)) {
    result.push({ name: '华盖', description: '聪慧孤高，利于艺术宗教' })
  }

  // 将星 (by year branch)
  const jiangxingMap: Record<string, string> = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
  }
  const jx = jiangxingMap[yearBranch]
  if (jx && allBranches.includes(jx)) {
    result.push({ name: '将星', description: '有领导才能，权威之象' })
  }

  // 劫煞 (by year branch)
  const jieshaMap: Record<string, string> = {
    '寅': '亥', '午': '亥', '戌': '亥',
    '申': '巳', '子': '巳', '辰': '巳',
    '巳': '寅', '酉': '寅', '丑': '寅',
    '亥': '申', '卯': '申', '未': '申',
  }
  const js = jieshaMap[yearBranch]
  if (js && allBranches.includes(js)) {
    result.push({ name: '劫煞', description: '主劫难波折，需小心防范' })
  }

  // 亡神 (by year branch)
  const wangshenMap: Record<string, string> = {
    '寅': '巳', '午': '巳', '戌': '巳',
    '申': '亥', '子': '亥', '辰': '亥',
    '巳': '申', '酉': '申', '丑': '申',
    '亥': '寅', '卯': '寅', '未': '寅',
  }
  const ws = wangshenMap[yearBranch]
  if (ws && allBranches.includes(ws)) {
    result.push({ name: '亡神', description: '主精神不安，需注意心态调整' })
  }

  // 天德 (by month branch)
  const tiandeMap: Record<string, string> = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
    '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
    '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
  }
  const td = tiandeMap[monthBranch]
  if (td && (STEMS.includes(td as any) ? [dayStem].includes(td) : allBranches.includes(td))) {
    result.push({ name: '天德', description: '逢凶化吉，福德深厚' })
  }

  // 月德 (by month branch)
  const yuedeMap: Record<string, string> = {
    '寅': '丙', '午': '丙', '戌': '丙',
    '申': '壬', '子': '壬', '辰': '壬',
    '巳': '庚', '酉': '庚', '丑': '庚',
    '亥': '甲', '卯': '甲', '未': '甲',
  }
  const yd = yuedeMap[monthBranch]
  if (yd && [dayStem].includes(yd)) {
    result.push({ name: '月德', description: '品德高尚，遇难呈祥' })
  }

  return result
}

function formatTime(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface PillarData {
  stem: string
  branch: string
  element: string
  nayin: string
  hiddenStems: string[]
  tenGods: { stem: string; god: string }[]
}

export interface DaYunPillar {
  stem: string
  branch: string
  nayin: string
  startAge: number    // age when this Da Yun starts
  startYear: number   // calendar year
  endAge: number
  endYear: number
}

export interface XiaoYunPillar {
  stem: string
  branch: string
  age: number
  year: number
}

export interface QiYunInfo {
  direction: '顺排' | '逆排'
  startAge: number           // e.g. 1.25 means 1 year 3 months
  startAgeLabel: string      // e.g. "1歲3個月"
  startYear: number
  startMonth: number
  nearestJieQi: string       // name of the jie qi
  nearestJieQiDate: string   // date of the jie qi
  daysDiff: number           // days between birth and jie qi
}

export interface BaziChart {
  yearPillar: PillarData
  monthPillar: PillarData
  dayPillar: PillarData
  hourPillar: PillarData
  dayMaster: { stem: string; element: string; yinYang: '阴' | '阳' }
  fiveElements: { metal: number; wood: number; water: number; fire: number; earth: number }
  strength: 'strong' | 'weak' | 'neutral'
  strengthLabel: string
  luckyElements: string[]
  avoidElements: string[]
  shenSha: { name: string; description: string }[]
  trueSolarTime: {
    originalTime: string
    correctedTime: string
    correctionMinutes: number
    longitude: number
    shichen: string
    shichenChanged: boolean
  }
  daYun: DaYunPillar[]
  xiaoYun: XiaoYunPillar[]
  qiYun: QiYunInfo
}

// 60 Jiazi cycle for Da Yun calculation
const JIAZI_CYCLE: string[] = []
for (let i = 0; i < 60; i++) {
  JIAZI_CYCLE.push(STEMS[i % 10] + BRANCHES[i % 12])
}

function getJiaziIndex(stem: string, branch: string): number {
  const gz = stem + branch
  return JIAZI_CYCLE.indexOf(gz)
}

function getNextJiazi(stem: string, branch: string, offset: number): { stem: string; branch: string } {
  const idx = getJiaziIndex(stem, branch)
  let newIdx = (idx + offset) % 60
  if (newIdx < 0) newIdx += 60
  return { stem: JIAZI_CYCLE[newIdx][0], branch: JIAZI_CYCLE[newIdx][1] }
}

/**
 * Determine Da Yun direction
 * Year stem index: 甲=0(阳), 乙=1(阴), 丙=2(阳), 丁=3(阴), ...
 * Even index (0,2,4,6,8) = 阳, Odd index (1,3,5,7,9) = 阴
 * 阳男/阴女 → 顺排 (forward), 阴男/阳女 → 逆排 (backward)
 */
function getDaYunDirection(yearStem: string, gender: 'male' | 'female'): '顺排' | '逆排' {
  const stemIdx = (STEMS as readonly string[]).indexOf(yearStem)
  const isYangStem = stemIdx % 2 === 0 // 甲丙戊庚壬 = 阳
  const isMale = gender === 'male'

  // 阳男/阴女 → 顺排, 阴男/阳女 → 逆排
  if ((isYangStem && isMale) || (!isYangStem && !isMale)) {
    return '顺排'
  }
  return '逆排'
}

/**
 * Calculate Qi Yun (起运) age
 * 顺排: count from birth to next 节气 (jie, not zhong qi)
 * 逆排: count from birth to previous 节气
 * Conversion: 3 days = 1 year, 1 day = 4 months, 2 hours (1 shichen) = 10 days
 */
function calculateQiYun(
  birthYear: number, birthMonth: number, birthDay: number,
  birthHour: number, direction: '顺排' | '逆排'
): { startAge: number; startAgeLabel: string; jieQiName: string; jieQiDate: string; daysDiff: number; startYear: number; startMonth: number } {
  const solar = Solar.fromYmdHms(birthYear, birthMonth, birthDay, birthHour, 0, 0)
  const lunar = solar.getLunar()

  // 节气 (Jie) are the odd-numbered ones in the 24 solar terms sequence
  // lunar-typescript: use getJieQiTable() or iterate
  // We need to find the nearest Jie (not Zhong) before and after birth

  // The 12 Jie qi (节): 立春,惊蛰,清明,立夏,芒种,小暑,立秋,白露,寒露,立冬,大雪,小寒
  const JIE_QI_NAMES = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒']

  // Get jie qi table from lunar-typescript
  const jieQiTable = lunar.getJieQiTable()

  // Convert birth to timestamp for comparison
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay, birthHour, 0, 0)
  const birthTs = birthDate.getTime()

  // Collect all jie qi (节, not 中气) with their dates
  const jieQiList: { name: string; date: Date; ts: number }[] = []

  for (const [name, jqSolar] of Object.entries(jieQiTable)) {
    if (!JIE_QI_NAMES.includes(name)) continue
    const d = new Date(jqSolar.getYear(), jqSolar.getMonth() - 1, jqSolar.getDay(),
      jqSolar.getHour(), jqSolar.getMinute(), jqSolar.getSecond())
    jieQiList.push({ name, date: d, ts: d.getTime() })
  }

  // We might need to check adjacent years too for edge cases
  // Get previous and next year's jie qi
  for (const offsetYear of [-1, 1]) {
    const adjSolar = Solar.fromYmdHms(birthYear + offsetYear, birthMonth, birthDay, birthHour, 0, 0)
    const adjLunar = adjSolar.getLunar()
    const adjTable = adjLunar.getJieQiTable()
    for (const [name, jqSolar] of Object.entries(adjTable)) {
      if (!JIE_QI_NAMES.includes(name)) continue
      const d = new Date(jqSolar.getYear(), jqSolar.getMonth() - 1, jqSolar.getDay(),
        jqSolar.getHour(), jqSolar.getMinute(), jqSolar.getSecond())
      // Avoid duplicates
      if (!jieQiList.some(j => Math.abs(j.ts - d.getTime()) < 86400000)) {
        jieQiList.push({ name, date: d, ts: d.getTime() })
      }
    }
  }

  // Sort by timestamp
  jieQiList.sort((a, b) => a.ts - b.ts)

  let targetJieQi: { name: string; date: Date; ts: number } | null = null

  if (direction === '顺排') {
    // Find next jie qi after birth
    for (const jq of jieQiList) {
      if (jq.ts > birthTs) {
        targetJieQi = jq
        break
      }
    }
  } else {
    // Find previous jie qi before birth
    for (let i = jieQiList.length - 1; i >= 0; i--) {
      if (jieQiList[i].ts < birthTs) {
        targetJieQi = jieQiList[i]
        break
      }
    }
  }

  if (!targetJieQi) {
    // Fallback
    return { startAge: 3, startAgeLabel: '3歲', jieQiName: '未知', jieQiDate: '', daysDiff: 9, startYear: birthYear + 3, startMonth: birthMonth }
  }

  // Calculate difference in days and hours
  const diffMs = Math.abs(targetJieQi.ts - birthTs)
  const totalHours = diffMs / (1000 * 60 * 60)
  const totalDays = totalHours / 24

  // Convert: 3 days = 1 year, 1 day = 4 months, 2 hours = 10 days
  // More precisely: totalDays / 3 = years (with remainder)
  const years = Math.floor(totalDays / 3)
  const remainDays = totalDays - years * 3
  const months = Math.floor(remainDays * 4) // 1 day = 4 months
  const remainHours = (remainDays - months / 4) * 24
  const extraDays = Math.floor(remainHours / 2 * 10 / 24) // rough

  const startAge = years + months / 12
  let startAgeLabel = `${years}歲`
  if (months > 0) startAgeLabel += `${months}個月`

  // Calculate start year and month
  const startYear = birthYear + years
  const startMonth = ((birthMonth - 1 + months) % 12) + 1
  const actualStartYear = startMonth <= birthMonth && months > 0 ? startYear + 1 : startYear

  const jieQiDateStr = `${targetJieQi.date.getFullYear()}-${String(targetJieQi.date.getMonth() + 1).padStart(2, '0')}-${String(targetJieQi.date.getDate()).padStart(2, '0')}`

  return {
    startAge,
    startAgeLabel,
    jieQiName: targetJieQi.name,
    jieQiDate: jieQiDateStr,
    daysDiff: Math.round(totalDays * 10) / 10,
    startYear: actualStartYear,
    startMonth,
  }
}

/**
 * Calculate Da Yun (大运) - 8 pillars, each 10 years
 */
function calculateDaYun(
  monthStem: string, monthBranch: string,
  direction: '顺排' | '逆排',
  qiYunStartAge: number, birthYear: number
): DaYunPillar[] {
  const result: DaYunPillar[] = []
  const step = direction === '顺排' ? 1 : -1

  for (let i = 1; i <= 8; i++) {
    const pillar = getNextJiazi(monthStem, monthBranch, step * i)
    const gz = pillar.stem + pillar.branch
    const startAge = Math.floor(qiYunStartAge) + (i - 1) * 10
    const endAge = startAge + 9
    const startYear = birthYear + startAge
    const endYear = birthYear + endAge

    result.push({
      stem: pillar.stem,
      branch: pillar.branch,
      nayin: NAYIN[gz] || '',
      startAge,
      startYear,
      endAge,
      endYear,
    })
  }

  return result
}

/**
 * Calculate Xiao Yun (小运) - from hour pillar, until Da Yun starts
 */
function calculateXiaoYun(
  hourStem: string, hourBranch: string,
  direction: '顺排' | '逆排',
  qiYunStartAge: number, birthYear: number
): XiaoYunPillar[] {
  const result: XiaoYunPillar[] = []
  const step = direction === '顺排' ? 1 : -1
  const maxAge = Math.floor(qiYunStartAge) // only before qi yun starts

  for (let i = 1; i <= Math.max(maxAge, 1); i++) {
    const pillar = getNextJiazi(hourStem, hourBranch, step * i)
    result.push({
      stem: pillar.stem,
      branch: pillar.branch,
      age: i,
      year: birthYear + i,
    })
  }

  return result
}

export function calculateBazi(
  birthDate: string,
  birthTime: string,
  birthPlace: string,
  gender: 'male' | 'female'
): BaziChart {
  // Resolve longitude
  const cityInfo = cityLongitudes[birthPlace]
  const longitude = cityInfo?.lng || 120.0 // default to 120°E if unknown

  // Parse birth date
  const [year, month, day] = birthDate.split('-').map(Number)

  // Resolve shichen to an hour for the solar object
  const branch = shichenNameToBranch(birthTime)
  const hourRange = shichenToHourRange(branch)
  // Use the midpoint of the shichen for true solar time calculation
  let midHour = branch === '子' ? 0 : hourRange.start + 1 // midpoint-ish

  // Create standard time Date for true solar time calculation
  const standardDate = new Date(year, month - 1, day, midHour, 0, 0)
  const correctionMinutes = getTrueSolarTimeCorrection(standardDate, longitude)
  const correctedDate = trueSolarTime(standardDate, longitude)
  const correctedShichen = getShichen(correctedDate)
  const shichenChanged = correctedShichen.branch !== branch

  // Use corrected shichen for the actual BaZi calculation
  const actualBranch = correctedShichen.branch
  // Map branch to hour for lunar-typescript
  const branchToHour: Record<string, number> = {
    '子': 0, '丑': 2, '寅': 4, '卯': 6, '辰': 8, '巳': 10,
    '午': 12, '未': 14, '申': 16, '酉': 18, '戌': 20, '亥': 22,
  }
  const solarHour = branchToHour[actualBranch] ?? 12

  // Use lunar-typescript for accurate Gan-Zhi calculation
  const solar = Solar.fromYmdHms(year, month, day, solarHour, 0, 0)
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()

  const yearGZ = eightChar.getYear()
  const monthGZ = eightChar.getMonth()
  const dayGZ = eightChar.getDay()
  const hourGZ = eightChar.getTime()

  const yStem = yearGZ[0], yBranch = yearGZ[1]
  const mStem = monthGZ[0], mBranch = monthGZ[1]
  const dStem = dayGZ[0], dBranch = dayGZ[1]
  const hStem = hourGZ[0], hBranch = hourGZ[1]

  function makePillar(stem: string, branch: string, dayStem: string): PillarData {
    const gz = stem + branch
    const hidden = HIDDEN_STEMS[branch] || []
    const gods = hidden.map(hs => ({ stem: hs, god: tenGod(dayStem, hs) }))
    // Add the main stem's ten god too
    return {
      stem,
      branch,
      element: STEM_ELEMENT[stem] || '',
      nayin: NAYIN[gz] || '',
      hiddenStems: hidden,
      tenGods: [{ stem, god: tenGod(dayStem, stem) }, ...gods],
    }
  }

  const yearPillar = makePillar(yStem, yBranch, dStem)
  const monthPillar = makePillar(mStem, mBranch, dStem)
  const dayPillar = makePillar(dStem, dBranch, dStem)
  const hourPillar = makePillar(hStem, hBranch, dStem)

  // Five elements count with weights
  const fiveElements = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 }
  const elMap: Record<string, keyof typeof fiveElements> = {
    '金': 'metal', '木': 'wood', '水': 'water', '火': 'fire', '土': 'earth'
  }

  // Count from stems (weight 1.0 each)
  for (const s of [yStem, mStem, dStem, hStem]) {
    const el = STEM_ELEMENT[s]
    if (el && elMap[el]) fiveElements[elMap[el]] += 1
  }

  // Count from hidden stems with weights
  for (const br of [yBranch, mBranch, dBranch, hBranch]) {
    const hidden = HIDDEN_STEMS[br] || []
    const weights = HIDDEN_STEM_WEIGHTS[br] || []
    for (let i = 0; i < hidden.length; i++) {
      const el = STEM_ELEMENT[hidden[i]]
      if (el && elMap[el]) fiveElements[elMap[el]] += weights[i] || 0.1
    }
  }

  // Round to 1 decimal
  for (const k of Object.keys(fiveElements) as (keyof typeof fiveElements)[]) {
    fiveElements[k] = Math.round(fiveElements[k] * 10) / 10
  }

  // Day Master strength analysis
  const dayElement = STEM_ELEMENT[dStem]
  const producesMe = PRODUCED_BY[dayElement] // element that produces day element
  const sameAsMe = dayElement

  let supportScore = 0
  let totalScore = 0

  // Check all stems and hidden stems
  const allStems: { stem: string; weight: number }[] = []
  // The 4 main stems (exclude day stem itself for total but include for support)
  for (const s of [yStem, mStem, hStem]) {
    allStems.push({ stem: s, weight: 1.0 })
  }
  // Hidden stems
  for (const br of [yBranch, mBranch, dBranch, hBranch]) {
    const hidden = HIDDEN_STEMS[br] || []
    const weights = HIDDEN_STEM_WEIGHTS[br] || []
    for (let i = 0; i < hidden.length; i++) {
      allStems.push({ stem: hidden[i], weight: weights[i] || 0.1 })
    }
  }

  for (const { stem, weight } of allStems) {
    totalScore += weight
    const el = STEM_ELEMENT[stem]
    if (el === sameAsMe || el === producesMe) {
      supportScore += weight
    }
  }

  const ratio = supportScore / totalScore
  let strength: 'strong' | 'weak' | 'neutral'
  let strengthLabel: string
  if (ratio > 0.5) { strength = 'strong'; strengthLabel = '身强' }
  else if (ratio < 0.35) { strength = 'weak'; strengthLabel = '身弱' }
  else { strength = 'neutral'; strengthLabel = '中和' }

  // Lucky/Avoid elements
  const luckyElements: string[] = []
  const avoidElements: string[] = []
  if (strength === 'weak') {
    luckyElements.push(sameAsMe, producesMe)
    avoidElements.push(KE_MAP[dayElement] ? dayElement : '', PRODUCES[dayElement])
  } else if (strength === 'strong') {
    luckyElements.push(PRODUCES[dayElement], KE_MAP[dayElement] || '')
    avoidElements.push(sameAsMe, producesMe)
  } else {
    luckyElements.push(sameAsMe)
  }

  // Shen Sha
  const shenSha = calculateShenSha(yBranch, dBranch, dStem, mBranch, hBranch)

  // Da Yun (大运) and Qi Yun (起运)
  const daYunDirection = getDaYunDirection(yStem, gender)
  const qiYunResult = calculateQiYun(year, month, day, solarHour, daYunDirection)
  const daYun = calculateDaYun(mStem, mBranch, daYunDirection, qiYunResult.startAge, year)
  const xiaoYun = calculateXiaoYun(hStem, hBranch, daYunDirection, qiYunResult.startAge, year)

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster: {
      stem: dStem,
      element: dayElement,
      yinYang: STEM_YINYANG[dStem],
    },
    fiveElements,
    strength,
    strengthLabel,
    luckyElements: luckyElements.filter(Boolean),
    avoidElements: avoidElements.filter(Boolean),
    shenSha,
    trueSolarTime: {
      originalTime: formatTime(standardDate),
      correctedTime: formatTime(correctedDate),
      correctionMinutes: Math.round(correctionMinutes * 10) / 10,
      longitude,
      shichen: actualBranch + '时',
      shichenChanged,
    },
    daYun,
    xiaoYun,
    qiYun: {
      direction: daYunDirection,
      startAge: qiYunResult.startAge,
      startAgeLabel: qiYunResult.startAgeLabel,
      startYear: qiYunResult.startYear,
      startMonth: qiYunResult.startMonth,
      nearestJieQi: qiYunResult.jieQiName,
      nearestJieQiDate: qiYunResult.jieQiDate,
      daysDiff: qiYunResult.daysDiff,
    },
  }
}
