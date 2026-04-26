/**
 * BaZi Calculator V2 — powered by tyme4ts
 *
 * Replaces the lunar-typescript-based v1 (baziCalculator.v1.ts).
 * Adds: 流年, 六冲/六合/六害/三刑, 人元司令分野, 胎元, 命宫/身宫.
 * Keeps: custom 神煞 (30+ stars), five elements strength, day master analysis, true solar time correction.
 */
import { SolarTime, SolarDay, LunarHour, Gender, ChildLimit, DecadeFortune, Fortune,
  DefaultEightCharProvider, LunarSect2EightCharProvider,
  DefaultChildLimitProvider, China95ChildLimitProvider,
  LunarSect1ChildLimitProvider, LunarSect2ChildLimitProvider,
  type EightCharProvider, type ChildLimitProvider,
  HeavenStem, EarthBranch, SixtyCycle, type HideHeavenStem,
} from 'tyme4ts'
import { cityLongitudes } from './cityLongitudes'
import { trueSolarTime, getTrueSolarTimeCorrection, getShichen, shichenNameToBranch } from './trueSolarTime'
import { getTimezoneOffset } from './dstDetection'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PillarData {
  stem: string
  branch: string
  element: string
  nayin: string
  hiddenStems: string[]
  tenGods: { stem: string; god: string }[]
  changSheng: string
  kongWang: string[]
  shenSha: { name: string; description: string }[]
}

export interface DaYunPillar {
  stem: string
  branch: string
  nayin: string
  startAge: number
  startYear: number
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
  startAge: number
  startAgeLabel: string
  startYear: number
  startMonth: number
  nearestJieQi: string
  nearestJieQiDate: string
  daysDiff: number
}

export interface LiuNianPillar {
  stem: string
  branch: string
  nayin: string
  age: number
  year: number
  tenGod: string
  isLucky: boolean | null
}

export interface BranchRelationships {
  clashes: { branch1: string; pillar1: string; branch2: string; pillar2: string }[]
  combines: { branch1: string; pillar1: string; branch2: string; pillar2: string; result: string }[]
  harms: { branch1: string; pillar1: string; branch2: string; pillar2: string }[]
  punishments: { branches: string[]; pillars: string[]; type: string }[]
  /**
   * 三合局 — three-branch alliances by element. e.g. 申子辰 → 水局.
   * `kind` distinguishes:
   *   - 'full'  全三合: all three branches present
   *   - 'half'  半三合: two of three including the cardinal (子/午/卯/酉)
   *   - 'gong'  拱合: two non-cardinal branches (e.g. 申辰), weakest form
   */
  triCombines: {
    branches: string[]
    pillars: string[]
    element: string
    kind: 'full' | 'half' | 'gong'
  }[]
  /**
   * 三會 (方局) — three-branch directional gatherings.
   * e.g. 寅卯辰 → 東方木. `kind` is 'full' (all three) or 'half' (two of three).
   */
  threeWayMeets: {
    branches: string[]
    pillars: string[]
    element: string
    direction: '東方' | '南方' | '西方' | '北方'
    kind: 'full' | 'half'
  }[]
}

/**
 * 截路空亡 — by day stem, certain hour branches are "blocked".
 * Affects the hour pillar's expression of timing-related signals.
 */
export interface JieLuInfo {
  jieLuBranches: string[]
  affectedPillars: string[]
  description: string
}

/**
 * Per-ten-god structural strength signals. The chart's overall day-master
 * `strength` is global (强/弱); these signals tell the LLM which specific
 * 十神 are well-rooted, transparent (透干), and in-season (月令), so it can
 * cite "正官有根透出且月令司令" instead of generic strong/weak claims.
 */
export interface TenGodStrength {
  god: string
  /** Appears as a main stem in any of the four pillars. */
  transparent: boolean
  /** Appears in any earthly branch's hidden stems → has 通根. */
  rooted: boolean
  /** This god is the 月令司令 (current human-element of month branch). */
  inSeason: boolean
  /** Total occurrences (main + hidden) across all four pillars. */
  count: number
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
  trueSolarTime?: {
    originalTime: string
    correctedTime: string
    correctionMinutes: number
    longitude: number
    shichen: string
    shichenChanged: boolean
    isDST?: boolean
    dstNote?: string
  }
  daYun: DaYunPillar[]
  xiaoYun: XiaoYunPillar[]
  qiYun: QiYunInfo
  liuNian?: LiuNianPillar[]
  branchRelationships?: BranchRelationships
  hideHeavenStemDay?: { stem: string; type: string }
  fetalOrigin?: string
  ownSign?: string
  bodySign?: string
  /** 截路空亡 — day-stem-driven hour-branch block; absent when not triggered. */
  jieLu?: JieLuInfo
  /** Per-ten-god structural-strength signals. Always populated. */
  tenGodStrength?: TenGodStrength[]
}

