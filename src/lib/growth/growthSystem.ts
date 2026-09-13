import {
  GrowthStats,
  RealmTierInfo,
  Achievement,
  UserGrowthProfile,
} from './types'

export const XP_WEIGHT_DIVINATION = 50
export const XP_WEIGHT_MASTER = 20
export const XP_WEIGHT_CHAT = 10

export const REALM_TIERS: RealmTierInfo[] = [
  {
    tier: 1,
    name: { zh: '初探玄门', 'zh-TW': '初探玄門', en: 'Novice Seeker' },
    title: { zh: '一阶 · 初探玄门', 'zh-TW': '一階 · 初探玄門', en: 'Tier I: Novice Seeker' },
    badge: '📜',
    color: '#94a3b8',
    minXp: 0,
    maxXp: 100,
    description: {
      zh: '初入玄门，心怀困惑与期许，初识阴阳造化之妙。',
      'zh-TW': '初入玄門，心懷困惑與期許，初識陰陽造化之妙。',
      en: 'A seeker taking first steps into Chinese metaphysics, opening the door to ancient wisdom.',
    },
    quote: {
      zh: '「玄之又玄，众妙之门。」',
      'zh-TW': '「玄之又玄，眾妙之門。」',
      en: '"Mysterious and profound, the gateway of all wonders."',
    },
  },
  {
    tier: 2,
    name: { zh: '略窥爻象', 'zh-TW': '略窺爻象', en: 'Trigram Apprentice' },
    title: { zh: '二阶 · 略窥爻象', 'zh-TW': '二階 · 略窺爻象', en: 'Tier II: Trigram Apprentice' },
    badge: '🪙',
    color: '#38bdf8',
    minXp: 100,
    maxXp: 300,
    description: {
      zh: '辨识阴阳刚柔，能明单卦吉凶，初识周易与干支大意。',
      'zh-TW': '辨識陰陽剛柔，能明單卦吉凶，初識周易與干支大意。',
      en: 'Beginning to discern yin and yang, recognizing trigram movements and basic celestial stems.',
    },
    quote: {
      zh: '「刚柔相推而生变化。」',
      'zh-TW': '「剛柔相推而生變化。」',
      en: '"The firm and the yielding alternate, giving birth to constant transformation."',
    },
  },
  {
    tier: 3,
    name: { zh: '洞察阴阳', 'zh-TW': '洞察陰陽', en: 'Yin-Yang Adept' },
    title: { zh: '三阶 · 洞察阴阳', 'zh-TW': '三階 · 洞察陰陽', en: 'Tier III: Yin-Yang Adept' },
    badge: '☯️',
    color: '#34d399',
    minXp: 300,
    maxXp: 650,
    description: {
      zh: '通晓五行生克，不泥于一象一吉，渐知因势利导、顺逆之理。',
      'zh-TW': '通曉五行生剋，不泥於一象一吉，漸知因勢利導、順逆之理。',
      en: 'Mastering the five elements and cycles of generation and restraint, understanding harmony beyond mere fortune.',
    },
    quote: {
      zh: '「一阴一阳之谓道。」',
      'zh-TW': '「一陰一陽之謂道。」',
      en: '"The continuous succession of Yin and Yang is called the Tao."',
    },
  },
  {
    tier: 4,
    name: { zh: '研几探賾', 'zh-TW': '研幾探賾', en: 'Arcane Scholar' },
    title: { zh: '四阶 · 研几探賾', 'zh-TW': '四階 · 研幾探賾', en: 'Tier IV: Arcane Scholar' },
    badge: '🔮',
    color: '#818cf8',
    minXp: 650,
    maxXp: 1200,
    description: {
      zh: '探幽寻微，深研八字紫微、六爻奇门之理，穷究事情起落因果。',
      'zh-TW': '探幽尋微，深研八字紫微、六爻奇門之理，窮究事情起落因果。',
      en: 'Probing into subtle cosmic patterns across BaZi, ZiWei, and QiMen to unravel underlying causality.',
    },
    quote: {
      zh: '「极深研几，索隐致远。」',
      'zh-TW': '「極深研幾，索隱致遠。」',
      en: '"Probing deep into the hidden springs of action, reaching far into hidden truths."',
    },
  },
  {
    tier: 5,
    name: { zh: '融通三才', 'zh-TW': '融通三才', en: 'Master of Three Realms' },
    title: { zh: '五阶 · 融通三才', 'zh-TW': '五階 · 融通三才', en: 'Tier V: Master of Three Realms' },
    badge: '🧭',
    color: '#fbbf24',
    minXp: 1200,
    maxXp: 2000,
    description: {
      zh: '贯通天时、地利、人和之道，善择方位与时机，动定自若。',
      'zh-TW': '貫通天時、地利、人和之道，善擇方位與時機，動定自若。',
      en: 'Synthesizing the three realms of Heaven, Earth, and Humanity, navigating decisions with calm poise.',
    },
    quote: {
      zh: '「与天地合其德，与日月合其明。」',
      'zh-TW': '「與天地合其德，與日月合其明。」',
      en: '"Harmonizing virtue with Heaven and Earth, aligning brightness with Sun and Moon."',
    },
  },
  {
    tier: 6,
    name: { zh: '参悟天机', 'zh-TW': '參悟天機', en: 'Celestial Sage' },
    title: { zh: '六阶 · 参悟天机', 'zh-TW': '六階 · 參悟天機', en: 'Tier VI: Celestial Sage' },
    badge: '🌌',
    color: '#c084fc',
    minXp: 2000,
    maxXp: 3200,
    description: {
      zh: '星度推移、奇门演局洞若观火，与玄机大师意气相通，见微知著。',
      'zh-TW': '星度推移、奇門演局洞若觀火，與玄機大師意氣相通，見微知著。',
      en: 'Observing celestial orbits and strategic charts with crystal clarity, perceiving the faint origins of all outcomes.',
    },
    quote: {
      zh: '「知微知彰，知柔知刚，万夫之望。」',
      'zh-TW': '「知微知彰，知柔知剛，萬夫之望。」',
      en: '"Knowing the subtle and manifest, the yielding and firm — an inspiring guiding light."',
    },
  },
  {
    tier: 7,
    name: { zh: '出神入化', 'zh-TW': '出神入化', en: 'Transcendent Seeker' },
    title: { zh: '七阶 · 出神入化', 'zh-TW': '七階 · 出神入化', en: 'Tier VII: Transcendent Seeker' },
    badge: '⚡',
    color: '#f472b6',
    minXp: 3200,
    maxXp: 4800,
    description: {
      zh: '神无方而易无体，妙化无穷，知进退存亡而不失其正，从容驭世。',
      'zh-TW': '神無方而易無體，妙化無窮，知進退存亡而不失其正，從容馭世。',
      en: 'The spirit has no fixed location; change has no rigid form. Master of fluid adaptation and upright insight.',
    },
    quote: {
      zh: '「知进退存亡而不失其正者，其唯圣人乎！」',
      'zh-TW': '「知進退存亡而不失其正者，其唯聖人乎！」',
      en: '"Only the sage understands advance and retreat, preservation and loss, without losing inner equilibrium."',
    },
  },
  {
    tier: 8,
    name: { zh: '乾坤造化', 'zh-TW': '乾坤造化', en: 'Cosmic Architect' },
    title: { zh: '八阶 · 乾坤造化', 'zh-TW': '八階 · 乾坤造化', en: 'Tier VIII: Cosmic Architect' },
    badge: '👑',
    color: '#eab308',
    minXp: 4800,
    maxXp: 7000,
    description: {
      zh: '造化在手，乐天知命故不忧，安时处顺，自得其乐，万物皆备于我。',
      'zh-TW': '造化在手，樂天知命故不憂，安時處順，自得其樂，萬物皆備於我。',
      en: 'Rejoicing in Heaven and knowing destiny, free from anxious worry, embracing the natural unfolding of life.',
    },
    quote: {
      zh: '「乐天知命，故不忧；安土敦乎仁，故能爱。」',
      'zh-TW': '「樂天知命，故不憂；安土敦乎仁，故能愛。」',
      en: '"Rejoicing in cosmic law and knowing fate, there is no anxiety; resting content in righteousness, love abounds."',
    },
  },
  {
    tier: 9,
    name: { zh: '天人合一', 'zh-TW': '天人合一', en: 'Grandmaster of the Great Ultimate' },
    title: { zh: '九阶 · 天人合一', 'zh-TW': '九階 · 天人合一', en: 'Tier IX: Unity with the Tao' },
    badge: '🌟',
    color: '#f59e0b',
    minXp: 7000,
    maxXp: null,
    description: {
      zh: '达到术数修道之至高境界，返璞归真，道法自然，与宇宙大化同游。',
      'zh-TW': '達到術數修道之至高境界，返璞歸真，道法自然，與宇宙大化同遊。',
      en: 'The pinnacle of metaphysical cultivation: pure simplicity, natural alignment, unified with the infinite Tao.',
    },
    quote: {
      zh: '「天地与我并生，而万物与我为一。」',
      'zh-TW': '「天地與我並生，而萬物與我為一。」',
      en: '"Heaven and Earth coexist with me; all beings and I are one."',
    },
  },
]

