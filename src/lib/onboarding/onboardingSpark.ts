/**
 * Onboarding Spark Engine
 * Inspired by modern spiritual tech applications (e.g. CoStar, The Pattern),
 * provides instant personality sparks, Five Elements distribution, and heuristic inquiries
 * immediately upon new user onboarding.
 */

import { calculateBazi } from '../baziCalculator'

export interface OnboardingInput {
  name?: string | null
  gender?: 'male' | 'female' | null
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  calendarType?: 'solar' | 'lunar'
  exactTime?: string
}

export interface PersonalityTrait {
  title: string
  desc: string
  icon: string
}

export interface HeuristicInquiry {
  id: string
  category: 'career' | 'wealth' | 'relationship' | 'decision'
  icon: string
  titleZh: string
  titleEn: string
  questionZh: string
  questionEn: string
  recommendedType: string
}

export interface OnboardingSparkResult {
  hasChart: boolean
  dayMaster: {
    stem: string
    element: string
    elementNameZh: string
    elementNameEn: string
    natureZh: string
    natureEn: string
  }
  personalityTags: string[]
  traits: PersonalityTrait[]
  fiveElements: Record<'metal' | 'wood' | 'water' | 'fire' | 'earth', number>
  suggestedInquiries: HeuristicInquiry[]
}

const STEM_DETAILS: Record<
  string,
  {
    element: string
    elementZh: string
    elementEn: string
    natureZh: string
    natureEn: string
    tags: string[]
    traits: PersonalityTrait[]
  }