export interface BaziOptions {
  eightCharProvider?: 'default' | 'lunarSect2'
  childLimitProvider?: 'default' | 'china95' | 'lunarSect1' | 'lunarSect2'
  liuNianCount?: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

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
// Hidden stem weights: 本气main qi, 中气middle qi, 余气residual qi
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

// Five elements production cycle: 木→火→土→金→水→木
const PRODUCES: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
const PRODUCED_BY: Record<string, string> = { '火': '木', '土': '火', '金': '土', '水': '金', '木': '水' }
const KE_MAP: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  if (KE_MAP[dayEl] === otherEl) return samePolarity ? '偏财' : '正财'
  if (KE_MAP[otherEl] === dayEl) return samePolarity ? '七杀' : '正官'
  return '比肩'
}

function isKe(a: string, b: string): boolean { return KE_MAP[a] === b }

function formatTime(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getEightCharProvider(name: string): EightCharProvider {
  switch (name) {
    case 'lunarSect2': return new LunarSect2EightCharProvider()
    default: return new DefaultEightCharProvider()
  }
}

function getChildLimitProvider(name: string): ChildLimitProvider {
  switch (name) {
    case 'china95': return new China95ChildLimitProvider()
    case 'lunarSect1': return new LunarSect1ChildLimitProvider()
    case 'lunarSect2': return new LunarSect2ChildLimitProvider()
    default: return new DefaultChildLimitProvider()
  }
}

// ─── Main Calculator ────────────────────────────────────────────────────────

export function calculateBazi(
  birthDate: string,
  birthTime: string,
  birthPlace: string,
  gender: 'male' | 'female',
  exactTime?: string,
  birthLng?: number | null,
  birthLat?: number | null,
  options?: BaziOptions,
): BaziChart {
  const opts: Required<BaziOptions> = {
    eightCharProvider: options?.eightCharProvider ?? 'default',
    childLimitProvider: options?.childLimitProvider ?? 'default',
    liuNianCount: options?.liuNianCount ?? 80,
  }

  // Configure tyme4ts providers
  LunarHour.provider = getEightCharProvider(opts.eightCharProvider)
  ChildLimit.provider = getChildLimitProvider(opts.childLimitProvider)

  // Resolve longitude
  const cityInfo = cityLongitudes[birthPlace]
  const longitude = birthLng ?? cityInfo?.lng ?? 120.0

  // Parse birth date
  const [year, month, day] = birthDate.split('-').map(Number)

  // Detect timezone and DST
  const parsedHour = exactTime ? parseInt(exactTime.split(':')[0]) : 12
  const tzResult = getTimezoneOffset(year, month, day, parsedHour, longitude, birthLat)
  const timezone = tzResult.offset

  // Map branch to hour
  const branchToHour: Record<string, number> = {
    '子': 0, '丑': 2, '寅': 4, '卯': 6, '辰': 8, '巳': 10,
    '午': 12, '未': 14, '申': 16, '酉': 18, '戌': 20, '亥': 22,
  }

  let actualBranch: string
  let solarHour: number
  let solarMinute = 0
  let trueSolarTimeInfo: BaziChart['trueSolarTime'] | undefined
  let addOneDay = false

  if (exactTime) {
    const [exactHour, exactMinute] = exactTime.split(':').map(Number)

    // DST adjustment
    let adjustedHour = exactHour
    let adjustedDay = day
    let adjustedMonth = month
    let adjustedYear = year
    if (tzResult.isDST) {
      adjustedHour -= 1
      if (adjustedHour < 0) {
        adjustedHour += 24
        const prevDate = new Date(year, month - 1, day - 1)
        adjustedYear = prevDate.getFullYear()
        adjustedMonth = prevDate.getMonth() + 1
        adjustedDay = prevDate.getDate()
      }
    }

    const standardDate = new Date(adjustedYear, adjustedMonth - 1, adjustedDay, adjustedHour, exactMinute, 0)
    const correctionMinutes = getTrueSolarTimeCorrection(standardDate, longitude, tzResult.isDST ? timezone - 1 : timezone)
    const correctedDate = trueSolarTime(standardDate, longitude, tzResult.isDST ? timezone - 1 : timezone)
    const correctedShichen = getShichen(correctedDate)
    const originalDate = new Date(year, month - 1, day, exactHour, exactMinute, 0)
    const originalShichen = getShichen(originalDate)
    const shichenChanged = correctedShichen.branch !== originalShichen.branch

    const correctedHour = correctedDate.getHours()
    if (correctedHour >= 23) {
      addOneDay = true
    }

    actualBranch = correctedShichen.branch
    solarHour = correctedDate.getHours()
    solarMinute = correctedDate.getMinutes()

    trueSolarTimeInfo = {
      originalTime: formatTime(originalDate),
      correctedTime: formatTime(correctedDate),
      correctionMinutes: Math.round(correctionMinutes * 10) / 10,
      longitude,
      shichen: actualBranch + '时',
      shichenChanged,
      isDST: tzResult.isDST,
      dstNote: tzResult.dstNote,
    }
  } else {
    if (birthTime === 'zi_early') {
      actualBranch = '子'
      solarHour = 0
    } else if (birthTime === 'zi_late') {
      addOneDay = true
      actualBranch = '子'
      solarHour = 0
    } else {
      const branch = shichenNameToBranch(birthTime)
      actualBranch = branch
      solarHour = branchToHour[actualBranch] ?? 12
    }
  }

  // Apply day adjustment for late zi hour
  const adjustedDate = addOneDay
    ? new Date(year, month - 1, day + 1)
    : new Date(year, month - 1, day)
  const finalYear = adjustedDate.getFullYear()
  const finalMonth = adjustedDate.getMonth() + 1
  const finalDay = adjustedDate.getDate()

  // ─── tyme4ts: Get EightChar ──────────────────────────────────────────
  const solarTime = SolarTime.fromYmdHms(finalYear, finalMonth, finalDay, solarHour, solarMinute, 0)
  const lunarHour = solarTime.getLunarHour()
  const eightChar = lunarHour.getEightChar()

  const yearSC = eightChar.getYear()
  const monthSC = eightChar.getMonth()
  const daySC = eightChar.getDay()
  const hourSC = eightChar.getHour()

  const yStem = yearSC.getHeavenStem().getName()
  const yBranch = yearSC.getEarthBranch().getName()
  const mStem = monthSC.getHeavenStem().getName()
  const mBranch = monthSC.getEarthBranch().getName()
  const dStem = daySC.getHeavenStem().getName()
  const dBranch = daySC.getEarthBranch().getName()
  const hStem = hourSC.getHeavenStem().getName()
  const hBranch = hourSC.getEarthBranch().getName()

  // ─── Shen Sha (custom, kept from v1) ─────────────────────────────────
  const shenShaPerPillar = calculateShenShaPerPillar(
    yStem, yBranch, mStem, mBranch, dStem, dBranch, hStem, hBranch
  )

  // ─── Build pillars ───────────────────────────────────────────────────
  const dayStemObj = daySC.getHeavenStem()

  function makePillar(sc: SixtyCycle, pillarKey: 'year' | 'month' | 'day' | 'hour'): PillarData {
    const stem = sc.getHeavenStem().getName()
    const branch = sc.getEarthBranch().getName()
    const hidden = HIDDEN_STEMS[branch] || []
    const gods = hidden.map(hs => ({ stem: hs, god: tenGod(dStem, hs) }))
    // Ten gods from tyme4ts for the main stem
    const mainTenGod = dayStemObj.getTenStar(sc.getHeavenStem()).getName()
    // Chang Sheng from tyme4ts
    const terrain = dayStemObj.getTerrain(sc.getEarthBranch()).getName()
    // Kong Wang from tyme4ts
    const ten = sc.getTen()
    const extraBranches = sc.getExtraEarthBranches()
    const kongWang = extraBranches.map(eb => eb.getName())

    return {
      stem,
      branch,
      element: STEM_ELEMENT[stem] || '',
      nayin: sc.getSound().getName(),
      hiddenStems: hidden,
      tenGods: [{ stem, god: mainTenGod }, ...gods],
      changSheng: terrain,
      kongWang,
      shenSha: shenShaPerPillar[pillarKey],
    }
  }

  const yearPillar = makePillar(yearSC, 'year')
  const monthPillar = makePillar(monthSC, 'month')
  const dayPillar = makePillar(daySC, 'day')
  const hourPillar = makePillar(hourSC, 'hour')

  // ─── Five elements count with weights ────────────────────────────────
  const fiveElements = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 }
  const elMap: Record<string, keyof typeof fiveElements> = {
    '金': 'metal', '木': 'wood', '水': 'water', '火': 'fire', '土': 'earth'
  }

  for (const s of [yStem, mStem, dStem, hStem]) {
    const el = STEM_ELEMENT[s]
    if (el && elMap[el]) fiveElements[elMap[el]] += 1
  }
  for (const br of [yBranch, mBranch, dBranch, hBranch]) {
    const hidden = HIDDEN_STEMS[br] || []
    const weights = HIDDEN_STEM_WEIGHTS[br] || []
    for (let i = 0; i < hidden.length; i++) {
      const el = STEM_ELEMENT[hidden[i]]
      if (el && elMap[el]) fiveElements[elMap[el]] += weights[i] || 0.1
    }
  }
  for (const k of Object.keys(fiveElements) as (keyof typeof fiveElements)[]) {
    fiveElements[k] = Math.round(fiveElements[k] * 10) / 10
  }

  // ─── Day Master strength ─────────────────────────────────────────────
  const dayElement = STEM_ELEMENT[dStem]
  const producesMe = PRODUCED_BY[dayElement]
  const sameAsMe = dayElement

  let supportScore = 0
  let totalScore = 0
  const allStemsWeighted: { stem: string; weight: number }[] = []
  for (const s of [yStem, mStem, hStem]) {
    allStemsWeighted.push({ stem: s, weight: 1.0 })
  }
  for (const br of [yBranch, mBranch, dBranch, hBranch]) {
    const hidden = HIDDEN_STEMS[br] || []
    const weights = HIDDEN_STEM_WEIGHTS[br] || []
    for (let i = 0; i < hidden.length; i++) {
      allStemsWeighted.push({ stem: hidden[i], weight: weights[i] || 0.1 })
    }
  }
  for (const { stem, weight } of allStemsWeighted) {
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

  // ─── tyme4ts: ChildLimit / Da Yun / Xiao Yun / Liu Nian ─────────────
  const tymeGender = gender === 'male' ? Gender.MAN : Gender.WOMAN
  const childLimit = ChildLimit.fromSolarTime(solarTime, tymeGender)
  const isForward = childLimit.isForward()
  const daYunDirection: '顺排' | '逆排' = isForward ? '顺排' : '逆排'

  // Qi Yun info
  const qiYunYears = childLimit.getYearCount()
  const qiYunMonths = childLimit.getMonthCount()
  const qiYunDays = childLimit.getDayCount()
  const startAge = qiYunYears + qiYunMonths / 12
  let startAgeLabel = `${qiYunYears}歲`
  if (qiYunMonths > 0) startAgeLabel += `${qiYunMonths}個月`
  const startTime = childLimit.getStartTime()
  const qiYunStartYear = startTime.getYear()
  const qiYunStartMonth = startTime.getMonth()

  // Get nearest jie qi info from the start/end times
  const birthSolarDay = SolarDay.fromYmd(finalYear, finalMonth, finalDay)
  const termDay = birthSolarDay.getTermDay()
  const nearestJieQiName = termDay.toString()
  const daysDiff = Math.round((qiYunYears * 365 + qiYunMonths * 30 + qiYunDays) / 3 * 10) / 10

  const qiYun: QiYunInfo = {
    direction: daYunDirection,
    startAge,
    startAgeLabel,
    startYear: qiYunStartYear,
    startMonth: qiYunStartMonth,
    nearestJieQi: nearestJieQiName,
    nearestJieQiDate: `${startTime.getYear()}-${String(startTime.getMonth()).padStart(2, '0')}-${String(startTime.getDay()).padStart(2, '0')}`,
    daysDiff,
  }

  // Da Yun (8 ten-year periods)
  const daYun: DaYunPillar[] = []
  for (let i = 0; i < 8; i++) {
    const df = DecadeFortune.fromChildLimit(childLimit, i)
    const sc = df.getSixtyCycle()
    daYun.push({
      stem: sc.getHeavenStem().getName(),
      branch: sc.getEarthBranch().getName(),
      nayin: sc.getSound().getName(),
      startAge: df.getStartAge(),
      startYear: year + df.getStartAge(),
      endAge: df.getEndAge(),
      endYear: year + df.getEndAge(),
    })
  }

  // Xiao Yun (before qi yun starts)
  const xiaoYun: XiaoYunPillar[] = []
  const maxXiaoYunAge = Math.floor(startAge)
  for (let i = 0; i < Math.max(maxXiaoYunAge, 1); i++) {
    const f = Fortune.fromChildLimit(childLimit, i)
    const sc = f.getSixtyCycle()
    xiaoYun.push({
      stem: sc.getHeavenStem().getName(),
      branch: sc.getEarthBranch().getName(),
      age: f.getAge(),
      year: year + f.getAge(),
    })
  }

  // Liu Nian (流年) — annual fortune pillars across Da Yun range
  const liuNian: LiuNianPillar[] = []
  const luckySet = new Set(luckyElements.filter(Boolean))
  const avoidSet = new Set(avoidElements.filter(Boolean))
  const totalLiuNianCount = Math.min(opts.liuNianCount, 80)
  for (let i = 0; i < totalLiuNianCount; i++) {
    const f = Fortune.fromChildLimit(childLimit, i)
    const sc = f.getSixtyCycle()
    const stemName = sc.getHeavenStem().getName()
    const branchName = sc.getEarthBranch().getName()
    const stemElement = STEM_ELEMENT[stemName]
    let isLucky: boolean | null = null
    if (luckySet.has(stemElement)) isLucky = true
    else if (avoidSet.has(stemElement)) isLucky = false

    liuNian.push({
      stem: stemName,
      branch: branchName,
      nayin: sc.getSound().getName(),
      age: f.getAge(),
      year: year + f.getAge(),
      tenGod: tenGod(dStem, stemName),
      isLucky,
    })
  }

  // ─── Branch relationships (六冲/六合/六害/三刑/三合/三會) ───────────
  const branchRelationships = calculateBranchRelationships(yBranch, mBranch, dBranch, hBranch)

  // ─── 截路空亡 ─────────────────────────────────────────────────────────
  const jieLu = calculateJieLu(
    dStem,
    [yBranch, mBranch, dBranch, hBranch],
    ['year', 'month', 'day', 'hour'],
  )

  // ─── 人元司令分野 ─────────────────────────────────────────────────────
  let hideHeavenStemDay: BaziChart['hideHeavenStemDay'] | undefined
  try {
    const solarDay = SolarDay.fromYmd(finalYear, finalMonth, finalDay)
    const hhsd = solarDay.getHideHeavenStemDay()
    const hhs = hhsd.getHideHeavenStem()
    const typeNames = ['余气', '中气', '正气']
    hideHeavenStemDay = {
      stem: hhs.getHeavenStem().getName(),
      type: typeNames[hhs.getType()] || '正气',
    }
  } catch {
    // fallback: leave undefined
  }

  // ─── 十神結構強度（透干 / 通根 / 月令司令）──────────────────────────
  const tenGodStrength = calculateTenGodStrength(
    dStem,
    [
      { stem: yStem, branch: yBranch },
      { stem: mStem, branch: mBranch },
      { stem: dStem, branch: dBranch },
      { stem: hStem, branch: hBranch },
    ],
    hideHeavenStemDay?.stem ?? null,
  )

  // ─── 胎元 / 命宫 / 身宫 ──────────────────────────────────────────────
  let fetalOrigin: string | undefined
  let ownSign: string | undefined
  let bodySign: string | undefined
  try {
    const fo = eightChar.getFetalOrigin()
    fetalOrigin = fo.getName()
    const os = eightChar.getOwnSign()
    ownSign = os.getName()
    const bs = eightChar.getBodySign()
    bodySign = bs.getName()
  } catch {
    // fallback: leave undefined
  }

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
    trueSolarTime: trueSolarTimeInfo,
    daYun,
    xiaoYun,
    qiYun,
    liuNian,
    branchRelationships,
    hideHeavenStemDay,
    fetalOrigin,
    ownSign,
    bodySign,
    jieLu,
    tenGodStrength,
  }
}