export function checkAchievements(stats: GrowthStats, currentTier: number): Achievement[] {
  const divinationCount = Math.max(0, stats.usageDivination || 0)
  const masterCount = Math.max(0, stats.usageMaster || 0)
  const chatCount = Math.max(0, stats.usageChat || 0)
  const uniqueTypesCount = stats.typeCounts ? Object.keys(stats.typeCounts).length : (divinationCount > 0 ? 1 : 0)

  return [
    {
      id: 'first_divination',
      icon: '🔮',
      name: { zh: '初问天机', 'zh-TW': '初問天機', en: 'First Inquiry' },
      description: {
        zh: '完成首次卦象占卜推演',
        'zh-TW': '完成首次卦象占卜推演',
        en: 'Complete your first divination reading',
      },
      unlocked: divinationCount >= 1,
      currentVal: divinationCount,
      targetVal: 1,
      progress: Math.min(100, Math.round((divinationCount / 1) * 100)),
    },
    {
      id: 'master_confidant',
      icon: '🧙',
      name: { zh: '大匠知音', 'zh-TW': '大匠知音', en: 'Master Confidant' },
      description: {
        zh: '与玄机大师探讨请益累计达 10 轮',
        'zh-TW': '與玄機大師探討請益累計達 10 輪',
        en: 'Converse with Master Xuanji for at least 10 turns',
      },
      unlocked: masterCount >= 10,
      currentVal: masterCount,
      targetVal: 10,
      progress: Math.min(100, Math.round((masterCount / 10) * 100)),
    },
    {
      id: 'diverse_scholar',
      icon: '📚',
      name: { zh: '博涉百家', 'zh-TW': '博涉百家', en: 'Diverse Scholar' },
      description: {
        zh: '探索体验至少 3 种不同门派的占卜术数',
        'zh-TW': '探索體驗至少 3 種不同門派的占卜術數',
        en: 'Experience at least 3 distinct divination systems',
      },
      unlocked: uniqueTypesCount >= 3,
      currentVal: uniqueTypesCount,
      targetVal: 3,
      progress: Math.min(100, Math.round((uniqueTypesCount / 3) * 100)),
    },
    {
      id: 'deep_contemplation',
      icon: '💬',
      name: { zh: '穷理尽性', 'zh-TW': '窮理盡性', en: 'Deep Contemplation' },
      description: {
        zh: '在占卜结果下进行深度问答追问达 10 次',
        'zh-TW': '在占卜結果下進行深度問答追問達 10 次',
        en: 'Ask follow-up questions in readings at least 10 times',
      },
      unlocked: chatCount >= 10,
      currentVal: chatCount,
      targetVal: 10,
      progress: Math.min(100, Math.round((chatCount / 10) * 100)),
    },
    {
      id: 'hundred_readings',
      icon: '⚡',
      name: { zh: '百卜通神', 'zh-TW': '百卜通神', en: 'Century Diviner' },
      description: {
        zh: '累计完成 100 次占卜解卦',
        'zh-TW': '累計完成 100 次占卜解卦',
        en: 'Complete 100 total divination sessions',
      },
      unlocked: divinationCount >= 100,
      currentVal: divinationCount,
      targetVal: 100,
      progress: Math.min(100, Math.round((divinationCount / 100) * 100)),
    },
    {
      id: 'adept_master',
      icon: '👑',
      name: { zh: '玄门宗匠', 'zh-TW': '玄門宗匠', en: 'Grand Scholar' },
      description: {
        zh: '术数境界晋阶至五阶【融通三才】或以上',
        'zh-TW': '術數境界晉階至五階【融通三才】或以上',
        en: 'Reach Tier V: Master of Three Realms or above',
      },
      unlocked: currentTier >= 5,
      currentVal: currentTier,
      targetVal: 5,
      progress: Math.min(100, Math.round((currentTier / 5) * 100)),
    },
  ]
}

