import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rules = [
  {
    name: 'Weekend Special',
    condition: { stage: 'any', isWeekend: true },
    messages: {
      zh: [
        '🌙 週末好時光！紫微斗數是古代帝王的命理密碼——武則天、唐太宗都曾以星盤定國策。今天不如讓AI為你揭開星盤中的秘密？',
        '⭐ 週末閒暇，正適合看星盤！紫微斗數源自陳摶老祖，以108顆星曜排列人生12宮位。來，讓玄機為你解讀命運星圖！',
        '🔮 週末來解個星盤吧！紫微斗數被譽為「群術之首」，邵康節曾以此預測北宋百年國運。你的星盤裡又藏著什麼天機？',
      ],
      en: [
        '🌙 Weekend vibes! Zi Wei Dou Shu was the imperial court\'s secret — emperors used star charts to guide dynasties. Let AI decode your star chart today!',
        '⭐ Perfect weekend for stargazing — of the metaphysical kind! Zi Wei maps 108 stars across 12 life palaces. Ready to explore yours?',
        '🔮 Weekend special: Zi Wei Dou Shu, the "king of all divination arts." Shao Kangjie once predicted a century of Song Dynasty fate with it. What does your chart reveal?',
      ],
    },
    recommendType: 'ziwei',
    priority: 100,
    enabled: true,
  },
  {
    name: 'New User Welcome',
    condition: { stage: 'new' },
    messages: {
      zh: [
        '🏛️ 歡迎來到玄機！八字命理是中國最古老的命運密碼——曹操、諸葛亮都曾用它洞察天機。從你的生辰開始，解鎖屬於你的人生地圖吧！',
        '✨ 第一次來？推薦從八字命理開始！袁天罡曾以八字預測武則天稱帝，這門千年智慧，現在AI幫你秒級解讀。',
        '🎯 萬事開頭難？八字是所有命理的基石。就像三國的諸葛亮借東風前先觀天象，了解自己，從八字開始。',
        '🌟 初來乍到？八字命理最適合入門！劉伯溫以八字輔佐朱元璋建立明朝，這門學問現在觸手可及。',
      ],
      en: [
        '🏛️ Welcome to Xuanji! BaZi is China\'s oldest destiny code — Zhuge Liang and Cao Cao used it to read fate. Start with your birth chart and unlock your life map!',
        '✨ First time here? Start with BaZi! Yuan Tiangang once predicted Wu Zetian would become empress using BaZi. Now AI reads yours in seconds.',
        '🎯 Not sure where to begin? BaZi is the foundation of all Chinese metaphysics. Like Zhuge Liang reading the heavens before borrowing the east wind — start with BaZi.',
        '🌟 New here? BaZi is perfect for beginners! Liu Bowen used BaZi to help Zhu Yuanzhang found the Ming Dynasty. Now this wisdom is at your fingertips.',
      ],
    },
    recommendType: 'bazi',
    priority: 10,
    enabled: true,
  },
  {
    name: 'Beginner Explorer',
    condition: { stage: 'beginner' },
    messages: {
      zh: [
        '🪙 已經體驗過八字了？試試六爻占卜吧！姜子牙以蓍草起卦輔佐周武王伐紂，六爻能精準斷事吉凶，幫你看清眼前的困惑。',
        '📖 歡迎回來！你可以試試六爻占卜——京房以此術名震漢朝，專門針對具體問題給出明確答案。有什麼疑問就問吧！',
        '🔮 回來啦！試試六爻占卜如何？鬼谷子弟子孫臏就善用此術決策軍事。想問什麼具體的事？六爻能給你一個清晰的答案。',
      ],
      en: [
        '🪙 Tried BaZi already? Try Liu Yao! Jiang Ziya used yarrow stalks to counsel King Wu. Liu Yao gives precise answers to specific questions.',
        '📖 Welcome back! Try Liu Yao divination — Jing Fang made it famous in the Han Dynasty. Got a specific question? Liu Yao gives clear answers.',
        '🔮 Back for more! How about Liu Yao? Sun Bin used similar methods for military strategy. Ask about anything specific — Liu Yao delivers clarity.',
      ],
    },
    recommendType: 'liuyao',
    priority: 10,
    enabled: true,
  },
  {
    name: 'Intermediate Seeker',
    condition: { stage: 'intermediate' },
    messages: {
      zh: [
        '🧭 資深玩家你好！奇門遁甲被譽為「帝王之學」——諸葛亮借東風、劉伯溫助朱元璋，靠的都是奇門。來體驗最高級的時空決策術？',
        '⚡ 玄機老朋友！你該試試奇門遁甲了。張良用它幫劉邦奪天下，它能幫你找到最佳時機和方位。準備好了嗎？',
        '🌀 進階時刻！奇門遁甲融合天文、地理、人事於一體，是古代最高級的決策系統。李淳風以此術輔佐唐太宗，現在輪到你了。',
      ],
      en: [
        '🧭 Welcome back, experienced seeker! Qi Men Dun Jia is the "Emperor\'s Art" — Zhuge Liang and Liu Bowen both used it. Ready for advanced space-time strategy?',
        '⚡ Old friend! Time to try Qi Men Dun Jia. Zhang Liang used it to help Liu Bang conquer the empire. It finds optimal timing and direction for you.',
        '🌀 Level up! Qi Men Dun Jia combines astronomy, geography, and human affairs — the most advanced decision system of ancient China. Your turn!',
      ],
    },
    recommendType: 'qimen',
    priority: 10,
    enabled: true,
  },
  {
    name: 'Advanced/Expert',
    condition: { stage: 'advanced' },
    messages: {
      zh: [
        '🌸 大師級用戶！試試梅花易數——邵康節觀梅花落瓣而起卦，隨時隨地皆可占卜。以數起卦，體用生剋，精準預測具體事項。',
        '🏯 歡迎回來！今天來看看風水如何？楊筠松被譽為「風水祖師」，一套堪輿之術影響千年。讓AI分析你的居所格局吧。',
        '⭐ 資深用戶你好！試試紫微斗數深度解盤？陳摶老祖傳下的星盤之學，108顆星曜各有玄機。來一次全面的命運透視！',
        '🧭 高手再臨！奇門遁甲有新的時局可以分析——天地人三盤交匯，每個時辰都有獨特的能量格局。抓住當下天機！',
      ],
      en: [
        '🌸 Master-level user! Try Plum Blossom numerology — Shao Kangjie created it by watching plum petals fall. Divination anytime, anywhere.',
        '🏯 Welcome back! How about Feng Shui today? Yang Yunsong, the "Grandfather of Feng Shui," shaped a millennium of practice. Let AI analyze your space.',
        '⭐ Expert returning! Try a deep Zi Wei chart reading? 108 stars mapped by Chen Tuan himself — a complete destiny panorama awaits.',
        '🧭 Advanced user! Qi Men has fresh temporal formations to analyze — heaven, earth, and human panels converge. Seize the moment!',
      ],
    },
    recommendType: null,
    priority: 10,
    enabled: true,
  },
]

async function main() {
  console.log('Seeding welcome rules...')
  for (const rule of rules) {
    await prisma.welcomeRule.create({ data: rule })
  }
  console.log(`Created ${rules.length} welcome rules`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