// ─── Branch Relationships ───────────────────────────────────────────────────

function calculateBranchRelationships(
  yBranch: string, mBranch: string, dBranch: string, hBranch: string
): BranchRelationships {
  const pillarKeys = ['year', 'month', 'day', 'hour'] as const
  const branches = [yBranch, mBranch, dBranch, hBranch]

  const clashes: BranchRelationships['clashes'] = []
  const combines: BranchRelationships['combines'] = []
  const harms: BranchRelationships['harms'] = []
  const punishments: BranchRelationships['punishments'] = []

  // Check all pairs for 冲/合/害
  for (let i = 0; i < 4; i++) {
    const eb1 = EarthBranch.fromName(branches[i])
    for (let j = i + 1; j < 4; j++) {
      const eb2 = EarthBranch.fromName(branches[j])

      // 六冲: opposite branches
      if (eb1.getOpposite().getName() === branches[j]) {
        clashes.push({
          branch1: branches[i], pillar1: pillarKeys[i],
          branch2: branches[j], pillar2: pillarKeys[j],
        })
      }

      // 六合: combining branches
      const combineResult = eb1.combine(eb2)
      if (combineResult) {
        combines.push({
          branch1: branches[i], pillar1: pillarKeys[i],
          branch2: branches[j], pillar2: pillarKeys[j],
          result: combineResult.getName(),
        })
      }

      // 六害
      if (eb1.getHarm().getName() === branches[j]) {
        harms.push({
          branch1: branches[i], pillar1: pillarKeys[i],
          branch2: branches[j], pillar2: pillarKeys[j],
        })
      }
    }
  }

  // 三刑 (custom lookup — tyme4ts doesn't provide this)
  const PUNISHMENTS: { branches: string[]; type: string }[] = [
    { branches: ['寅', '巳', '申'], type: '无恩之刑（权力斗争）' },
    { branches: ['丑', '戌', '未'], type: '恃势之刑（亲人反目）' },
    { branches: ['子', '卯'], type: '无礼之刑（关系破裂）' },
  ]
  const branchSet = new Set(branches)
  for (const p of PUNISHMENTS) {
    const matching = p.branches.filter(b => branchSet.has(b))
    if (matching.length >= 2) {
      const matchingPillars = matching.map(b => pillarKeys[branches.indexOf(b)])
      punishments.push({
        branches: matching,
        pillars: matchingPillars,
        type: p.type,
      })
    }
  }

  // 自刑: 辰辰, 午午, 酉酉, 亥亥
  const SELF_PUNISH = ['辰', '午', '酉', '亥']
  for (const sp of SELF_PUNISH) {
    const indices = branches.reduce<number[]>((acc, b, i) => b === sp ? [...acc, i] : acc, [])
    if (indices.length >= 2) {
      punishments.push({
        branches: indices.map(() => sp),
        pillars: indices.map(i => pillarKeys[i]),
        type: '自刑',
      })
    }
  }

  // ─── 三合局 (san he) ──────────────────────────────────────────────
  // Each formation centers on a cardinal branch (子/午/卯/酉). When all
  // three present → 全三合; cardinal + one non-cardinal → 半三合; both
  // non-cardinals only → 拱合 (weakest).
  const SAN_HE: { branches: string[]; cardinal: string; element: string }[] = [
    { branches: ['申', '子', '辰'], cardinal: '子', element: '水' },
    { branches: ['亥', '卯', '未'], cardinal: '卯', element: '木' },
    { branches: ['寅', '午', '戌'], cardinal: '午', element: '火' },
    { branches: ['巳', '酉', '丑'], cardinal: '酉', element: '金' },
  ]
  const triCombines: BranchRelationships['triCombines'] = []
  for (const sh of SAN_HE) {
    const matched = sh.branches.filter((b) => branchSet.has(b))
    if (matched.length === 0) continue
    const pillars = matched.map((b) => pillarKeys[branches.indexOf(b)])
    if (matched.length === 3) {
      triCombines.push({ branches: matched, pillars, element: sh.element, kind: 'full' })
    } else if (matched.length === 2) {
      const hasCardinal = matched.includes(sh.cardinal)
      triCombines.push({
        branches: matched,
        pillars,
        element: sh.element,
        kind: hasCardinal ? 'half' : 'gong',
      })
    }
  }

  // ─── 三會 (方局) ──────────────────────────────────────────────────
  const SAN_HUI: {
    branches: string[]
    direction: '東方' | '南方' | '西方' | '北方'
    element: string
  }[] = [
    { branches: ['寅', '卯', '辰'], direction: '東方', element: '木' },
    { branches: ['巳', '午', '未'], direction: '南方', element: '火' },
    { branches: ['申', '酉', '戌'], direction: '西方', element: '金' },
    { branches: ['亥', '子', '丑'], direction: '北方', element: '水' },
  ]
  const threeWayMeets: BranchRelationships['threeWayMeets'] = []
  for (const dir of SAN_HUI) {
    const matched = dir.branches.filter((b) => branchSet.has(b))
    if (matched.length < 2) continue
    const pillars = matched.map((b) => pillarKeys[branches.indexOf(b)])
    threeWayMeets.push({
      branches: matched,
      pillars,
      element: dir.element,
      direction: dir.direction,
      kind: matched.length === 3 ? 'full' : 'half',
    })
  }

  return { clashes, combines, harms, punishments, triCombines, threeWayMeets }
}

