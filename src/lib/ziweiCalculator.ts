import { astro } from 'iztro'

// Map pinyin shichen names to iztro timeIndex (0-12)
const SHICHEN_TO_TIME_INDEX: Record<string, number> = {
  'zi': 0, 'chou': 1, 'yin': 2, 'mao': 3,
  'chen': 4, 'si': 5, 'wu': 6, 'wei': 7,
  'shen': 8, 'you': 9, 'xu': 10, 'hai': 11,
  '子': 0, '丑': 1, '寅': 2, '卯': 3,
  '辰': 4, '巳': 5, '午': 6, '未': 7,
  '申': 8, '酉': 9, '戌': 10, '亥': 11,
}

export interface ZiweiStar {
  name: string
  type: string         // 'major' | 'minor' | 'adjective'
  brightness?: string  // 旺|庙|得|利|平|闲|陷
  mutagen?: string     // 禄|权|科|忌
}

export interface ZiweiPalace {
  name: string
  heavenlyStem: string
  earthlyBranch: string
  majorStars: ZiweiStar[]
  minorStars: ZiweiStar[]
  adjectiveStars: ZiweiStar[]
  isBodyPalace: boolean
  changsheng12: string
  decadal: { range: number[]; heavenlyStem: string; earthlyBranch: string }
  ages: number[]
}

export interface ZiweiChart {
  // Basic info
  solarDate: string
  lunarDate: string
  chineseDate: string
  time: string
  timeRange: string
  zodiac: string
  sign: string
  gender: string
  // Core chart data
  fiveElementsClass: string
  soul: string              // 命主
  body: string              // 身主
  earthlyBranchOfSoulPalace: string
  earthlyBranchOfBodyPalace: string
  // 12 palaces
  palaces: ZiweiPalace[]
  // Four transformations summary
  siHua: { star: string; type: string; palace: string }[]
}

export function calculateZiwei(
  solarBirthDate: string,  // 'YYYY-MM-DD'
  birthTime: string,       // pinyin like 'zi', 'chou' or 地支 like '子'
  gender: 'male' | 'female'
): ZiweiChart {
  const timeIndex = SHICHEN_TO_TIME_INDEX[birthTime] ?? 0
  const genderName = gender === 'male' ? '男' : '女'

  // Convert 'YYYY-MM-DD' to 'YYYY-M-D' (iztro expects no leading zeros)
  const [y, m, d] = solarBirthDate.split('-').map(Number)
  const iztroDate = `${y}-${m}-${d}`

  const chart = astro.bySolar(iztroDate, timeIndex, genderName, true, 'zh-CN')

  // Extract palace data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palaces: ZiweiPalace[] = chart.palaces.map((p: any) => {
    const palace = p as {
      name: string
      heavenlyStem: string
      earthlyBranch: string
      majorStars: { name: string; type: string; brightness?: string; mutagen?: string }[]
      minorStars: { name: string; type: string; brightness?: string; mutagen?: string }[]
      adjectiveStars: { name: string; type: string; brightness?: string; mutagen?: string }[]
      isBodyPalace: boolean
      changsheng12: string
      decadal: { range: number[]; heavenlyStem: string; earthlyBranch: string }
      ages: number[]
    }

    const mapStars = (stars: { name: string; type: string; brightness?: string; mutagen?: string }[]): ZiweiStar[] =>
      (stars || []).map(s => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness || undefined,
        mutagen: s.mutagen || undefined,
      }))

    return {
      name: palace.name,
      heavenlyStem: palace.heavenlyStem,
      earthlyBranch: palace.earthlyBranch,
      majorStars: mapStars(palace.majorStars),
      minorStars: mapStars(palace.minorStars),
      adjectiveStars: mapStars(palace.adjectiveStars),
      isBodyPalace: palace.isBodyPalace,
      changsheng12: palace.changsheng12,
      decadal: {
        range: palace.decadal?.range || [],
        heavenlyStem: palace.decadal?.heavenlyStem || '',
        earthlyBranch: palace.decadal?.earthlyBranch || '',
      },
      ages: palace.ages || [],
    }
  })

  // Extract 四化 (Four Transformations)
  const siHua: { star: string; type: string; palace: string }[] = []
  for (const palace of palaces) {
    for (const starList of [palace.majorStars, palace.minorStars, palace.adjectiveStars]) {
      for (const star of starList) {
        if (star.mutagen) {
          siHua.push({ star: star.name, type: star.mutagen, palace: palace.name })
        }
      }
    }
  }

  return {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    chineseDate: chart.chineseDate,
    time: chart.time,
    timeRange: chart.timeRange,
    zodiac: chart.zodiac,
    sign: chart.sign,
    gender: chart.gender,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    earthlyBranchOfSoulPalace: chart.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: chart.earthlyBranchOfBodyPalace,
    palaces,
    siHua,
  }
}
