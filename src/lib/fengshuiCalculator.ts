/**
 * 玄空飞星排盘计算器
 * Xuan Kong Flying Stars Feng Shui Calculator
 */

// ============ Types ============

export interface FlyingStarPalace {
  position: string       // N/NE/E/SE/S/SW/W/NW/Center
  positionZh: string     // 中文方位
  gua: string           // 八卦名
  baseStar: number      // 运盘星 (1-9)
  mountainStar: number  // 山星 (1-9)
  waterStar: number     // 向星 (1-9)
  element: string       // 该宫五行
}

export interface FlyingStarChart {
  period: number
  periodLabel: string
  facing: string
  sitting: string
  palaces: FlyingStarPalace[]
  grid: (FlyingStarPalace | null)[][]
  analysis: {
    wangShan: boolean
    wangXiang: boolean
    shuangWang: boolean
    shanShuiTong: boolean
    fuYin: boolean
    fanYin: boolean
  }
}

// ============ Constants ============

// Directions with their properties
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Center'] as const
type Direction = typeof DIRECTIONS[number]

interface DirectionInfo {
  position: string
  positionZh: string
  gua: string
  luoshuNum: number
  element: string
  yinYang: boolean // true=阳, false=阴 (地元龙)
}

const DIR_INFO: Record<string, DirectionInfo> = {
  N:      { position: 'N',      positionZh: '北',   gua: '坎', luoshuNum: 1, element: '水', yinYang: false }, // 子=阴
  NE:     { position: 'NE',     positionZh: '东北', gua: '艮', luoshuNum: 8, element: '土', yinYang: true  }, // 艮=阳
  E:      { position: 'E',      positionZh: '东',   gua: '震', luoshuNum: 3, element: '木', yinYang: false }, // 卯=阴
  SE:     { position: 'SE',     positionZh: '东南', gua: '巽', luoshuNum: 4, element: '木', yinYang: true  }, // 巽=阳
  S:      { position: 'S',      positionZh: '南',   gua: '离', luoshuNum: 9, element: '火', yinYang: false }, // 午=阴
  SW:     { position: 'SW',     positionZh: '西南', gua: '坤', luoshuNum: 2, element: '土', yinYang: true  }, // 坤=阳
  W:      { position: 'W',      positionZh: '西',   gua: '兑', luoshuNum: 7, element: '金', yinYang: false }, // 酉=阴
  NW:     { position: 'NW',     positionZh: '西北', gua: '乾', luoshuNum: 6, element: '金', yinYang: true  }, // 乾=阳
  Center: { position: 'Center', positionZh: '中宫', gua: '中', luoshuNum: 5, element: '土', yinYang: true  },
}

// Luoshu number -> direction
const NUM_TO_DIR: Record<number, string> = {
  1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 5: 'Center', 6: 'NW', 7: 'W', 8: 'NE', 9: 'S'
}

// Opposite directions
const OPPOSITE: Record<string, string> = {
  N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', SE: 'NW', NW: 'SE'
}

// Flying star trajectory (洛书飞布顺序) as directions
// Center → NW → W → NE → S → N → SW → E → SE
const FLY_ORDER: string[] = ['Center', 'NW', 'W', 'NE', 'S', 'N', 'SW', 'E', 'SE']

// Grid layout (3x3): row, col -> direction
// [SE=巽4] [S=离9]  [SW=坤2]
// [E=震3]  [Center]  [W=兑7]
// [NE=艮8] [N=坎1]  [NW=乾6]
const GRID_LAYOUT: string[][] = [
  ['SE', 'S', 'SW'],
  ['E', 'Center', 'W'],
  ['NE', 'N', 'NW'],
]

// Period ranges
const PERIOD_RANGES: [number, number, number][] = [
  [1, 1864, 1883], [2, 1884, 1903], [3, 1904, 1923],
  [4, 1924, 1943], [5, 1944, 1963], [6, 1964, 1983],
  [7, 1984, 2003], [8, 2004, 2023], [9, 2024, 2043],
]

const PERIOD_LABELS: Record<number, string> = {
  1: '一运(1864-1883)', 2: '二运(1884-1903)', 3: '三运(1904-1923)',
  4: '四运(1924-1943)', 5: '五运(1944-1963)', 6: '六运(1964-1983)',
  7: '七运(1984-2003)', 8: '八运(2004-2023)', 9: '九运(2024-2043)',
}

// Input direction parsing
const DIRECTION_MAP: Record<string, string> = {
  '坎': 'N', 'North': 'N', 'N': 'N', '北': 'N',
  '艮': 'NE', 'NE': 'NE', '东北': 'NE',
  '震': 'E', 'East': 'E', 'E': 'E', '东': 'E',
  '巽': 'SE', 'SE': 'SE', '东南': 'SE',
  '离': 'S', 'South': 'S', 'S': 'S', '南': 'S',
  '坤': 'SW', 'SW': 'SW', '西南': 'SW',
  '兑': 'W', 'West': 'W', 'W': 'W', '西': 'W',
  '乾': 'NW', 'NW': 'NW', '西北': 'NW',
}