// ─── 截路空亡 by day stem ─────────────────────────────────────────────
// Classical pairing — day stem determines two hour branches that are blocked.
const JIE_LU_BY_DAY_STEM: Record<string, string[]> = {
  '甲': ['申', '酉'], '己': ['申', '酉'],
  '乙': ['午', '未'], '庚': ['午', '未'],
  '丙': ['辰', '巳'], '辛': ['辰', '巳'],
  '丁': ['寅', '卯'], '壬': ['寅', '卯'],
  '戊': ['子', '丑'], '癸': ['子', '丑'],
}

function calculateJieLu(
  dStem: string,
  branches: string[],
  pillarKeys: ('year' | 'month' | 'day' | 'hour')[],
): JieLuInfo | undefined {
  const blocked = JIE_LU_BY_DAY_STEM[dStem]
  if (!blocked) return undefined
  const affectedPillars: string[] = []
  for (let i = 0; i < branches.length; i++) {
    if (blocked.includes(branches[i])) affectedPillars.push(pillarKeys[i])
  }
  if (affectedPillars.length === 0) return undefined
  return {
    jieLuBranches: blocked,
    affectedPillars,
    description: `日干${dStem}見${blocked.join('、')}為截路空亡，相關柱位的時機表達受阻`,
  }
}