> = {
  甲: {
    element: '木',
    elementZh: '陽木 · 棟樑大木',
    elementEn: 'Yang Wood · Majestic Forest Timber',
    natureZh: '若千尋大木，正直仁厚，自強不息，胸懷大志，具領袖氣魄。',
    natureEn: 'Towering forest oak: upright, benevolent, ambitious and pioneering.',
    tags: ['剛直不阿', '開拓先驅', '深具遠見', '仁厚守禮'],
    traits: [
      { title: '大器端莊', desc: '做事極有擔當，遇風雨亦立身正直，天然具有凝聚他人的領導風範。', icon: '喬' },
      { title: '求索精進', desc: '自尊心強，不甘平庸，始終渴望在專業領域扎深根基、向上突破。', icon: '進' },
      { title: '仁者胸懷', desc: '重情義、守承諾，常在朋友或團隊面臨艱險時挺身而出。', icon: '仁' },
    ],
  },
  乙: {
    element: '木',
    elementZh: '陰木 · 蔓草芳華',
    elementEn: 'Yin Wood · Resilient Vine & Flora',
    natureZh: '如靈動秀木，柔韌通達，生機內蘊，善於借力順勢而起。',
    natureEn: 'Living vine and flower: flexible, graceful, highly adaptable and intuitive.',
    tags: ['柔韌通變', '知進知退', '洞察人心', '內蘊風骨'],
    traits: [
      { title: '借勢生長', desc: '善於感知周遭環境的微妙變化，能在逆境中靈活盤旋，以柔克剛。', icon: '藤' },
      { title: '心細情長', desc: '同理心極強，善於傾聽與安撫人心，人際關係圓融和諧。', icon: '柔' },
      { title: '堅韌不拔', desc: '看似溫和隨順，內心深處卻有不可動搖的底線與驚人的耐力。', icon: '韌' },
    ],
  },
  丙: {
    element: '火',
    elementZh: '陽火 · 烈日普照',
    elementEn: 'Yang Fire · Brilliant Solar Light',
    natureZh: '如中天烈日，熱情光明，普照萬物，坦蕩磊落，驅散陰霾。',
    natureEn: 'Blazing radiant sun: passionate, magnanimous, generous and inspiring.',
    tags: ['熱忱坦蕩', '胸襟宏闊', '行動果決', '激勵人心'],
    traits: [
      { title: '光明磊落', desc: '行事光明正大，不喜曲意逢迎，喜怒哀樂溢於言表，真誠待人。', icon: '陽' },
      { title: '活力四射', desc: '自帶感染力與充沛能量，往往是團隊中的士氣來源與焦點所在。', icon: '炎' },
      { title: '豪爽仗義', desc: '見不得他人受困，樂於助人，心胸開闊不計前嫌。', icon: '義' },
    ],
  },
  丁: {
    element: '火',
    elementZh: '陰火 · 燭照幽微',
    elementEn: 'Yin Fire · Guiding Starlight & Candle',
    natureZh: '如星光燭火，溫潤內斂，燭照幽微，心思縝密，洞析玄機。',
    natureEn: 'Luminous candle & star: gentle, perceptive, enlightened and intellectually deep.',
    tags: ['見微知著', '溫文爾雅', '深思敏銳', '慧黠神明'],
    traits: [
      { title: '幽微洞察', desc: '直覺敏銳，能輕易看破事物的表面浮華，捕捉背後的真實玄機。', icon: '燭' },
      { title: '文秀含蓄', desc: '待人溫和克制，舉手投足帶著知性氣質，內心世界豐富深邃。', icon: '秀' },
      { title: '暗室明燈', desc: '關鍵時刻總能為迷惘之人點亮方向，是值得深交的智慧知己。', icon: '燈' },
    ],
  },
  戊: {
    element: '土',
    elementZh: '陽土 · 巍峨重山',
    elementEn: 'Yang Earth · Majestic Mountain',
    natureZh: '如崇山峻嶺，厚重沉穩，容載萬物，守正不移，重信踐諾。',
    natureEn: 'Mountain bedrock: grounded, trustworthy, patient and immensely steady.',
    tags: ['沉著穩重', '信守金諾', '氣度包容', '臨危不亂'],
    traits: [
      { title: '厚德載物', desc: '情緒穩定，耐力過人，面對外界動盪時宛若磐石，給人極大安全感。', icon: '山' },
      { title: '重信講義', desc: '一言既出駟馬難追，是朋友和合作夥伴最堅實的後盾。', icon: '信' },
      { title: '沉潛大器', desc: '不喜張揚，善於默默積蓄實力，厚積而薄發。', icon: '厚' },
    ],
  },
  己: {
    element: '土',
    elementZh: '陰土 · 田園厚壤',
    elementEn: 'Yin Earth · Fertile Garden Soil',
    natureZh: '如田園沃土，包容滋養，心思細膩，溫潤敦厚，善解人意。',
    natureEn: 'Nutrient-rich loam: nurturing, perceptive, patient and generous.',
    tags: ['涵養萬物', '循循善誘', '謹慎精細', '善於包容'],
    traits: [
      { title: '潤物無聲', desc: '善於照顧他人感受，默默付出而很少計較回報，富有慈悲之心。', icon: '禾' },
      { title: '多謀善斷', desc: '思慮周延，擅長整合資源與化解紛爭，極具調和能力。', icon: '育' },
      { title: '內秀堅實', desc: '看似平凡隨和，卻蕴藏著源源不絕的包容與孕育力量。', icon: '田' },
    ],
  },
  庚: {
    element: '金',
    elementZh: '陽金 · 霜刃鋒芒',
    elementEn: 'Yang Metal · Sharp Blade & Ore',
    natureZh: '如百鍊精鋼，剛毅果敢，行事俐落，重義輕利，勇破陳規。',
    natureEn: 'Tempered sword steel: brave, decisive, righteous and cutting-edge.',
    tags: ['剛毅果決', '直截了當', '仗義執言', '敢破敢立'],
    traits: [
      { title: '行事果決', desc: '討厭拖泥帶水，遇到問題敢作敢當，出手快準狠，極具魄力。', icon: '刃' },
      { title: '是非分明', desc: '正義感極強，眼里揉不得沙子，對朋友肝膽相照。', icon: '剛' },
      { title: '百鍊成鋼', desc: '在磨礪與挑戰中反而越挫越勇，愈經打磨愈顯鋒芒。', icon: '鋼' },
    ],
  },
  辛: {
    element: '金',
    elementZh: '陰金 · 溫潤明珠',
    elementEn: 'Yin Metal · Fine Jewelry & Pearl',
    natureZh: '如璀璨珠玉，溫雅秀麗，心思玲瓏，自尊自愛，追求至美。',
    natureEn: 'Polished diamond & gem: refined, elegant, perfectionist and sharp.',
    tags: ['優雅從容', '完美主義', '靈心慧性', '風骨自持'],
    traits: [
      { title: '精益求精', desc: '對生活品質與精神境界有極高追求，細節之處尤顯非凡品味。', icon: '琢' },
      { title: '玲瓏心竅', desc: '心思細緻通透，極善於體察人情冷暖與審美意境。', icon: '玲' },
      { title: '傲骨凌霜', desc: '氣質清冷高潔，外柔內剛，有著極為堅定自重的內核。', icon: '霜' },
    ],
  },
  壬: {
    element: '水',
    elementZh: '陽水 · 江河奔湧',
    elementEn: 'Yang Water · Vast Ocean & River',
    natureZh: '如浩瀚江海，奔湧不息，胸納百川，大智大悟，進退自如。',
    natureEn: 'Surging mighty river: visionary, highly intelligent, fluid and boundless.',
    tags: ['聰慧豁達', '智者無疆', '應機立斷', '胸襟汪洋'],
    traits: [
      { title: '大智若水', desc: '思維開闊敏捷，善於宏觀佈局，凡事順勢而為而不拘泥常規。', icon: '江' },
      { title: '四海同心', desc: '交遊廣闊，適應力極強，任何陌生環境都能迅速如魚得水。', icon: '航' },
      { title: '氣吞山河', desc: '格局高遠，不困於一時得失，志在千里。', icon: '海' },
    ],
  },
  癸: {
    element: '水',
    elementZh: '陰水 · 朝露清泉',
    elementEn: 'Yin Water · Dewdrop & Spring',
    natureZh: '如晨曦朝露、深山甘泉，至純至靈，潛移默化，心靈感應極深。',
    natureEn: 'Pristine morning dew: spiritual, empathic, quietly profound and inspiring.',
    tags: ['靈性直覺', '上善若水', '隨方就圓', '潤物無聲'],
    traits: [
      { title: '通靈感應', desc: '天生對玄學、心理、藝術有超乎常人的敏銳直覺，善識天機。', icon: '露' },
      { title: '至柔至容', desc: '隨物賦形，柔善包容，看似無爭，實則無堅不摧。', icon: '滋' },
      { title: '深沉智慧', desc: '喜好安靜思考，心境澄明，言談之間常發人深省。', icon: '淵' },
    ],
  },
}