function getMasterGreeting(tier: number) {
  if (tier <= 1) {
    return {
      zh: '初入玄门，天地广阔。心有所疑，卦象自能指引迷津。',
      'zh-TW': '初入玄門，天地廣闊。心有所疑，卦象自能指引迷津。',
      en: 'Welcome to the path of Xuan. Keep an open heart, and the hexagrams shall illuminate the way.',
    }
  }
  if (tier <= 3) {
    return {
      zh: '道友渐通阴阳变化，日进有功。今日前来，欲察何事之机？',
      'zh-TW': '道友漸通陰陽變化，日進有功。今日前來，欲察何事之機？',
      en: 'You begin to perceive the rhythms of Yin and Yang. What question brings you here today?',
    }
  }
  if (tier <= 5) {
    return {
      zh: '道友修为日臻纯熟，深悉三才动静之理。老夫与道友论道，倍感欣慰。',
      'zh-TW': '道友修為日臻純熟，深悉三才動靜之理。老夫與道友論道，倍感欣慰。',
      en: 'Your cultivation deepens, seeing through the harmony of Heaven, Earth, and Man. A pleasure to converse with you.',
    }
  }
  if (tier <= 7) {
    return {
      zh: '道友神思通彻，已知命而不忧。玄机万变，皆在胸次之间。',
      'zh-TW': '道友神思通徹，已知命而不憂。玄機萬變，皆在胸次之間。',
      en: 'Insightful and calm, you understand destiny with grace. All shifts in the cosmos resonate in your wisdom.',
    }
  }
  return {
    zh: '天人冥合，道法自然。道友已臻化境，老夫在此拱手相候，共参至道。',
    'zh-TW': '天人冥合，道法自然。道友已臻化境，老夫在此拱手相候，共參至道。',
    en: 'In unity with the Tao and the cosmos. A true master of destiny, sharing the path of profound harmony.',
  }
}