// ─── 十神結構強度（透干 / 通根 / 月令司令）──────────────────────────
const ALL_TEN_GODS = ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印']

function calculateTenGodStrength(
  dStem: string,
  pillars: { stem: string; branch: string }[],
  monthHumanElementStem: string | null,
): TenGodStrength[] {
  // Count main + hidden occurrences of each ten god.
  const counts = new Map<string, number>()
  const transparentSet = new Set<string>()
  const rootedSet = new Set<string>()

  for (const p of pillars) {
    const mainGod = tenGod(dStem, p.stem)
    counts.set(mainGod, (counts.get(mainGod) ?? 0) + 1)
    transparentSet.add(mainGod)
    const hidden = HIDDEN_STEMS[p.branch] || []
    for (const hs of hidden) {
      const g = tenGod(dStem, hs)
      counts.set(g, (counts.get(g) ?? 0) + 1)
      rootedSet.add(g)
    }
  }

  const inSeasonGod = monthHumanElementStem ? tenGod(dStem, monthHumanElementStem) : null

  return ALL_TEN_GODS.map((god) => ({
    god,
    transparent: transparentSet.has(god),
    rooted: rootedSet.has(god),
    inSeason: god === inSeasonGod,
    count: counts.get(god) ?? 0,
  })).filter((s) => s.count > 0 || s.inSeason)
}

