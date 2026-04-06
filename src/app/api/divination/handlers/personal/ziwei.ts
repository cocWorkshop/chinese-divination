/**
 * ZiWei Dou Shu (紫微斗數) handler — personal birth-profile type.
 *
 * Unlike bazi, ziwei needs explicit true-solar-time correction (plus DST
 * adjustment and zi_late handling) before calling calculateZiwei. That logic
 * stays here — it's only used by this handler.
 */

import { calculateZiwei, type ZiweiChart } from '@/lib/ziweiCalculator'
import { detectPatterns, type DetectedPattern } from '@/lib/ziweiPatterns'
import { trueSolarTime, getTrueSolarTimeCorrection, getShichen } from '@/lib/trueSolarTime'
import { getTimezoneOffset } from '@/lib/dstDetection'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs, hasBirthDateTime, type BirthInputs } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { ziweiSchema } from '../../schemas/ziwei.schema'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'

interface ZiweiChartWithPatterns {
  chart: ZiweiChart
  patterns: DetectedPattern[]
}

/**
 * Apply true-solar-time + DST correction to a precise birth time.
 * Returns the shichen to use, the (possibly day-shifted) adjusted date, and
 * a human-readable info string for the LLM prompt.
 */
function applyTrueSolarCorrection(birth: BirthInputs): {
  shichen: string
  adjustedDate: string
  ziweiTrueSolarInfo: string
} {
  const solarBirthDate = birth.solarBirthDate!
  const [zy, zm, zd] = solarBirthDate.split('-').map(Number)
  let shichen = birth.birthTime || ''
  let adjustedDate = solarBirthDate
  let ziweiTrueSolarInfo = ''

  if (birth.timeMode === 'precise' && birth.exactTime) {
    const longitude = birth.birthLng ?? 120.0
    const [exactHour, exactMinute] = birth.exactTime.split(':').map(Number)
    const tzResult = getTimezoneOffset(zy, zm, zd, exactHour, longitude, birth.birthLat)
    const timezone = tzResult.offset

    // DST adjustment: subtract 1h, may roll back by a day.
    let adjHour = exactHour
    let adjDay = zd, adjMonth = zm, adjYear = zy
    if (tzResult.isDST) {
      adjHour -= 1
      if (adjHour < 0) {
        adjHour += 24
        const prevDate = new Date(zy, zm - 1, zd - 1)
        adjYear = prevDate.getFullYear()
        adjMonth = prevDate.getMonth() + 1
        adjDay = prevDate.getDate()
      }
    }

    const standardDate = new Date(adjYear, adjMonth - 1, adjDay, adjHour, exactMinute, 0)
    const correctedDate = trueSolarTime(standardDate, longitude, tzResult.isDST ? timezone - 1 : timezone)
    const correctedShichen = getShichen(correctedDate)
    const correctedHour = correctedDate.getHours()

    shichen = correctedShichen.name
    if (correctedHour >= 23) shichen = 'zi_late'

    const originalDate = new Date(zy, zm - 1, zd, exactHour, exactMinute, 0)
    const originalShichen = getShichen(originalDate)
    const correctionMinutes = getTrueSolarTimeCorrection(standardDate, longitude, tzResult.isDST ? timezone - 1 : timezone)
    const shichenChanged = correctedShichen.branch !== originalShichen.branch
    const formatT = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    ziweiTrueSolarInfo = `（精确时间，已真太阳时校正：${formatT(originalDate)} → ${formatT(correctedDate)}，校正${Math.round(correctionMinutes * 10) / 10}分钟${shichenChanged ? '，时辰已变更' : ''}${tzResult.isDST ? '，已扣除夏令时' : ''}）`
  } else {
    // Fuzzy mode: use shichen as-is.
    shichen = birth.birthTime || 'zi'
  }

  // zi_late → push date forward by one day.
  if (shichen === 'zi_late') {
    const nextDay = new Date(zy, zm - 1, zd + 1)
    adjustedDate = `${nextDay.getFullYear()}-${nextDay.getMonth() + 1}-${nextDay.getDate()}`
  }

  return { shichen, adjustedDate, ziweiTrueSolarInfo }
}

