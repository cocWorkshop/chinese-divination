import { SolarDay } from 'tyme4ts'

export interface DailyHexagram {
  name: string
  symbol: string
  judgment: string
  meaning: string
  energy: string
}

export interface DailyAlmanacData {
  solarDate: string
  lunarDate: string
  ganZhi: string
  solarTerm?: string
  dailyHexagram: DailyHexagram
  yi: string[]
  ji: string[]
  dominantElement: string
  luckScore: number
}

export const DAILY_HEXAGRAMS: DailyHexagram[] = [
  {
    name: '乾為天',
    symbol: '䷀',
    judgment: '元亨利貞。天行健，君子以自強不息。',
    meaning: '乾坤始判，陽氣充盈。宜奮發圖強，堅定志向，不可中途退餒。',
    energy: '純陽剛正，利見大人',
  },
  {
    name: '坤為地',
    symbol: '䷁',
    judgment: '地勢坤，君子以厚德載物。含弘光大，品物咸亨。',
    meaning: '厚德載物，柔順包容。宜廣結善緣，蓄養底蘊，蓄勢而後發。',
    energy: '包容承載，潤物無聲',
  },
  {
    name: '水天需',
    symbol: '䷄',
    judgment: '需，有孚，光亨，貞吉。雲上於天，君子以飲食宴樂。',
    meaning: '守正待時，沉著自安。當下不宜強求速成，從容積蓄靜待天時。',
    energy: '蓄力待發，伺機而動',
  },
  {
    name: '地天泰',
    symbol: '䷊',
    judgment: '天地交而萬物通也，上下交而其志同也。小往大來，吉亨。',
    meaning: '天地交泰，和諧亨通。各方機緣水到渠成，合作謀事皆得助力。',
    energy: '陰陽交泰，萬象更新',
  },
  {
    name: '火天大有',
    symbol: '䷍',
    judgment: '火在天上，大有。君子以遏惡揚善，順天休命。',
    meaning: '日麗中天，光照四方。豐收富饒之象，善用資源施惠同道。',
    energy: '日麗中天，富貴光明',
  },
  {
    name: '地山謙',
    symbol: '䷎',
    judgment: '謙尊而光，卑而不可逾，君子之終也。',
    meaning: '高山隱於平地，虛懷若谷。謙遜行事多得貴人，福澤綿長。',
    energy: '卑以自牧，德被四方',
  },
  {
    name: '雷地豫',
    symbol: '䷏',
    judgment: '雷出地奮，豫。先王以作樂崇德，殷薦之上帝。',
    meaning: '春雷破土，欣欣向榮。宜順應熱情開展策劃，激勵人心共襄盛舉。',
    energy: '雷動生發，和樂通達',
  },
  {
    name: '天火同人',
    symbol: '䷌',
    judgment: '同人于野，亨。利涉大川，君子正也。',
    meaning: '志同道合，天下大同。利於團隊協作、合夥營商與跨界交流。',
    energy: '聚賢合力，和衷共濟',
  },
  {
    name: '風火家人',
    symbol: '䷤',
    judgment: '利女貞。風自火出，家人。君子以言有物而行有恆。',
    meaning: '內外和睦，敦親睦鄰。宜修身齊家，穩固根本，誠信守諾。',
    energy: '溫厚和睦，根本固守',
  },
  {
    name: '澤火革',
    symbol: '䷰',
    judgment: '革，巳日乃孚，元亨利貞，悔亡。天地革而四時成。',
    meaning: '革故鼎新，順應變局。摒棄陳腐舊例，大膽開拓全新格局。',
    energy: '順天應人，推陳出新',
  },
  {
    name: '火風鼎',
    symbol: '䷱',
    judgment: '鼎，元吉，亨。木上有火，鼎。君子以正位凝命。',
    meaning: '鼎定天下，去舊生新。才德配位，定鼎成事，氣象尊嚴。',
    energy: '去舊生新，成大重器',
  },
  {
    name: '水火既濟',
    symbol: '䷾',
    judgment: '既濟，亨小，利貞。水在火上，既濟。君子以思患而預防之。',
    meaning: '陰陽和合，功成圓滿。大勢已成之際，更需居安思危謹防鬆懈。',
    energy: '功德圓滿，居安思危',
  },
]

const YI_POOL = [
  '求財', '開市', '祈福', '赴任', '簽約', '合夥', '修德', '置產', '研學', '祭祀', '會友', '安床',
]

const JI_POOL = [
  '爭執', '冒進', '動土', '訴訟', '涉險', '借貸', '口舌', '大動干戈', '投機',
]

const ELEMENTS = ['金', '木', '水', '火', '土']

export function getDailyAlmanac(dateInput?: Date): DailyAlmanacData {
  const d = dateInput || new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()

  let solarDay: SolarDay
  try {
    solarDay = SolarDay.fromYmd(year, month, day)
  } catch {
    solarDay = SolarDay.fromYmd(2026, 9, 13)
  }

  const lunarDay = solarDay.getLunarDay()
  const lunarMonth = lunarDay.getLunarMonth()

  // SixtyCycle year, month & day from lunarDay
  const scYear = lunarDay.getYearSixtyCycle().getName()
  const scMonth = lunarDay.getMonthSixtyCycle().getName()
  const scDay = lunarDay.getSixtyCycle().getName()

  const ganZhi = `${scYear}年 ${scMonth}月 ${scDay}日`
  const lunarDate = `${lunarMonth.getName()}${lunarDay.getName()}`
  const termDay = solarDay.getTermDay()
  const solarTerm = termDay ? termDay.getName() : undefined

  // Deterministic seed
  const daySeed = year * 365 + month * 31 + day
  const hexagramIndex = Math.abs(daySeed) % DAILY_HEXAGRAMS.length
  const dailyHexagram = DAILY_HEXAGRAMS[hexagramIndex]

  // Deterministic Yi and Ji
  const yi1 = YI_POOL[Math.abs(daySeed * 3) % YI_POOL.length]
  const yi2 = YI_POOL[Math.abs(daySeed * 7 + 1) % YI_POOL.length]
  const yi3 = YI_POOL[Math.abs(daySeed * 11 + 2) % YI_POOL.length]
  const yi4 = YI_POOL[Math.abs(daySeed * 13 + 3) % YI_POOL.length]
  const yi = Array.from(new Set([yi1, yi2, yi3, yi4])).slice(0, 4)

  const ji1 = JI_POOL[Math.abs(daySeed * 5) % JI_POOL.length]
  const ji2 = JI_POOL[Math.abs(daySeed * 17 + 1) % JI_POOL.length]
  const ji3 = JI_POOL[Math.abs(daySeed * 19 + 2) % JI_POOL.length]
  const ji = Array.from(new Set([ji1, ji2, ji3])).slice(0, 3)

  const dominantElement = ELEMENTS[Math.abs(daySeed) % ELEMENTS.length]
  const luckScore = 75 + (Math.abs(daySeed * 13) % 23) // 75 - 97 score

  const solarDate = `${year}年${month}月${day}日`

  return {
    solarDate,
    lunarDate,
    ganZhi,
    solarTerm,
    dailyHexagram,
    yi,
    ji,
    dominantElement,
    luckScore,
  }
}