// ─── Shen Sha (kept from v1) ────────────────────────────────────────────────

function calculateShenShaPerPillar(
  yearStem: string, yearBranch: string,
  monthStem: string, monthBranch: string,
  dayStem: string, dayBranch: string,
  hourStem: string, hourBranch: string
): Record<'year' | 'month' | 'day' | 'hour', { name: string; description: string }[]> {
  const result: Record<'year' | 'month' | 'day' | 'hour', { name: string; description: string }[]> = {
    year: [], month: [], day: [], hour: [],
  }
  const pillarKeys: ('year' | 'month' | 'day' | 'hour')[] = ['year', 'month', 'day', 'hour']
  const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch]
  const allStems = [yearStem, monthStem, dayStem, hourStem]

  function addToPillar(branch: string, sha: { name: string; description: string }) {
    for (let i = 0; i < 4; i++) {
      if (allBranches[i] === branch) {
        result[pillarKeys[i]].push(sha)
      }
    }
  }
  function addToPillarByStem(stem: string, sha: { name: string; description: string }) {
    for (let i = 0; i < 4; i++) {
      if (allStems[i] === stem) {
        result[pillarKeys[i]].push(sha)
      }
    }
  }

  // 天乙贵人
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
      addToPillar(b, { name: '天乙贵人', description: '逢凶化吉，贵人相助' })
    }
  }

  // 文昌贵人
  const wenchangMap: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
    '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
  }
  const wc = wenchangMap[dayStem]
  if (wc) addToPillar(wc, { name: '文昌贵人', description: '聪明好学，利于考试功名' })

  // 太极贵人
  const taijiMap: Record<string, string[]> = {
    '甲': ['子','午'], '乙': ['子','午'],
    '丙': ['卯','酉'], '丁': ['卯','酉'],
    '戊': ['辰','戌','丑','未'], '己': ['辰','戌','丑','未'],
    '庚': ['寅','亥'], '辛': ['寅','亥'],
    '壬': ['巳','申'], '癸': ['巳','申'],
  }
  for (const b of allBranches) {
    if ((taijiMap[dayStem] || []).includes(b)) {
      addToPillar(b, { name: '太极贵人', description: '近道修行，聪明好学' })
    }
  }

  // 天厨贵人
  const tianchuMap: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
  }
  const tc = tianchuMap[dayStem]
  if (tc) {
    for (const b of allBranches) {
      if (b === tc) addToPillar(b, { name: '天厨贵人', description: '食禄丰厚，衣食无忧' })
    }
  }

  // 国印贵人
  const guoyinMap: Record<string, string> = {
    '寅': '戌', '卯': '亥', '辰': '子', '巳': '丑',
    '午': '寅', '未': '卯', '申': '辰', '酉': '巳',
    '戌': '午', '亥': '未', '子': '申', '丑': '酉',
  }
  const gy = guoyinMap[yearBranch]
  if (gy) addToPillar(gy, { name: '国印贵人', description: '掌权印信，利于仕途' })

  // 德秀贵人
  const dexiuMap: Record<string, string[]> = {
    '寅': ['丙','丁'], '卯': ['丙','丁'], '辰': ['戊','癸'],
    '巳': ['庚','辛'], '午': ['庚','辛'], '未': ['壬','癸'],
    '申': ['壬','癸'], '酉': ['甲','乙'], '戌': ['甲','乙'],
    '亥': ['甲','乙'], '子': ['丙','丁'], '丑': ['戊','己'],
  }
  if ((dexiuMap[monthBranch] || []).includes(dayStem)) {
    result.day.push({ name: '德秀贵人', description: '秀气端庄，聪慧有德' })
  }

  // 天德合
  const tiandeheMap: Record<string, string> = {
    '寅': '壬', '卯': '癸', '辰': '丁', '巳': '丙',
    '午': '甲', '未': '己', '申': '戊', '酉': '辛',
    '戌': '辛', '亥': '庚', '子': '庚', '丑': '乙',
  }
  const tdh = tiandeheMap[monthBranch]
  if (tdh) addToPillarByStem(tdh, { name: '天德合', description: '天德合，化灾解厄' })

  // 月德合
  const yuedeheMap: Record<string, string> = {
    '寅': '辛', '午': '辛', '戌': '辛',
    '申': '丁', '子': '丁', '辰': '丁',
    '巳': '乙', '酉': '乙', '丑': '乙',
    '亥': '己', '卯': '己', '未': '己',
  }
  const ydh = yuedeheMap[monthBranch]
  if (ydh) addToPillarByStem(ydh, { name: '月德合', description: '月德合，贵人扶助' })

  // 驿马
  const yimaMap: Record<string, string> = {
    '寅': '申', '午': '申', '戌': '申',
    '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
  }
  const yima = yimaMap[yearBranch]
  if (yima) addToPillar(yima, { name: '驿马', description: '主奔波劳碌，利于出行变动' })

  // 桃花
  const taohuaMap: Record<string, string> = {
    '寅': '卯', '午': '卯', '戌': '卯',
    '申': '酉', '子': '酉', '辰': '酉',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子',
  }
  const taohua = taohuaMap[yearBranch]
  if (taohua) addToPillar(taohua, { name: '桃花', description: '人缘好，异性缘佳' })

  // 华盖
  const huagaiMap: Record<string, string> = {
    '寅': '戌', '午': '戌', '戌': '戌',
    '申': '辰', '子': '辰', '辰': '辰',
    '巳': '丑', '酉': '丑', '丑': '丑',
    '亥': '未', '卯': '未', '未': '未',
  }
  const huagai = huagaiMap[yearBranch]
  if (huagai) addToPillar(huagai, { name: '华盖', description: '聪慧孤高，利于艺术宗教' })

  // 将星
  const jiangxingMap: Record<string, string> = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
  }
  const jx = jiangxingMap[yearBranch]
  if (jx) addToPillar(jx, { name: '将星', description: '有领导才能，权威之象' })

  // 劫煞
  const jieshaMap: Record<string, string> = {
    '寅': '亥', '午': '亥', '戌': '亥',
    '申': '巳', '子': '巳', '辰': '巳',
    '巳': '寅', '酉': '寅', '丑': '寅',
    '亥': '申', '卯': '申', '未': '申',
  }
  const js = jieshaMap[yearBranch]
  if (js) addToPillar(js, { name: '劫煞', description: '主劫难波折，需小心防范' })

  // 亡神
  const wangshenMap: Record<string, string> = {
    '寅': '巳', '午': '巳', '戌': '巳',
    '申': '亥', '子': '亥', '辰': '亥',
    '巳': '申', '酉': '申', '丑': '申',
    '亥': '寅', '卯': '寅', '未': '寅',
  }
  const ws = wangshenMap[yearBranch]
  if (ws) addToPillar(ws, { name: '亡神', description: '主精神不安，需注意心态调整' })

  // 天德
  const tiandeMap: Record<string, string> = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
    '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
    '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
  }
  const td = tiandeMap[monthBranch]
  if (td) {
    if ((STEMS as readonly string[]).includes(td)) {
      addToPillarByStem(td, { name: '天德', description: '逢凶化吉，福德深厚' })
    } else {
      addToPillar(td, { name: '天德', description: '逢凶化吉，福德深厚' })
    }
  }

  // 月德
  const yuedeMap: Record<string, string> = {
    '寅': '丙', '午': '丙', '戌': '丙',
    '申': '壬', '子': '壬', '辰': '壬',
    '巳': '庚', '酉': '庚', '丑': '庚',
    '亥': '甲', '卯': '甲', '未': '甲',
  }
  const yd = yuedeMap[monthBranch]
  if (yd) addToPillarByStem(yd, { name: '月德', description: '品德高尚，遇难呈祥' })

  // 飞刃
  const feirenMap: Record<string, string> = {
    '甲': '酉', '丙': '子', '戊': '子', '庚': '卯', '壬': '午',
  }
  const fr = feirenMap[dayStem]
  if (fr) addToPillar(fr, { name: '飞刃', description: '性刚好胜，防意外伤害' })

  // 羊刃
  const yangrenMap: Record<string, string> = {
    '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子',
    '乙': '寅', '丁': '巳', '己': '巳', '辛': '申', '癸': '亥',
  }
  const yr = yangrenMap[dayStem]
  if (yr) addToPillar(yr, { name: '羊刃', description: '刚烈好胜，防血光之灾' })

  // 禄神
  const lushenMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
  }
  const ls = lushenMap[dayStem]
  if (ls) addToPillar(ls, { name: '禄神', description: '自带衣食之禄' })

  // 阴差阳错
  const yinchaDay: Record<string, string[]> = {
    '丙': ['子','午'], '丁': ['丑','未'], '戊': ['寅','申'],
    '辛': ['卯','酉'], '壬': ['辰','戌'], '癸': ['巳','亥'],
  }
  if (yinchaDay[dayStem] && yinchaDay[dayStem].includes(dayBranch)) {
    result.day.push({ name: '阴差阳错', description: '婚姻感情需注意，防错配' })
  }

  // 九丑日
  const jiuchouDays = ['壬子','壬午','戊午','戊子','己酉','己卯','乙酉','乙卯','辛酉','辛卯']
  if (jiuchouDays.includes(dayStem + dayBranch)) {
    result.day.push({ name: '九丑日', description: '桃花纠纷，感情宜谨慎' })
  }

  // 八专日
  const bazhuanDays = ['甲寅','乙卯','己未','丁未','庚申','辛酉','壬子','癸亥']
  if (bazhuanDays.includes(dayStem + dayBranch)) {
    result.day.push({ name: '八专日', description: '夫妻之道需经营' })
  }

  // 红艳煞
  const hongyanMap: Record<string, string> = {
    '甲': '午', '乙': '午', '丙': '寅', '丁': '未',
    '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉',
    '壬': '子', '癸': '申',
  }
  const hy = hongyanMap[dayStem]
  if (hy) addToPillar(hy, { name: '红艳煞', description: '异性缘重，感情丰富' })

  // 灾煞
  const zaishaMap: Record<string, string> = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
  }
  const zs = zaishaMap[yearBranch]
  if (zs) addToPillar(zs, { name: '灾煞', description: '注意灾祸，宜防范' })

  // 吊客
  const diaokeMap: Record<string, string> = {
    '子': '戌', '丑': '亥', '寅': '子', '卯': '丑',
    '辰': '寅', '巳': '卯', '午': '辰', '未': '巳',
    '申': '午', '酉': '未', '戌': '申', '亥': '酉',
  }
  const dk = diaokeMap[yearBranch]
  if (dk) addToPillar(dk, { name: '吊客', description: '主孝服丧事之事' })

  // 天医
  const tianyiMedMap: Record<string, string> = {
    '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰',
    '午': '巳', '未': '午', '申': '未', '酉': '申',
    '戌': '酉', '亥': '戌', '子': '亥', '丑': '子',
  }
  const tym = tianyiMedMap[monthBranch]
  if (tym) addToPillar(tym, { name: '天医', description: '利于从医或养生' })

  return result
}