/**
 * Pure calculation function for User Growth Profile
 */
export function calculateGrowth(stats: GrowthStats): UserGrowthProfile {
  const divinationCount = Math.max(0, stats.usageDivination || 0)
  const masterCount = Math.max(0, stats.usageMaster || 0)
  const chatCount = Math.max(0, stats.usageChat || 0)

  const divinationXp = divinationCount * XP_WEIGHT_DIVINATION
  const masterXp = masterCount * XP_WEIGHT_MASTER
  const chatXp = chatCount * XP_WEIGHT_CHAT

  const totalXp = divinationXp + masterXp + chatXp

  // Find tier matching totalXp
  let currentRealmIndex = 0
  for (let i = REALM_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= REALM_TIERS[i].minXp) {
      currentRealmIndex = i
      break
    }
  }

  const currentRealm = REALM_TIERS[currentRealmIndex]
  const nextRealm = currentRealmIndex < REALM_TIERS.length - 1
    ? REALM_TIERS[currentRealmIndex + 1]
    : null

  let xpToNextLevel = 0
  let levelProgressPercent = 100

  if (nextRealm) {
    xpToNextLevel = Math.max(0, nextRealm.minXp - totalXp)
    const range = nextRealm.minXp - currentRealm.minXp
    const progressInCurrentTier = totalXp - currentRealm.minXp
    levelProgressPercent = range > 0
      ? Math.min(100, Math.max(0, Math.round((progressInCurrentTier / range) * 100)))
      : 100
  }

  const achievements = checkAchievements(stats, currentRealm.tier)
  const masterGreeting = getMasterGreeting(currentRealm.tier)

  return {
    xp: totalXp,
    tier: currentRealm.tier,
    currentRealm,
    nextRealm,
    xpToNextLevel,
    levelProgressPercent,
    breakdown: {
      divination: { count: divinationCount, weight: XP_WEIGHT_DIVINATION, xp: divinationXp },
      master: { count: masterCount, weight: XP_WEIGHT_MASTER, xp: masterXp },
      chat: { count: chatCount, weight: XP_WEIGHT_CHAT, xp: chatXp },
    },
    realms: REALM_TIERS,
    achievements,
    masterGreeting,
  }
}
