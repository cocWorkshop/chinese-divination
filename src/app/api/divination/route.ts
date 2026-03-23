export const dynamic = 'force-dynamic'
// Allow long-running LLM calls (up to 10 minutes)
export const maxDuration = 600

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkDivinationCredits, deductDivinationCredit } from '@/lib/rateLimit'
import { calculateBazi, BaziChart } from '@/lib/baziCalculator'
import { calculateZiwei, ZiweiChart } from '@/lib/ziweiCalculator'
import { calculateQimen, QimenChart } from '@/lib/qimenCalculator'
import { calculateLiuYao, LiuYaoChart } from '@/lib/liuyaoCalculator'
import { calculateMeihua, MeihuaChart } from '@/lib/meihuaCalculator'
import { logLlmCall } from '@/lib/llmLogger'
import { Lunar } from 'lunar-typescript'

const refFileMap: Record<string, string> = {
  bazi: 'bazi.md',
  iching: 'iching.md',
  liuyao: 'liuyao.md',
  ziwei: 'ziwei.md',
  qimen: 'qimen.md',
  fengshui: 'fengshui.md',
  other: 'others.md',
}

const schemas: Record<string, object> = {
  bazi: {
    type: 'bazi',
    pillars: {
      year: { stem: '天干', branch: '地支', element: '五行属性(金/木/水/火/土)', nayin: '纳音' },
      month: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
      day: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
      hour: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
    },
    dayMaster: { stem: '日主天干', element: '五行属性', strength: 'strong|weak|neutral', strengthLabel: '身强/身弱/中和' },
    fiveElements: { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 },
    luckyElements: ['喜用五行'],
    avoidElements: ['忌神五行'],
    sections: {
      overview: '命主性格与出身分析(150+字)：日主强弱、性格特征、家庭出身、六亲关系',
      career: '事业官运分析(150+字)：适合行业、发展方向、贵人运',
      marriage: '婚姻感情分析(150+字)：配偶特征、婚姻质量、感情运势',
      wealth: '财运分析(150+字)：正财偏财、理财建议、财运高峰期',
      health: '健康分析(100+字)：易患疾病、养生建议',
      daYunDetail: '大运精批(300+字)：逐个分析每步大运（共8步），点出每步大运的重点领域和需注意的流年。格式：每步大运单独一段，标注起止年份',
    },
    keyAdvice: ['建议一', '建议二', '建议三'],
    luckyInfo: { numbers: [1, 2], colors: ['颜色'], directions: ['方位'] },
    suggestedQuestions: ['根据此人命局，提一个最让人好奇「命中注定」的问题(15字内)', '此人一生中最大的转机藏在哪里？据此提一个让人想深挖的问题(15字内)', '此人命中有什么隐藏的危机？提一个让人警醒的问题(15字内)'],
  },
  iching: {
    type: 'iching',
    hexagram: {
      number: 1, name: '卦名(单字)', chineseName: '卦全名如风雷益',
      upperTrigram: { name: '上卦名', symbol: '☰', element: '风/雷/水/火/山/泽/天/地' },
      lowerTrigram: { name: '下卦名', symbol: '☷', element: '五行' },
      lines: [1, 0, 1, 1, 0, 1],
    },
    judgment: '卦辞原文', image: '象辞解析', interpretation: '针对问题的解读(100+字)',
    changingLines: [{ position: 3, text: '变爻说明' }],
    advice: '具体建议(100+字)', outcome: '吉/凶/中/大吉/小凶',
    keyPoints: ['要点一', '要点二', '要点三'],
    suggestedQuestions: ['此卦暗示的最大变数是什么？提一个让人想追问的问题(15字内)', '如何借卦象之势扭转局面？提一个实用的破局问题(15字内)', '此卦最容易忽略的警示是什么？提一个让人警觉的问题(15字内)'],
  },
  liuyao: {
    type: 'liuyao',
    guaCi: '卦辞原文及解析(100字以上)',
    yaoCi: '相关爻辞解析(100字以上，重点变爻)',
    interpretation: '针对问题的综合解读(200字以上)',
    sixRelativeAnalysis: '六亲分析：用神、原神、忌神、仇神关系(150字以上)',
    shiYingAnalysis: '世应分析(100字以上)',
    changingAnalysis: '变卦分析(若有变爻，100字以上)',
    timing: '应期判断：事情可能发生的时间(50字以上)',
    advice: '具体建议(100字以上)',
    outcome: '吉/凶/中/大吉/小凶',
    keyPoints: ['要点一', '要点二', '要点三'],
    suggestedQuestions: ['卦中用神透露了什么关键信息？提一个让人迫切想知道的问题(15字内)', '此卦的应期暗示了什么？提一个关于时机把握的问题(15字内)', '世应之间藏着什么玄机？提一个让人意外的破解问题(15字内)'],
  },
  ziwei: {
    type: 'ziwei',
    mainStars: [{ name: '紫微', palace: '命宫', element: '土' }],
    palaces: {
      '命宫': { stars: ['星名'], analysis: '分析' },
      '财帛宫': { stars: [], analysis: '' },
      '官禄宫': { stars: [], analysis: '' },
      '夫妻宫': { stars: [], analysis: '' },
      '兄弟宫': { stars: [], analysis: '' },
      '子女宫': { stars: [], analysis: '' },
      '疾厄宫': { stars: [], analysis: '' },
      '迁移宫': { stars: [], analysis: '' },
      '交友宫': { stars: [], analysis: '' },
      '田宅宫': { stars: [], analysis: '' },
      '福德宫': { stars: [], analysis: '' },
      '父母宫': { stars: [], analysis: '' },
    },
    sections: { overview: '总论(100+字)', career: '事业官禄(100+字)', marriage: '夫妻感情(100+字)', wealth: '财运(100+字)' },
    keyAdvice: ['建议一', '建议二'],
    luckyInfo: { numbers: [], colors: [], directions: [] },
    suggestedQuestions: ['命盘中最强的一颗星暗示了什么命运走向？据此提问(15字内)', '哪个宫位藏着此人最大的人生变局？据此提问(15字内)', '命盘中有什么被忽视的贵人或机遇？据此提问(15字内)'],
  },
  qimen: {
    type: 'qimen',
    palace: { inquiry: '问事宫', outcome: '结果宫', god: '值符神', star: '值符星', door: '当值门' },
    sections: { situation: '当前局势(100+字)', trend: '事态走向(100+字)', timing: '最佳时机(100+字)', strategy: '行动策略(100+字)' },
    outcome: '吉/凶/中',
    keyAdvice: ['建议一', '建议二'],
    luckyInfo: { timing: '宜在...', direction: '向...方行动' },
    suggestedQuestions: ['此局中最关键的时机窗口在哪？提一个让人想立刻行动的问题(15字内)', '奇门格局暗示的最大陷阱是什么？提一个避险问题(15字内)', '如何借此局之势实现最大突破？提一个策略性问题(15字内)'],
  },
  fengshui: {
    type: 'fengshui',
    flyingStar: { facing: '坐向如坐北朝南', period: '一运到九运', mountainStar: '山星数字', waterStar: '向星数字' },
    rooms: [{ room: '房间名', energy: '旺/平/衰/煞', suggestion: '建议' }],
    sections: { overall: '整体格局(100+字)', wealth: '财位(100+字)', health: '健康(100+字)', relationships: '人际感情(100+字)' },
    remedies: [{ issue: '问题', solution: '解决方案' }],
    keyAdvice: ['建议一', '建议二'],
    suggestedQuestions: ['当前格局中最影响财运的风水要素是什么？据此提问(15字内)', '家中哪个方位藏着最大的隐患？提一个化解问题(15字内)', '如何用最小的改动获得最大的风水提升？据此提问(15字内)'],
  },
  other: {
    type: 'other',
    subType: 'meihua或liuren',
    trigrams: {
      upper: { name: '卦名', symbol: '☰', element: '五行' },
      lower: { name: '卦名', symbol: '☷', element: '五行' },
      transformed: { name: '卦名', symbol: '☵', element: '五行' },
    },
    sections: { situation: '体卦分析(100+字)', inquiry: '用卦分析(100+字)', interaction: '体用关系(100+字)', timeline: '时间推断(100+字)' },
    outcome: '吉/凶/中',
    keyAdvice: ['建议一', '建议二', '建议三'],
    suggestedQuestions: ['体用之间的生克揭示了什么关键走向？据此提问(15字内)', '此卦最容易被忽略的变数是什么？提一个深入问题(15字内)', '如何借势破局？提一个最实用的行动问题(15字内)'],
  },
}

