/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error taobi has no type definitions
import TaobiModule from 'taobi'

const { TheArtOfBecomingInvisible } = TaobiModule

const DOOR_ARR = ['休门', '死门', '伤门', '杜门', '', '开门', '惊门', '生门', '景门']

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// Palace grid positions: canvas[row][col] maps to Luo Shu:
// [0][0]=巽4  [0][1]=离9  [0][2]=坤2
// [1][0]=震3  [1][1]=中5  [1][2]=兑7
// [2][0]=艮8  [2][1]=坎1  [2][2]=乾6
const PALACE_LAYOUT = [
  [{ name: '巽', num: 4, direction: '东南' }, { name: '离', num: 9, direction: '南' }, { name: '坤', num: 2, direction: '西南' }],
  [{ name: '震', num: 3, direction: '东' }, { name: '中', num: 5, direction: '中' }, { name: '兑', num: 7, direction: '西' }],
  [{ name: '艮', num: 8, direction: '东北' }, { name: '坎', num: 1, direction: '北' }, { name: '乾', num: 6, direction: '西北' }],
]

export interface QimenPalace {
  name: string         // e.g. '坎一'
  number: number       // 1-9
  direction: string    // e.g. '北'
  star: string         // 九星 e.g. '天任星'
  door: string         // 八门 e.g. '开门'
  divinity: string     // 八神 e.g. '九天'
  heavenStem: string   // 天盘天干
  earthStem: string    // 地盘天干
}

export interface QimenChart {
  // Time info
  year: string      // e.g. '甲辰'
  month: string     // e.g. '庚午'
  day: string       // e.g. '甲子'
  hour: string      // e.g. '辛未'
  solarTerm: string // e.g. '芒种'
  round: number     // 用局 (positive=阳遁, negative=阴遁)
  roundLabel: string // e.g. '阳遁九局'
  // Key elements
  zhiFu: string      // 值符 (star name)
  zhiShi: string     // 值使 (door name)
  // 9 palaces
  palaces: QimenPalace[]
  // Flat 3x3 grid for rendering
  grid: (QimenPalace | null)[][]
}

function stemBranchFromIndex(index: number): string {
  return STEMS[index % 10] + BRANCHES[index % 12]
}

export function calculateQimen(dateTime: Date): QimenChart {
  const taobi = new TheArtOfBecomingInvisible(dateTime)
  const canvas = taobi.getCanvas()

  const cal = taobi.calendar
  const yearGZ = stemBranchFromIndex(cal.year.index)
  const monthGZ = stemBranchFromIndex(cal.month.index)
  const dayGZ = stemBranchFromIndex(cal.date.index)
  const hourGZ = stemBranchFromIndex(cal.hour.index)

  const solarTerm = taobi.getSolarTerms(true) as string
  const round = taobi.round as number
  const roundLabel = round > 0 ? `阳遁${round}局` : `阴遁${Math.abs(round)}局`

  const zhiFuIndex = taobi.getSymbol() as number
  const zhiFu = taobi.getSymbol(true) as string
  const zhiShiIndex = taobi.getMandate() as number
  const zhiShi = DOOR_ARR[zhiShiIndex] || `第${zhiShiIndex}门`

  // Parse the 3x3 canvas into palace objects
  const palaces: QimenPalace[] = []
  const grid: (QimenPalace | null)[][] = [[], [], []]

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = canvas[row][col]
      const layoutInfo = PALACE_LAYOUT[row][col]

      // cell structure: [[divinity,"",""], [door,"",heavenStem], [star,"palaceName",earthStem]]
      const divinity = cell[0][0] || ''
      const door = cell[1][0] || ''
      const heavenStem = cell[1][2] || ''
      const star = (cell[2][0] || '').split(',')[0] // may have comma-separated (e.g. 天芮星,天禽星)
      const earthStem = cell[2][2] || ''

      const palace: QimenPalace = {
        name: `${layoutInfo.name}${layoutInfo.num === 5 ? '五' : ''}宫`,
        number: layoutInfo.num,
        direction: layoutInfo.direction,
        star: star,
        door: door,
        divinity: divinity,
        heavenStem: heavenStem,
        earthStem: earthStem,
      }

      palaces.push(palace)
      grid[row].push(palace)
    }
  }

  return {
    year: yearGZ,
    month: monthGZ,
    day: dayGZ,
    hour: hourGZ,
    solarTerm,
    round,
    roundLabel,
    zhiFu,
    zhiShi,
    palaces,
    grid,
  }
}