// ============ Helper Functions ============

/** Wrap star number to 1-9 range */
function wrapStar(n: number): number {
  const m = ((n - 1) % 9 + 9) % 9 + 1
  return m
}

/** Get period from year */
export function yearToPeriod(year: number): number {
  // Extend cyclically: each cycle is 180 years starting from 1864
  const offset = year - 1864
  const cyclePos = ((offset % 180) + 180) % 180
  const period = Math.floor(cyclePos / 20) + 1
  return period
}

/** Parse facing direction string */
export function parseFacing(input: string): string {
  // Handle format like "坎/North", "离/South"
  const parts = input.split('/')
  for (const part of parts) {
    const trimmed = part.trim()
    if (DIRECTION_MAP[trimmed]) return DIRECTION_MAP[trimmed]
  }
  throw new Error(`Unknown direction: ${input}`)
}

/** Fly stars from center, returning map of direction -> star number */
function flyStars(centerStar: number, forward: boolean): Record<string, number> {
  const result: Record<string, number> = {}
  for (let i = 0; i < 9; i++) {
    const dir = FLY_ORDER[i]
    const star = forward
      ? wrapStar(centerStar + i)
      : wrapStar(centerStar - i)
    result[dir] = star
  }
  return result
}

/** Determine if flying should be forward (顺飞) or reverse (逆飞)
 * Rule: check the yin/yang of the sitting/facing direction's 地元龙.
 * Yang (阳) → forward fly (顺飞), Yin (阴) → reverse fly (逆飞)
 */
function isForwardFly(targetDir: string): boolean {
  return DIR_INFO[targetDir].yinYang
}

// ============ Main Calculator ============

export function calculateFlyingStars(options: {
  year?: number
  period?: number
  facing: string
}): FlyingStarChart {
  // Determine period
  const period = options.period ?? yearToPeriod(options.year ?? new Date().getFullYear())
  if (period < 1 || period > 9) throw new Error(`Invalid period: ${period}`)

  // Parse facing direction
  const facingDir = parseFacing(options.facing)
  const sittingDir = OPPOSITE[facingDir]

  // Step 1: Base plate (运盘) - period star enters center
  const basePlate = flyStars(period, true) // always forward

  // Step 2: Mountain star plate (山星盘)
  const mountainCenter = basePlate[sittingDir] // star at sitting position in base plate
  const mountainForward = isForwardFly(sittingDir)
  const mountainPlate = flyStars(mountainCenter, mountainForward)

  // Step 3: Water/facing star plate (向星盘)
  const waterCenter = basePlate[facingDir] // star at facing position in base plate
  const waterForward = isForwardFly(facingDir)
  const waterPlate = flyStars(waterCenter, waterForward)

  // Build palaces
  const palaces: FlyingStarPalace[] = DIRECTIONS.map(dir => ({
    position: DIR_INFO[dir].position,
    positionZh: DIR_INFO[dir].positionZh,
    gua: DIR_INFO[dir].gua,
    baseStar: basePlate[dir],
    mountainStar: mountainPlate[dir],
    waterStar: waterPlate[dir],
    element: DIR_INFO[dir].element,
  }))

  // Build grid
  const palaceMap = new Map(palaces.map(p => [p.position, p]))
  const grid = GRID_LAYOUT.map(row =>
    row.map(dir => palaceMap.get(dir) ?? null)
  )

  // Analysis
  const sittingPalace = palaceMap.get(sittingDir)!
  const facingPalace = palaceMap.get(facingDir)!

  const wangShan = sittingPalace.mountainStar === period
  const wangXiang = facingPalace.waterStar === period

  // 上山下水: mountain star = period at facing palace AND water star = period at sitting palace
  const shanShuiTong = facingPalace.mountainStar === period && sittingPalace.waterStar === period

  // 伏吟: mountain or water plate same as base plate for all positions
  const fuYin = palaces.every(p => p.mountainStar === p.baseStar) ||
                palaces.every(p => p.waterStar === p.baseStar)

  // 反吟: mountain or water star + base star = 10 for all positions (except center if special)
  const fanYin = palaces.filter(p => p.position !== 'Center').every(p => p.mountainStar + p.baseStar === 10) ||
                 palaces.filter(p => p.position !== 'Center').every(p => p.waterStar + p.baseStar === 10)

  return {
    period,
    periodLabel: PERIOD_LABELS[period],
    facing: `${DIR_INFO[facingDir].gua}/${facingDir}`,
    sitting: `${DIR_INFO[sittingDir].gua}/${sittingDir}`,
    palaces,
    grid,
    analysis: {
      wangShan,
      wangXiang,
      shuangWang: wangShan && wangXiang,
      shanShuiTong,
      fuYin,
      fanYin,
    },
  }
}