export function generateOnboardingSpark(input: OnboardingInput): OnboardingSparkResult {
  const hasBirth = Boolean(input.birthDate && input.birthTime)

  if (!hasBirth || !input.birthDate || !input.birthTime) {
    return {
      hasChart: false,
      dayMaster: {
        stem: '天元',
        element: '水',
        elementNameZh: '陰陽合和 · 天地同參',
        elementNameEn: 'Harmonious Essence · Universal Dao',
        natureZh: '天地為爐，造化為工。萬物皆有其機緣，靜候生辰以啟星羅。',
        natureEn: 'Waiting for birth data to unveil your unique celestial chart.',
      },
      personalityTags: ['造化天機', '虛靈不昧', '待時而動', '順應天時'],
      traits: [
        { title: '靜待機緣', desc: '補全出生日期與時辰後，系統將精準排出四柱八字與紫微宮位。', icon: '機' },
        { title: '洞察先機', desc: '無論何時起步，東方命理智囊皆為您提供指引明燈。', icon: '明' },
        { title: '博採眾長', desc: '您仍可自由體驗六爻占卦、梅花易數、風水佈局等經典術數。', icon: '羅' },
      ],
      fiveElements: { metal: 20, wood: 20, water: 20, fire: 20, earth: 20 },
      suggestedInquiries: [
        {
          id: 'career_start',
          category: 'career',
          icon: '祿',
          titleZh: '近期事業轉機',
          titleEn: 'Career Outlook',
          questionZh: '我近期事業發展有無新突破與轉機？適宜進攻還是守成？',
          questionEn: 'Are there breakthrough opportunities in my career soon?',
          recommendedType: 'bazi',
        },
        {
          id: 'wealth_start',
          category: 'wealth',
          icon: '財',
          titleZh: '正財偏財機遇',
          titleEn: 'Wealth Timing',
          questionZh: '今年財祿走向如何？幾月份投資置業最具優勢？',
          questionEn: 'How is my financial fortune this year, and when is the best window?',
          recommendedType: 'ziwei',
        },
        {
          id: 'love_start',
          category: 'relationship',
          icon: '緣',
          titleZh: '正緣婚戀桃花',
          titleEn: 'Love & Destiny',
          questionZh: '我命中的正緣桃花何時浮現？感情路上如何少走彎路？',
          questionEn: 'When will my destined relationship manifest?',
          recommendedType: 'liuyao',
        },
        {
          id: 'breakthrough_start',
          category: 'decision',
          icon: '卦',
          titleZh: '破局決策謀略',
          titleEn: 'Strategic Breakthrough',
          questionZh: '面對當前關鍵抉擇與困局，古法易道有何破局指引？',
          questionEn: 'Faced with a key dilemma, what guidance does classical I Ching provide?',
          recommendedType: 'qimen',
        },
      ],
    }
  }

  // Calculate deterministic BaZi chart using the core engine
  try {
    const chart = calculateBazi(
      input.birthDate,
      input.birthTime,
      input.birthPlace || '未知',
      input.gender || 'male',
      input.exactTime,
      null,
      null,
      { liuNianCount: 0 }
    )

    const dayStem = chart.dayMaster.stem
    const details = STEM_DETAILS[dayStem] || STEM_DETAILS['甲']

    // Energy proportions from chart calculation
    const fe = chart.fiveElements || { metal: 20, wood: 20, water: 20, fire: 20, earth: 20 }

    return {
      hasChart: true,
      dayMaster: {
        stem: dayStem,
        element: details.element,
        elementNameZh: details.elementZh,
        elementNameEn: details.elementEn,
        natureZh: details.natureZh,
        natureEn: details.natureEn,
      },
      personalityTags: details.tags,
      traits: details.traits,
      fiveElements: {
        metal: fe.metal ?? 20,
        wood: fe.wood ?? 20,
        water: fe.water ?? 20,
        fire: fe.fire ?? 20,
        earth: fe.earth ?? 20,
      },
      suggestedInquiries: [
        {
          id: `career_${dayStem}`,
          category: 'career',
          icon: '祿',
          titleZh: '近期事業轉機',
          titleEn: 'Career Breakthrough',
          questionZh: `日主${dayStem}木/火/土/金/水，近期事業發展有無突破契機？適合主動出擊還是穩健守成？`.replace(
            '木/火/土/金/水',
            details.element
          ),
          questionEn: `As Day Master ${dayStem}, what are my imminent career advancement opportunities?`,
          recommendedType: 'bazi',
        },
        {
          id: `wealth_${dayStem}`,
          category: 'wealth',
          icon: '財',
          titleZh: '正財偏財走勢',
          titleEn: 'Wealth & Assets',
          questionZh: '我今年財富機緣如何？何時財氣最旺、適合置業或投資？',
          questionEn: 'What is my wealth trajectory this year and when is the best financial timing?',
          recommendedType: 'ziwei',
        },
        {
          id: `love_${dayStem}`,
          category: 'relationship',
          icon: '緣',
          titleZh: '命定正緣桃花',
          titleEn: 'Destined Love',
          questionZh: '命中正緣特徵如何？近期感情運勢走向如何？',
          questionEn: 'What are the traits of my destined partner and my current love fortune?',
          recommendedType: 'liuyao',
        },
        {
          id: `decision_${dayStem}`,
          category: 'decision',
          icon: '卦',
          titleZh: '當下困局破局',
          titleEn: 'Strategic Oracle',
          questionZh: '當前心中有一件重大疑惑，此事未來吉凶走向如何？有何解法？',
          questionEn: 'I have an urgent dilemma; what is the forecast and resolution strategy?',
          recommendedType: 'qimen',
        },
      ],
    }
  } catch {
    // Fallback if date parsing error occurs
    return generateOnboardingSpark({ ...input, birthDate: '', birthTime: '' })
  }
}