export const ziweiHandler: DivinationHandler<ZiweiChartWithPatterns> = {
  chartKey: 'ziwei',
  schema: ziweiSchema,

  canHandle(ctx) {
    const birth = extractBirthInputs(ctx.inputData)
    return hasBirthDateTime(birth)
  },

  calculate(ctx): CalculationResult<ZiweiChartWithPatterns> {
    const birth = extractBirthInputs(ctx.inputData)
    if (!birth.solarBirthDate) {
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
    try {
      const { shichen, adjustedDate, ziweiTrueSolarInfo } = applyTrueSolarCorrection(birth)
      const chart = calculateZiwei(
        adjustedDate,
        shichen === 'zi_late' ? 'zi' : shichen,
        birth.gender === 'female' ? 'female' : 'male'
      )
      const patterns = detectPatterns(chart)

      const palaceSummary = chart.palaces.map(p => ({
        name: p.name,
        heavenlyStem: p.heavenlyStem,
        earthlyBranch: p.earthlyBranch,
        majorStars: p.majorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen })),
        minorStars: p.minorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen })),
        isBodyPalace: p.isBodyPalace,
        decadal: p.decadal,
        changsheng12: p.changsheng12,
      }))

      const birthYear = parseInt(birth.solarBirthDate.split('-')[0])
      const currentYear = new Date().getFullYear()
      const currentAge = currentYear - birthYear

      const dayunSorted = chart.palaces
        .filter(p => p.decadal && p.decadal.range.length === 2)
        .map(p => ({
          range: `${p.decadal.range[0]}-${p.decadal.range[1]}岁`,
          palace: p.name,
          heavenlyStem: p.decadal.heavenlyStem,
          earthlyBranch: p.decadal.earthlyBranch,
          majorStars: p.majorStars.map(s => s.name + (s.brightness ? `(${s.brightness})` : '') + (s.mutagen ? `[${s.mutagen}]` : '')).join('、') || '无正曜',
          isCurrent: currentAge >= p.decadal.range[0] && currentAge <= p.decadal.range[1],
        }))
        .sort((a, b) => parseInt(a.range) - parseInt(b.range))

      const userMessage = `请为我进行紫微斗数命盘精批。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的紫微斗数命盘（已验证准确，请直接使用）
${JSON.stringify({
  basicInfo: {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    chineseDate: chart.chineseDate,
    time: chart.time,
    zodiac: chart.zodiac,
    gender: chart.gender,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
  },
  siHua: chart.siHua,
  detectedPatterns: patterns.map(p => ({ name: p.name, level: p.level, description: p.description, stars: p.involvedStars, palaces: p.involvedPalaces })),
  dayunTimeline: dayunSorted,
  palaces: palaceSummary,
}, null, 2)}

## 用户信息
- 出生日期：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `（用户输入农历 ${birth.lunarOriginal}）` : ''}
- 出生时辰：${birth.timeMode === 'precise' ? birth.exactTime : birth.birthTime}${ziweiTrueSolarInfo || (birth.timeMode === 'precise' ? '' : '（模糊时辰）')}
- 出生地：${birth.birthPlace || '未提供'}
- 性别：${birth.gender}
- 当前年龄：约${currentAge}岁（${currentYear}年）
${birth.birthEnvironment ? `- 出生地环境：${birth.birthEnvironment}` : ''}
${ctx.question ? `- 特别关注：${ctx.question}` : ''}

## 解盘身份与风格
你是一位执业三十年的紫微斗数命理师，师承中州派，擅长断具体事件和六亲关系。
风格：先给结论再解释原因；敢于给出具体断语，不说模棱两可的废话。

## 分析方法论（按此顺序思考）

### 第一步：定格局
1. 程序已自动检测格局，结果在 detectedPatterns 数组中（每次一致）
2. 你的任务：将 detectedPatterns 直接输出到 patterns 数组，并在 overview 中解释格局含义
3. 如果你发现程序未检测到但确实存在的格局，可以补充（标注"补充检测"）
4. **不要遗漏或修改程序检测到的格局**

### 第二步：看四化飞星
1. 本命四化（年干决定）已在 siHua 中列出
2. 分析：化禄落宫=一生最顺领域，化忌落宫=最需注意领域
3. 注意双化叠加和三方四正会照的升降格效果

### 第三步：看大运走势
大运已按年龄预排序在 dayunTimeline 数组中（isCurrent=true 为当前大运）。逐个分析：
- 该大运宫位里的星曜组合（已列出）
- 大运天干产生的四化，叠加本命四化
- 用"▶"标记 isCurrent=true 的大运（命主当前约${currentAge}岁）
- **每个大运必须给出关键事件预测**

### 第四步：看六亲
- 父母宫 → 推断父亲/母亲特征（职业类型、性格）
- 夫妻宫 → 推断配偶特征（年龄差、职业、外貌、性格）
- 子女宫 → 推断子女数量倾向、与子女关系

### 第五步：综合硬核预测
基于以上分析，给出3-5个最具体的可验证预测，输出到 keyPredictions 数组。
示例格式：{ age: "28岁", event: "重大工作变动或搬迁", basis: "大运走迁移宫，流年太岁冲命宫" }

## sections 各字段要求

- **overview**：格局判定 + 命宫主星组合含义 + 身宫解读 + 五行局 + 一句话定性此命
- **personality**：命宫(别人眼中的你) vs 福德宫(内心真实的你) 对比分析，指出外在与内在的反差
- **career**：官禄宫主星 + 三方四正联合分析 + 具体适合的子行业 + 当前大运对事业的影响
- **marriage**：配偶具体特征推断(职业类型/性格/年龄差/外貌特点) + 婚姻模式 + 最佳婚期 + 桃花星分析
- **wealth**：正财偏财格局 + 最佳理财方式 + 财运高峰/低谷年龄段 + 田宅宫联合分析
- **health**：根据参考资料中的"健康对应"表，分析疾厄宫主星对应的身体系统 + 煞星加重的风险 + 需注意的年龄段
- **family**：父亲特征(父母宫太阳系分析) + 母亲特征(父母宫太阴系) + 兄弟姐妹关系 + 子女缘分
- **dayun**：逐个大运分析，每步标注起止年龄+所在宫位+核心主题+关键预测。用▶标记当前大运。

## 宫位分析要求（palaces 中每个宫的 analysis）
每个宫位分析必须包含：
1. 主星组合核心含义（一句话）
2. 辅星/煞星的修正作用
3. 与三方四正的关联（至少提一个相关宫位）
4. 对所管事项的具体影响

## 禁止事项
- 不要重复排盘数据（已提供，你只解读）
- 不要说"建议结合实际情况"等废话
- 不要用巴纳姆式描述（"你有时外向有时内向"）
- 每个断语必须基于具体星曜组合

四化飞星和星耀数据以程序计算结果为准，你只负责解盘分析。`

      return { chart: { chart, patterns }, userMessage }
    } catch (e) {
      console.error('Ziwei calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, { chart, patterns }) {
    llmResult.ziweiChart = {
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
      siHua: chart.siHua,
      detectedPatterns: patterns,
    }
    // Override palaces with programmatic star data, preserving LLM analysis.
    const llmPalaces = (llmResult.palaces || {}) as Record<string, { stars?: string[]; analysis?: string }>
    const mergedPalaces: Record<string, unknown> = {}
    for (const palace of chart.palaces) {
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
    llmResult.palaces = mergedPalaces
    // Rebuild mainStars from programmatic data.
    const mainStars: { name: string; palace: string; brightness?: string; mutagen?: string }[] = []
    for (const palace of chart.palaces) {
      for (const star of palace.majorStars) {
        mainStars.push({ name: star.name, palace: palace.name, brightness: star.brightness, mutagen: star.mutagen })
      }
    }
    llmResult.mainStars = mainStars
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(ziweiSchema) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('ziwei', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