export async function POST(req: NextRequest) {
  const apiStart = Date.now()
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, inputData, language, question, saveProfile, saveHistory, targetType: rawTargetType, familyMemberId, newFamilyMember, readingId: preCreatedReadingId } = await req.json()
    const targetType = rawTargetType === 'family' ? 'family' : 'self'

    if (!type || !inputData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof question === 'string' && question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 characters)' }, { status: 400 })
    }

    const shouldSaveHistory = saveHistory !== false
    const shouldSaveProfile = saveProfile === true

    // When readingId is provided (from /init), skip credit/maintenance checks (already done)
    // Only fetch admin settings for model config
    const adminSettings = await prisma.adminSetting.findMany({
      where: { key: { in: preCreatedReadingId
        ? ['model1Name', 'llmTimeoutSeconds', 'llmMaxTokens']
        : ['maintenanceMode', 'divinationEnabled', 'model1Name', 'llmTimeoutSeconds', 'llmMaxTokens'] } },
    })
    const settingsMap = Object.fromEntries(adminSettings.map(s => [s.key, s.value]))

    if (!preCreatedReadingId) {
      // Legacy path: no init call, do full validation
      const rl = await checkDivinationCredits(session.user.id)
      if (settingsMap.maintenanceMode === 'true') {
        return NextResponse.json(
          { error: language !== 'en' ? '系統維護中，請稍後再試。' : 'System under maintenance. Please try again later.' },
          { status: 503 }
        )
      }
      if (settingsMap.divinationEnabled === 'false') {
        return NextResponse.json(
          { error: language !== 'en' ? '占卜功能暫時關閉，請稍後再試。' : 'Divination service is temporarily disabled.' },
          { status: 503 }
        )
      }
      if (!rl.allowed) {
        return NextResponse.json(
          { error: language === 'en' ? 'No divination credits remaining. Purchase more or share to earn credits.' : '占卜額度已用完，請購買或分享獲取更多額度。' },
          { status: 429 }
        )
      }
    }

    // Handle family member
    let resolvedFamilyMemberId: string | null = null
    let targetPersonInfo = ''
    if (targetType === 'family') {
      if (newFamilyMember?.relation) {
        // Create new family member
        const created = await prisma.familyMember.create({
          data: {
            userId: session.user.id,
            relation: newFamilyMember.relation,
            name: newFamilyMember.name || null,
            birthDate: inputData.birthDate || null,
            birthTime: inputData.birthTime || null,
            birthPlace: inputData.birthPlace || null,
            gender: inputData.gender || null,
          },
        })
        resolvedFamilyMemberId = created.id
        const relationLabel: Record<string, string> = { spouse: '配偶', father: '父亲', mother: '母亲', son: '儿子', daughter: '女儿', brother: '兄弟', sister: '姐妹', friend: '朋友', other: '其他' }
        targetPersonInfo = `此次预测对象为用户的${relationLabel[created.relation] || created.relation}${created.name ? `（${created.name}）` : ''}`
      } else if (familyMemberId) {
        // Verify existing family member belongs to user
        const member = await prisma.familyMember.findFirst({ where: { id: familyMemberId, userId: session.user.id } })
        if (!member) {
          return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
        }
        resolvedFamilyMemberId = member.id
        const relationLabel: Record<string, string> = { spouse: '配偶', father: '父亲', mother: '母亲', son: '儿子', daughter: '女儿', brother: '兄弟', sister: '姐妹', friend: '朋友', other: '其他' }
        targetPersonInfo = `此次预测对象为用户的${relationLabel[member.relation] || member.relation}${member.name ? `（${member.name}）` : ''}`
      }
    }

    // BaZi cache check moved to /api/divination/check — user chooses via UI dialog

    const refFileName = refFileMap[type] || 'others.md'
    const refPath = path.join(process.cwd(), 'divination-refs', refFileName)
    let refContent = ''
    try {
      refContent = fs.readFileSync(refPath, 'utf-8')
    } catch (refErr) {
      refContent = '（参考资料暂时不可用）'
      console.error(`Failed to read ref file ${refPath}:`, refErr)
      await prisma.frontendError.create({
        data: {
          userId: session.user.id,
          endpoint: '/api/divination',
          error: `Failed to read reference file: ${refFileName} — ${refErr instanceof Error ? refErr.message : String(refErr)}`,
          context: `type=${type}, path=${refPath}`,
        },
      }).catch(() => {})
    }

    const schema = schemas[type] || schemas.other
    const langText = language === 'en' ? 'English' : '繁體中文（Traditional Chinese）'
    const textLang = language === 'en' ? 'English' : '繁體中文'

    const systemPrompt = `You are a master of Chinese traditional divination with deep expertise in ${type}.

Reference knowledge:
${refContent}

IMPORTANT: You must respond with ONLY valid JSON. No markdown code blocks, no explanation outside the JSON.
Follow this exact JSON schema for ${type}:
${JSON.stringify(schema, null, 2)}

The user's language preference is ${langText}. Write all text values (sections, advice, analysis paragraphs) in ${textLang}.
Keep core Chinese terminology (天干地支, star names, palace names, trigram names) in Chinese regardless of language setting.
Be thorough and insightful in the text sections. Minimum 100 words per section.
For the pillars/stars/palace data fields, use proper Chinese characters (e.g. 甲乙丙丁 for stems, 子丑寅卯 for branches).`

    let userMessage: string
    let baziChart: BaziChart | null = null
    let ziweiChart: ZiweiChart | null = null
    let qimenChart: QimenChart | null = null
    let liuyaoChart: LiuYaoChart | null = null
    let meihuaChart: MeihuaChart | null = null

    // Lunar→Solar conversion if user selected lunar calendar
    let solarBirthDate = inputData.birthDate
    if (inputData.lunarToggle === 'lunar' && inputData.birthDate) {
      try {
        const [y, m, d] = inputData.birthDate.split('-').map(Number)
        const lunarDate = Lunar.fromYmd(y, m, d)
        const solarDate = lunarDate.getSolar()
        solarBirthDate = `${solarDate.getYear()}-${String(solarDate.getMonth()).padStart(2, '0')}-${String(solarDate.getDay()).padStart(2, '0')}`
        console.log(`Lunar ${inputData.birthDate} → Solar ${solarBirthDate}`)
      } catch (lunarErr) {
        console.error('Lunar conversion failed:', lunarErr)
      }
    }

    if (type === 'bazi' && solarBirthDate && (inputData.birthTime || inputData.exactTime)) {
      try {
        baziChart = calculateBazi(
          solarBirthDate,
          inputData.timeMode === 'precise' ? '' : (inputData.birthTime || ''),
          inputData.birthPlace || '',
          inputData.gender || 'male',
          inputData.timeMode === 'precise' ? inputData.exactTime : undefined
        )
        userMessage = `请为我进行八字命理精批。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
## 程序预计算的四柱命盘与大运（已验证准确，请直接使用）
${JSON.stringify({
  fourPillars: { year: baziChart.yearPillar, month: baziChart.monthPillar, day: baziChart.dayPillar, hour: baziChart.hourPillar },
  dayMaster: baziChart.dayMaster,
  fiveElements: baziChart.fiveElements,
  strength: baziChart.strength,
  strengthLabel: baziChart.strengthLabel,
  luckyElements: baziChart.luckyElements,
  avoidElements: baziChart.avoidElements,
  qiYun: baziChart.qiYun,
  daYun: baziChart.daYun,
}, null, 2)}

## 用户输入
- 出生日期：${solarBirthDate}（公历）${inputData.lunarToggle === 'lunar' ? `（用户输入农历 ${inputData.birthDate}）` : ''}
- 出生时辰：${inputData.timeMode === 'precise' ? inputData.exactTime : inputData.birthTime}${inputData.timeMode === 'precise' ? '（精确时间，已真太阳时校正）' : '（模糊时辰）'}
- 出生地：${inputData.birthPlace || '未提供'}
- 性别：${inputData.gender}
${inputData.birthEnvironment ? `- 出生地环境：${inputData.birthEnvironment}` : ''}
${question ? `- 特别关注：${question}` : ''}

## 解盘要求
你是资深命理师，请基于以上命盘进行精批。数据中每柱包含：十神(tenGods)、十二长生(changSheng)、空亡(kongWang)、神煞(shenSha)，请充分利用。
1. **overview**：命主性格、出身家庭、六亲关系（150字以上）
2. **career**：事业方向、适合行业、贵人运（150字以上）
3. **marriage**：配偶特征、婚姻质量、感情运势（150字以上）
4. **wealth**：正财偏财分析、理财建议（150字以上）
5. **health**：易患疾病、养生注意（100字以上）
6. **daYunDetail**：逐步精批每个10年大运（共${baziChart.daYun.length}步），标注每步大运起止年份，点出重点领域和需要注意的流年（300字以上）

四柱和大运数据以程序计算结果为准，你只负责解盘分析。`
      } catch (e) {
        console.error('BaZi calculation error:', e)
        userMessage = `请为我进行${type}分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
      }
    } else if (type === 'ziwei' && solarBirthDate && inputData.birthTime) {
      try {
        ziweiChart = calculateZiwei(
          solarBirthDate,
          inputData.birthTime,
          inputData.gender || 'male'
        )
        const palaceSummary = ziweiChart.palaces.map(p => ({
          name: p.name,
          heavenlyStem: p.heavenlyStem,
          earthlyBranch: p.earthlyBranch,
          majorStars: p.majorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen })),
          minorStars: p.minorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen })),
          isBodyPalace: p.isBodyPalace,
          decadal: p.decadal,
        }))
        userMessage = `请为我进行紫微斗数命盘精批。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
## 程序预计算的紫微斗数命盘（已验证准确，请直接使用）
${JSON.stringify({
  basicInfo: {
    solarDate: ziweiChart.solarDate,
    lunarDate: ziweiChart.lunarDate,
    chineseDate: ziweiChart.chineseDate,
    time: ziweiChart.time,
    zodiac: ziweiChart.zodiac,
    gender: ziweiChart.gender,
    fiveElementsClass: ziweiChart.fiveElementsClass,
    soul: ziweiChart.soul,
    body: ziweiChart.body,
  },
  siHua: ziweiChart.siHua,
  palaces: palaceSummary,
}, null, 2)}

## 用户输入
- 出生日期：${solarBirthDate}（公历）${inputData.lunarToggle === 'lunar' ? `（用户输入农历 ${inputData.birthDate}）` : ''}
- 出生时辰：${ziweiChart.time}
- 性别：${inputData.gender}
${question ? `- 特别关注：${question}` : ''}

## 解盘要求
你是资深紫微斗数命理师，请基于以上程序排出的命盘进行精批。重点：
1. **overview**：命主性格特质、命宫主星分析、身宫解读、五行局含义（150字以上）
2. **career**：官禄宫主星分析、事业方向、适合行业、三方四正格局（150字以上）
3. **marriage**：夫妻宫主星分析、配偶特征、婚姻质量（150字以上）
4. **wealth**：财帛宫主星分析、财运格局、正财偏财（150字以上）

关于palaces中各宫的分析(analysis字段)：请为每个宫位写50-100字的分析。
四化飞星和星耀数据以程序计算结果为准，你只负责解盘分析。`
      } catch (e) {
        console.error('Ziwei calculation error:', e)
        userMessage = `请为我进行${type}分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
      }
    } else if (type === 'qimen') {
      try {
        // Use current time for Qi Men chart (or parse from inputData if provided)
        const qimenTime = inputData.dateTime ? new Date(inputData.dateTime) : new Date()
        qimenChart = calculateQimen(qimenTime)
        userMessage = `请为我进行奇门遁甲排盘分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
## 程序预计算的奇门遁甲盘（已验证准确，请直接使用）
${JSON.stringify({
  timeInfo: {
    year: qimenChart.year,
    month: qimenChart.month,
    day: qimenChart.day,
    hour: qimenChart.hour,
    solarTerm: qimenChart.solarTerm,
    roundLabel: qimenChart.roundLabel,
  },
  zhiFu: qimenChart.zhiFu,
  zhiShi: qimenChart.zhiShi,
  palaces: qimenChart.palaces.map(p => ({
    name: p.name,
    direction: p.direction,
    star: p.star,
    door: p.door,
    divinity: p.divinity,
    heavenStem: p.heavenStem,
    earthStem: p.earthStem,
  })),
}, null, 2)}

## 用户输入
- 起局时间：${qimenChart.year}年 ${qimenChart.month}月 ${qimenChart.day}日 ${qimenChart.hour}时
- 节气：${qimenChart.solarTerm}
- 局数：${qimenChart.roundLabel}
${question ? `- 求测问题：${question}` : '- 求测问题：综合运势'}

## 解盘要求
你是资深奇门遁甲术数师，请基于以上程序排出的奇门盘进行分析。重点：
1. **situation**：分析当前格局，值符${qimenChart.zhiFu}和值使${qimenChart.zhiShi}的含义（100字以上）
2. **trend**：从九宫格局分析事态走向，特别关注天盘与地盘天干的关系（100字以上）
3. **timing**：根据八门旺衰判断最佳时机（100字以上）
4. **strategy**：综合星、门、神给出行动策略（100字以上）

同时请判断整体吉凶(outcome字段)，并确定palace字段中的inquiry(问事宫)、outcome(结果宫)、god(值符神)、star(值符星)、door(当值门)。
九宫数据以程序计算结果为准，你只负责解盘分析。`
      } catch (e) {
        console.error('Qimen calculation error:', e)
        userMessage = `请为我进行${type}分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
      }
    } else if (type === 'other' && solarBirthDate && inputData.birthTime) {
      try {
        meihuaChart = calculateMeihua(solarBirthDate, inputData.birthTime)
        userMessage = `请为我进行梅花易数排卦分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
## 程序预计算的梅花易数卦象（已验证准确，请直接使用）
${JSON.stringify({
  timeNumbers: {
    lunarYear: meihuaChart.lunarYear,
    lunarMonth: meihuaChart.lunarMonth,
    lunarDay: meihuaChart.lunarDay,
    yearBranch: meihuaChart.yearBranch,
    yearNum: meihuaChart.yearNum,
    monthNum: meihuaChart.monthNum,
    dayNum: meihuaChart.dayNum,
    hourNum: meihuaChart.hourNum,
  },
  calculation: {
    upperSum: `${meihuaChart.yearNum}+${meihuaChart.monthNum}+${meihuaChart.dayNum}=${meihuaChart.yearNum + meihuaChart.monthNum + meihuaChart.dayNum}, %8=${meihuaChart.upperNum}`,
    lowerSum: `${meihuaChart.yearNum}+${meihuaChart.monthNum}+${meihuaChart.dayNum}+${meihuaChart.hourNum}=${meihuaChart.yearNum + meihuaChart.monthNum + meihuaChart.dayNum + meihuaChart.hourNum}, %8=${meihuaChart.lowerNum}`,
    changingLine: meihuaChart.changingLine,
  },
  benGua: { name: meihuaChart.benGua.name, upper: meihuaChart.benGua.upper.name, lower: meihuaChart.benGua.lower.name, lines: meihuaChart.benGua.lines },
  huGua: { name: meihuaChart.huGua.name, upper: meihuaChart.huGua.upper.name, lower: meihuaChart.huGua.lower.name },
  bianGua: { name: meihuaChart.bianGua.name, upper: meihuaChart.bianGua.upper.name, lower: meihuaChart.bianGua.lower.name },
  tiYong: {
    tiGua: `${meihuaChart.tiGua.name}(${meihuaChart.tiGua.element})`,
    yongGua: `${meihuaChart.yongGua.name}(${meihuaChart.yongGua.element})`,
    relation: meihuaChart.tiYongRelation,
    analysis: meihuaChart.tiYongAnalysis,
  },
}, null, 2)}

## 用户输入
- 出生日期：${solarBirthDate}（公历）${inputData.lunarToggle === 'lunar' ? `（用户输入农历 ${inputData.birthDate}）` : ''}
- 时辰：${inputData.birthTime}
${question ? `- 求测问题：${question}` : '- 求测问题：综合运势'}

## 解卦要求
你是资深梅花易数术数师，请基于以上程序排出的卦象进行分析。重点：
1. **situation**：本卦（${meihuaChart.benGua.name}）的卦象含义和当前处境分析（100字以上）
2. **inquiry**：用卦分析，以动爻变化论述所问之事（100字以上）
3. **interaction**：体用生克关系详析（${meihuaChart.tiYongRelation}），结合互卦（${meihuaChart.huGua.name}）论中期发展（100字以上）
4. **timeline**：结合变卦（${meihuaChart.bianGua.name}）推断事物最终走向和应期（100字以上）

同时设置subType为"meihua"。卦象数据以程序计算结果为准，你只负责解卦分析。
关于trigrams字段：upper对应体卦，lower对应用卦，transformed对应变卦。`
      } catch (e) {
        console.error('Meihua calculation error:', e)
        userMessage = `请为我进行${type}分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
      }
    } else if (type === 'liuyao' && inputData.liuyaoLines) {
      try {
        const rawLines = JSON.parse(inputData.liuyaoLines)
        liuyaoChart = calculateLiuYao(rawLines)
        const orig = liuyaoChart.originalHexagram
        const changed = liuyaoChart.changedHexagram
        userMessage = `请为我进行六爻占卜解卦。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
## 程序预计算的六爻卦象（已验证准确，请直接使用）
${JSON.stringify({
  originalHexagram: {
    name: orig.name,
    fullName: orig.fullName,
    number: orig.number,
    palace: orig.palace,
    palaceElement: orig.palaceElement,
    upperTrigram: { name: orig.upperTrigram.name, symbol: orig.upperTrigram.symbol, element: orig.upperTrigram.element, nature: orig.upperTrigram.nature },
    lowerTrigram: { name: orig.lowerTrigram.name, symbol: orig.lowerTrigram.symbol, element: orig.lowerTrigram.element, nature: orig.lowerTrigram.nature },
    lines: orig.lines.map(l => ({
      position: l.position,
      yaoName: l.yaoName,
      value: l.value,
      isYang: l.isYang,
      isChanging: l.isChanging,
      branch: l.branch,
      element: l.element,
      sixRelative: l.sixRelative,
      isShiYao: l.isShiYao,
      isYingYao: l.isYingYao,
    })),
  },
  changedHexagram: changed ? {
    name: changed.name,
    fullName: changed.fullName,
    number: changed.number,
    lines: changed.lines.map(l => ({
      position: l.position,
      branch: l.branch,
      element: l.element,
      sixRelative: l.sixRelative,
    })),
  } : null,
  changingLines: liuyaoChart.changingLines,
  castTime: liuyaoChart.castTime,
}, null, 2)}

## 用户问题
${question || '综合问事'}

## 解卦要求
你是资深六爻术数师，请基于以上程序排出的卦象进行断卦。重点：
1. **guaCi**：本卦（${orig.fullName}）卦辞及解析（100字以上）
2. **yaoCi**：相关爻辞解析，重点变爻（100字以上）
3. **interpretation**：针对问题的综合解读，结合六亲、世应、用神分析（200字以上）
4. **sixRelativeAnalysis**：六亲关系分析——确定用神、原神、忌神、仇神（150字以上）
5. **shiYingAnalysis**：世应分析——世爻代表求卦人，应爻代表对方/事物（100字以上）
${changed ? `6. **changingAnalysis**：变卦（${changed.fullName}）分析——事物最终走向（100字以上）` : ''}
7. **timing**：应期判断——事情可能发生的时间（50字以上）
8. **advice**：具体建议（100字以上）

卦象数据以程序计算结果为准，你只负责解卦分析。`
      } catch (e) {
        console.error('LiuYao calculation error:', e)
        userMessage = `请为我进行六爻占卜分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
      }
    } else {
      userMessage = `请为我进行${type}分析。
${targetPersonInfo ? `\n${targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(inputData, null, 2)}
${question ? `特别关注：${question}` : ''}`
    }

    // Build calculation data early for the pending reading
    const earlyCalculationData: Record<string, unknown> = {}
    if (baziChart) earlyCalculationData.bazi = baziChart
    if (ziweiChart) earlyCalculationData.ziwei = ziweiChart
    if (qimenChart) earlyCalculationData.qimen = qimenChart
    if (meihuaChart) earlyCalculationData.meihua = meihuaChart
    if (liuyaoChart) earlyCalculationData.liuyao = liuyaoChart
    const earlyCalculationDataStr = Object.keys(earlyCalculationData).length > 0 ? JSON.stringify(earlyCalculationData) : null

    // Use pre-created reading from /api/divination/init, or create one now as fallback
    let pendingReadingId: string | null = preCreatedReadingId || null
    if (shouldSaveHistory && !pendingReadingId) {
      const pendingReading = await prisma.reading.create({
        data: {
          userId: session.user.id,
          type,
          modelTier: "model1",
          status: 'pending',
          question: question || null,
          inputData,
          result: '',
          calculationData: earlyCalculationDataStr,
          language: language || 'zh-TW',
          targetType,
          familyMemberId: resolvedFamilyMemberId,
        },
      })
      pendingReadingId = pendingReading.id
    }
    // Update pre-created reading with calculation data if available
    if (pendingReadingId && earlyCalculationDataStr && preCreatedReadingId) {
      prisma.reading.update({
        where: { id: pendingReadingId },
        data: { calculationData: earlyCalculationDataStr },
      }).catch(() => {})
    }

    if (!process.env.OPENROUTER_API_KEY) {
      if (pendingReadingId) {
        await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: 'AI service not configured' } }).catch(() => {})
      }
      return NextResponse.json(
        { error: language !== 'en' ? 'AI服務未配置，請聯繫管理員。' : 'AI service not configured.' },
        { status: 503 }
      )
    }

    // Use pre-fetched admin settings
    const modelName = settingsMap.model1Name || 'anthropic/claude-3-5-haiku'
    const isLocalProxy = modelName === 'local/claude-proxy'
    const PROXY_URL = process.env.CLAUDE_PROXY_URL || 'http://127.0.0.1:8095'
    const llmTimeoutMs = (parseInt(settingsMap.llmTimeoutSeconds || '240', 10) || 240) * 1000
    const llmMaxTokens = parseInt(settingsMap.llmMaxTokens || '8192', 10) || 8192

    let resultText: string
    const preLlmMs = Date.now() - apiStart
    const llmStart = Date.now()

    if (isLocalProxy) {
      // Route through local Claude CLI proxy
      try {
        const proxyRes = await fetch(`${PROXY_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: llmMaxTokens,
          }),
          signal: AbortSignal.timeout(llmTimeoutMs),
        })

        if (!proxyRes.ok) {
          const errBody = await proxyRes.json().catch(() => ({ error: 'Proxy error' }))
          throw new Error(errBody.error || `Proxy returned ${proxyRes.status}`)
        }

        const proxyData = await proxyRes.json()
        resultText = proxyData.choices?.[0]?.message?.content || ''

        await logLlmCall({
          userId: session.user.id,
          endpoint: 'divination',
          model: 'local/claude-proxy',
          modelTier: "model1",
          promptTokens: proxyData.usage?.prompt_tokens || 0,
          completionTokens: proxyData.usage?.completion_tokens || 0,
          totalTokens: proxyData.usage?.total_tokens || 0,
          latencyMs: Date.now() - llmStart,
          status: 'success',
          inputPreview: userMessage,
          systemPrompt,
          outputPreview: resultText,
        })
      } catch (proxyErr: unknown) {
        const err = proxyErr as { message?: string }
        await logLlmCall({
          userId: session.user.id,
          endpoint: 'divination',
          model: 'local/claude-proxy',
          modelTier: "model1",
          latencyMs: Date.now() - llmStart,
          status: 'error',
          errorMessage: err?.message || 'Proxy error',
          inputPreview: userMessage,
          systemPrompt,
        })
        if (pendingReadingId) {
          await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: err?.message || 'Proxy error' } }).catch(() => {})
        }
        return NextResponse.json(
          { error: language !== 'en' ? `本地代理錯誤：${err?.message || '未知錯誤'}` : `Local proxy error: ${err?.message || 'Unknown'}` },
          { status: 502 }
        )
      }
    } else {
      // Route through OpenRouter
      const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        timeout: llmTimeoutMs,
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:8094',
          'X-Title': 'Xuanji Divination',
        },
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), llmTimeoutMs)
      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          max_tokens: llmMaxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }, { signal: controller.signal as AbortSignal })
        clearTimeout(timeoutId)
        resultText = completion.choices[0]?.message?.content || ''

        await logLlmCall({
          userId: session.user.id,
          endpoint: 'divination',
          model: modelName,
          modelTier: "model1",
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
          latencyMs: Date.now() - llmStart,
          status: 'success',
          inputPreview: userMessage,
          systemPrompt,
          outputPreview: resultText,
        })
      } catch (apiErr: unknown) {
        clearTimeout(timeoutId)
        console.error('OpenRouter API error:', apiErr)
        const err = apiErr as { status?: number; message?: string }

        await logLlmCall({
          userId: session.user.id,
          endpoint: 'divination',
          model: modelName,
          modelTier: "model1",
          latencyMs: Date.now() - llmStart,
          status: 'error',
          errorMessage: err?.message || 'Unknown error',
          inputPreview: userMessage,
          systemPrompt,
        })

        // Mark pending reading as failed
        if (pendingReadingId) {
          await prisma.reading.update({ where: { id: pendingReadingId }, data: { status: 'failed', result: err?.message || 'LLM error' } }).catch(() => {})
        }

        if (err?.status === 401) {
          return NextResponse.json(
            { error: language !== 'en' ? 'AI服務API密鑰無效，請檢查配置。' : 'AI API key is invalid.' },
            { status: 401 }
          )
        }
        if (err?.status === 402) {
          return NextResponse.json(
            { error: language !== 'en' ? 'OpenRouter餘額不足，請前往 openrouter.ai 充值。' : 'OpenRouter credits exhausted. Please top up at openrouter.ai.' },
            { status: 402 }
          )
        }
        if (err?.status === 429) {
          return NextResponse.json(
            { error: language !== 'en' ? 'AI請求過於頻繁，請稍後再試。' : 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }
        return NextResponse.json(
          { error: language !== 'en' ? `AI服務錯誤：${err?.message || '未知錯誤'}` : `AI service error: ${err?.message || 'Unknown'}` },
          { status: 502 }
        )
      }
    }

    // Parse JSON from Claude's response — handle various LLM output formats
    let structuredResult: Record<string, unknown>
    try {
      let cleaned = resultText.trim()
      // Extract JSON from markdown code blocks (```json ... ``` or ``` ... ```)
      const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
      if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim()
      }
      // Also try stripping leading/trailing non-JSON text to find the JSON object
      if (!cleaned.startsWith('{')) {
        const firstBrace = cleaned.indexOf('{')
        if (firstBrace !== -1) {
          cleaned = cleaned.substring(firstBrace)
        }
      }
      if (!cleaned.endsWith('}')) {
        const lastBrace = cleaned.lastIndexOf('}')
        if (lastBrace !== -1) {
          cleaned = cleaned.substring(0, lastBrace + 1)
        }
      }
      structuredResult = JSON.parse(cleaned)
    } catch {
      // Fallback: wrap as generic structure for ResultRenderer to handle
      structuredResult = { type, raw: resultText, sections: { overview: resultText }, keyAdvice: [] }
    }

    // Merge programmatic BaZi data with LLM interpretation
    if (type === 'bazi' && baziChart) {
      structuredResult.pillars = {
        year: baziChart.yearPillar,
        month: baziChart.monthPillar,
        day: baziChart.dayPillar,
        hour: baziChart.hourPillar,
      }
      structuredResult.dayMaster = {
        ...(structuredResult.dayMaster as object || {}),
        stem: baziChart.dayMaster.stem,
        element: baziChart.dayMaster.element,
        yinYang: baziChart.dayMaster.yinYang,
        strength: baziChart.strength,
        strengthLabel: baziChart.strengthLabel,
      }
      structuredResult.fiveElements = baziChart.fiveElements
      if (baziChart.trueSolarTime) {
        structuredResult.trueSolarTime = baziChart.trueSolarTime
      }
      structuredResult.daYun = baziChart.daYun
      structuredResult.xiaoYun = baziChart.xiaoYun
      structuredResult.qiYun = baziChart.qiYun
      if (!structuredResult.luckyElements || (structuredResult.luckyElements as string[]).length === 0) {
        structuredResult.luckyElements = baziChart.luckyElements
      }
      if (!structuredResult.avoidElements || (structuredResult.avoidElements as string[]).length === 0) {
        structuredResult.avoidElements = baziChart.avoidElements
      }
    }

    // Merge programmatic Ziwei data with LLM interpretation
    if (type === 'ziwei' && ziweiChart) {
      structuredResult.ziweiChart = {
        solarDate: ziweiChart.solarDate,
        lunarDate: ziweiChart.lunarDate,
        chineseDate: ziweiChart.chineseDate,
        time: ziweiChart.time,
        timeRange: ziweiChart.timeRange,
        zodiac: ziweiChart.zodiac,
        sign: ziweiChart.sign,
        gender: ziweiChart.gender,
        fiveElementsClass: ziweiChart.fiveElementsClass,
        soul: ziweiChart.soul,
        body: ziweiChart.body,
        earthlyBranchOfSoulPalace: ziweiChart.earthlyBranchOfSoulPalace,
        earthlyBranchOfBodyPalace: ziweiChart.earthlyBranchOfBodyPalace,
        siHua: ziweiChart.siHua,
      }
      // Override palaces with programmatic data, keep LLM analysis
      const llmPalaces = (structuredResult.palaces || {}) as Record<string, { stars?: string[]; analysis?: string }>
      const mergedPalaces: Record<string, unknown> = {}
      for (const palace of ziweiChart.palaces) {
        const llmPalace = llmPalaces[palace.name] || {}
        mergedPalaces[palace.name] = {
          stars: [
            ...palace.majorStars.map(s => s.mutagen ? `${s.name}(${s.mutagen})` : s.name),
            ...palace.minorStars.map(s => s.mutagen ? `${s.name}(${s.mutagen})` : s.name),
          ],
          majorStars: palace.majorStars,
          minorStars: palace.minorStars,
          adjectiveStars: palace.adjectiveStars,
          heavenlyStem: palace.heavenlyStem,
          earthlyBranch: palace.earthlyBranch,
          isBodyPalace: palace.isBodyPalace,
          changsheng12: palace.changsheng12,
          decadal: palace.decadal,
          ages: palace.ages,
          analysis: llmPalace.analysis || '',
        }
      }
      structuredResult.palaces = mergedPalaces
      // Build mainStars from programmatic data
      const mainStars: { name: string; palace: string; brightness?: string; mutagen?: string }[] = []
      for (const palace of ziweiChart.palaces) {
        for (const star of palace.majorStars) {
          mainStars.push({ name: star.name, palace: palace.name, brightness: star.brightness, mutagen: star.mutagen })
        }
      }
      structuredResult.mainStars = mainStars
    }

    // Merge programmatic Qimen data with LLM interpretation
    if (type === 'qimen' && qimenChart) {
      structuredResult.qimenChart = {
        year: qimenChart.year,
        month: qimenChart.month,
        day: qimenChart.day,
        hour: qimenChart.hour,
        solarTerm: qimenChart.solarTerm,
        round: qimenChart.round,
        roundLabel: qimenChart.roundLabel,
        zhiFu: qimenChart.zhiFu,
        zhiShi: qimenChart.zhiShi,
        palaces: qimenChart.palaces,
        grid: qimenChart.grid,
      }
    }

    // Merge programmatic Meihua data with LLM interpretation
    if (type === 'other' && meihuaChart) {
      structuredResult.meihuaChart = {
        lunarYear: meihuaChart.lunarYear,
        lunarMonth: meihuaChart.lunarMonth,
        lunarDay: meihuaChart.lunarDay,
        shichen: meihuaChart.shichen,
        yearBranch: meihuaChart.yearBranch,
        yearNum: meihuaChart.yearNum,
        monthNum: meihuaChart.monthNum,
        dayNum: meihuaChart.dayNum,
        hourNum: meihuaChart.hourNum,
        upperNum: meihuaChart.upperNum,
        lowerNum: meihuaChart.lowerNum,
        changingLine: meihuaChart.changingLine,
        benGua: meihuaChart.benGua,
        huGua: meihuaChart.huGua,
        bianGua: meihuaChart.bianGua,
        tiGua: meihuaChart.tiGua,
        yongGua: meihuaChart.yongGua,
        tiYongRelation: meihuaChart.tiYongRelation,
        tiYongAnalysis: meihuaChart.tiYongAnalysis,
      }
      // Override trigrams with programmatic data
      structuredResult.trigrams = {
        upper: { name: meihuaChart.benGua.upper.name, symbol: meihuaChart.benGua.upper.symbol, element: meihuaChart.benGua.upper.element },
        lower: { name: meihuaChart.benGua.lower.name, symbol: meihuaChart.benGua.lower.symbol, element: meihuaChart.benGua.lower.element },
        transformed: { name: meihuaChart.bianGua.upper.name, symbol: meihuaChart.bianGua.upper.symbol, element: meihuaChart.bianGua.upper.element },
      }
      if (!structuredResult.subType) {
        structuredResult.subType = 'meihua'
      }
    }

    const resultToStore = JSON.stringify(structuredResult)

    const llmPromptStr = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userMessage}`

    // CRITICAL: Save result + deduct credits immediately after LLM completes.
    // These must complete even if client disconnects (Cloudflare 524 / timeout).
    const postOps: Promise<unknown>[] = [
      deductDivinationCredit(session.user.id),
    ]

    let savedReading: Record<string, unknown> | null = null
    if (shouldSaveHistory && pendingReadingId) {
      postOps.push(
        prisma.reading.update({
          where: { id: pendingReadingId },
          data: {
            status: 'completed',
            result: resultToStore,
            llmPrompt: llmPromptStr,
            llmRawOutput: resultText,
          },
        }).then(r => { savedReading = r })
      )
    }

    if (shouldSaveProfile && (type === 'bazi' || type === 'ziwei')) {
      const profileUpdate: Record<string, string | null> = {}
      if (inputData.birthDate) profileUpdate.birthDate = inputData.birthDate
      if (inputData.birthTime) profileUpdate.birthTime = inputData.birthTime
      if (inputData.birthPlace) profileUpdate.birthPlace = inputData.birthPlace
      if (inputData.gender) profileUpdate.gender = inputData.gender
      if (Object.keys(profileUpdate).length > 0) {
        if (targetType === 'family' && resolvedFamilyMemberId) {
          postOps.push(prisma.familyMember.update({ where: { id: resolvedFamilyMemberId }, data: profileUpdate }))
        } else {
          postOps.push(prisma.user.update({ where: { id: session.user.id }, data: profileUpdate }))
        }
      }
    }

    // Run all post-LLM DB operations in parallel
    const postStart = Date.now()
    await Promise.all(postOps)
    const postLlmMs = Date.now() - postStart
    const totalMs = Date.now() - apiStart
    console.log(`[divination] type=${type} total=${totalMs}ms pre=${preLlmMs}ms llm=${postStart - llmStart}ms post=${postLlmMs}ms user=${session.user.id}`)

    if (savedReading) {
      return NextResponse.json({ reading: Object.assign({}, savedReading, { result: resultToStore }), saved: true })
    }

    return NextResponse.json({
      reading: { id: null, result: resultToStore, type, createdAt: new Date() },
      saved: false,
    })
  } catch (e) {
    const totalMs = Date.now() - apiStart
    console.error(`[divination] ERROR total=${totalMs}ms`, e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