/**
 * Game-strategy style 3-pillar module roadmap definitions
 */
export interface ModuleItem {
  type: string
  nameZh: string
  nameEn: string
  symbol: string
  tagZh: string
  tagEn: string
  descZh: string
  descEn: string
  recommendedForZh: string
  recommendedForEn: string
  route: string
}

export interface ModuleRoadmapCategory {
  id: 'destiny' | 'divination' | 'environment'
  titleZh: string
  titleEn: string
  subtitleZh: string
  subtitleEn: string
  badgeZh: string
  badgeEn: string
  icon: string
  modules: ModuleItem[]
}

export const MODULE_ROADMAP_CATEGORIES: ModuleRoadmapCategory[] = [
  {
    id: 'destiny',
    titleZh: '命局命盤篇',
    titleEn: 'Destiny & Life Charts',
    subtitleZh: '以生辰為基石，通曉一生格局、大運起伏與天賦性格',
    subtitleEn: 'Unlock your lifelong blueprint, decade cycles, and inherent potential',
    badgeZh: '知命立命',
    badgeEn: 'Self Knowledge',
    icon: '命',
    modules: [
      {
        type: 'bazi',
        nameZh: '八字命理',
        nameEn: 'BaZi (Four Pillars)',
        symbol: '柱',
        tagZh: '四柱干支 · 大運流年',
        tagEn: 'Four Pillars & Decade Cycles',
        descZh: '以年月日時四柱天干地支為坐標，推算一生命運富貴貧賤、格局喜忌與事業婚運。',
        descEn: 'Calculates the 4 pillars from birth date and time to reveal destiny, career and life patterns.',
        recommendedForZh: '適合：想全面審視自己一生大運節奏、事業方向與性格盲點者。',
        recommendedForEn: 'Best for: Comprehensive life roadmap, career strengths and long-term planning.',
        route: '/divination/bazi',
      },
      {
        type: 'ziwei',
        nameZh: '紫微斗數',
        nameEn: 'Zi Wei Dou Shu',
        symbol: '紫',
        tagZh: '十二宮位 · 群星照耀',
        tagEn: '12 Palaces & Star Constellations',
        descZh: '以北極紫微為中樞，排列命宮、財帛、官祿、夫妻等十二宮群星，象數周詳。',
        descEn: 'Arranges stars across 12 life palaces to provide nuanced psychological and situational insights.',
        recommendedForZh: '適合：想細緻看財帛、感情婚戀、人際貴人與特定年份吉凶者。',
        recommendedForEn: 'Best for: Deep palace analysis (finances, romance, relationships, annual luck).',
        route: '/divination/ziwei',
      },
    ],
  },
  {
    id: 'divination',
    titleZh: '卜卦決策篇',
    titleEn: 'Tactical Divination & Strategy',
    subtitleZh: '動靜機先，一事一占，在重要抉擇關頭明辨吉凶成敗',
    subtitleEn: 'Inquire on specific events, strategic timing, and critical decisions',
    badgeZh: '趨吉避凶',
    badgeEn: 'Actionable Advice',
    icon: '卜',
    modules: [
      {
        type: 'liuyao',
        nameZh: '六爻神課',
        nameEn: 'Liu Yao Oracle',
        symbol: '爻',
        tagZh: '三幣搖卦 · 世應用神',
        tagEn: 'Coin Casting & Six Relatives',
        descZh: '以三枚銅錢連擲六次起卦，配以天干地支、六親世應，精準斷定單一特定事件成敗。',
        descEn: 'Toss 3 coins 6 times to cast a hexagram with 6 relatives for precise event outcome prediction.',
        recommendedForZh: '適合：面臨具體事件（如合夥求財、跳槽應聘、官司簽約、尋人尋物）。',
        recommendedForEn: 'Best for: Concrete event inquiries (job switch, partnership, contract signing).',
        route: '/divination/liuyao',
      },
      {
        type: 'meihua',
        nameZh: '梅花易數',
        nameEn: 'Plum Blossom Numerology',
        symbol: '梅',
        tagZh: '萬物皆數 · 體用相參',
        tagEn: 'Numbers, Time & Universal Mind',
        descZh: '心念所動即可起卦，以數字或時間取卦，分析體用五行生克，斷事神速靈驗。',
        descEn: 'Captures synchronicity through spontaneous numbers or moments for instant oracle clarity.',
        recommendedForZh: '適合：突發靈感、短線判斷、日常小事決策與應機問事。',
        recommendedForEn: 'Best for: Spontaneous decisions, immediate daily inquiries and fast guidance.',
        route: '/divination/meihua',
      },
      {
        type: 'qimen',
        nameZh: '奇門遁甲',
        nameEn: 'Qi Men Dun Jia',
        symbol: '門',
        tagZh: '帝王之術 · 局勢謀略',
        tagEn: 'Imperial Strategy & Space-Time',
        descZh: '古代最高維度的行軍決策術，融合九星、八門、八神與三奇六儀，掌握天時地利。',
        descEn: 'The imperial strategy system analyzing space-time vectors, 8 gates and 9 stars for mastery.',
        recommendedForZh: '適合：商戰談判、重大布局、時機抉擇與逆勢破局。',
        recommendedForEn: 'Best for: Business negotiation, high-stakes decisions and strategic timing.',
        route: '/divination/qimen',
      },
    ],
  },
  {
    id: 'environment',
    titleZh: '環境宅運篇',
    titleEn: 'Feng Shui & Environment',
    subtitleZh: '藏風聚氣，人宅共鳴，優化空間場域助力身心安泰與家業興旺',
    subtitleEn: 'Optimize your dwelling and spatial energy flow for prosperity and wellness',
    badgeZh: '人宅相宜',
    badgeEn: 'Spatial Harmony',
    icon: '堪',
    modules: [
      {
        type: 'fengshui',
        nameZh: '風水堪輿',
        nameEn: 'Feng Shui Harmony',
        symbol: '輿',
        tagZh: '八宅九星 · 氣場調理',
        tagEn: 'Eight Mansions & Spatial Energy',
        descZh: '結合房屋坐向、建成年份與居住者生辰，剖析居所明堂、大門、臥室氣場，化煞催吉。',
        descEn: 'Evaluates house orientation, layout, and occupant profiles to harmonize energy and luck.',
        recommendedForZh: '適合：喬遷新居、居家或辦公環境調理、改善失眠與催旺財位。',
        recommendedForEn: 'Best for: Moving home, office layout, improving sleep and enhancing wealth spots.',
        route: '/divination/fengshui',
      },
    ],
  },
]
