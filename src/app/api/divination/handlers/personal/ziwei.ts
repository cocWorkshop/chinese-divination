/**
 * ZiWei Dou Shu (紫微斗數) handler — personal birth-profile type.
 *
 * Uses V2 schema with structured da yun analysis, formation, 流年 data.
 * Applies true-solar-time + DST correction before calling calculateZiwei.
 */

import { calculateZiwei, type ZiweiChart } from '@/lib/ziweiCalculator'
import { detectPatterns, type DetectedPattern } from '@/lib/ziweiPatterns'
import { trueSolarTime, getTrueSolarTimeCorrection, getShichen } from '@/lib/trueSolarTime'
import { getTimezoneOffset } from '@/lib/dstDetection'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs, hasBirthDateTime, type BirthInputs } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { ziweiSchemaV2 } from '../../schemas/ziwei.schema'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'

interface ZiweiChartWithPatterns {
  chart: ZiweiChart
  patterns: DetectedPattern[]
}

/**
 * Apply true-solar-time + DST correction to a precise birth time.
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
    shichen = birth.birthTime || 'zi'
  }

  // zi_late → push date forward by one day (with proper padding)
  if (shichen === 'zi_late') {
    const nextDay = new Date(zy, zm - 1, zd + 1)
    adjustedDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
  }

  return { shichen, adjustedDate, ziweiTrueSolarInfo }
}

export const ziweiHandler: DivinationHandler<ZiweiChartWithPatterns> = {
  chartKey: 'ziwei',
  schema: ziweiSchemaV2,

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

      // Dayun timeline for prompt
      const dayunSorted = chart.palaces
        .filter(p => p.decadal && p.decadal.range.length === 2 && (p.decadal.range[0] > 0 || p.decadal.range[1] > 0))
        .map(p => ({
          range: `${p.decadal.range[0]}-${p.decadal.range[1]}`,
          palace: p.name,
          heavenlyStem: p.decadal.heavenlyStem,
          earthlyBranch: p.decadal.earthlyBranch,
          majorStars: p.majorStars.map(s => s.name + (s.brightness ? `(${s.brightness})` : '') + (s.mutagen ? `[${s.mutagen}]` : '')).join('、') || '无正曜',
          isCurrent: currentAge >= p.decadal.range[0] && currentAge <= p.decadal.range[1],
        }))
        .sort((a, b) => parseInt(a.range) - parseInt(b.range))

      // Select relevant 流年: current year ±10
      const relevantLiuNian = chart.liuNian?.filter(ln =>
        ln.year >= currentYear - 5 && ln.year <= currentYear + 15
      ) || []

      const userMessage = `请为我进行紫微斗数命盘精批。请按照系统指南中的六步推理框架（定格局→看四化→析三方四正→断六亲→排大运→综合预测）进行分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 命盘数据（程序预计算，直接使用）
${JSON.stringify({
  basicInfo: {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    time: chart.time,
    zodiac: chart.zodiac,
    gender: chart.gender,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    earthlyBranchOfSoulPalace: chart.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: chart.earthlyBranchOfBodyPalace,
  },
  siHua: chart.siHua,
  decadalSiHua: chart.decadalSiHua,
  detectedPatterns: patterns.map(p => ({ name: p.name, level: p.level, description: p.description, stars: p.involvedStars, palaces: p.involvedPalaces })),
  dayunTimeline: dayunSorted,
  liuNian: relevantLiuNian,
  palaces: palaceSummary,
}, null, 2)}

## 用户信息
- 出生：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `/ 农历 ${birth.lunarOriginal}` : ''} ${birth.timeMode === 'precise' ? birth.exactTime + ziweiTrueSolarInfo : birth.birthTime + '（模糊时辰）'}
- 出生地：${birth.birthPlace || '未提供'} | 性别：${birth.gender} | 当前约${currentAge}岁（${currentYear}年）
${birth.birthEnvironment ? `- 出生环境：${birth.birthEnvironment}` : ''}
${ctx.question ? `- 特别关注：${ctx.question}` : ''}

## 输出要求
- **formation**: 格局名称 + level(上格/中格/下格/凶格/普通) + 50+字分析
- **sections**: overview(200+字) personality(100+字) career(150+字) marriage(150+字) wealth(150+字) health(100+字) family(100+字)
- **daYunAnalysis**: 按大限逐步分析数组，每步含 ageRange/heavenlyStem/earthlyBranch/theme(30+字)/siHuaOverlay(30+字，引用decadalSiHua数据)/keyEvents(2-3个)/advice
- **keyPredictions**: 3-5个具体可验证的人生事件预测（含 age/event/basis）
- **keyAdvice**: 3-5条 | **luckyInfo**: colors + directions

数据以程序计算结果为准。请引用 decadalSiHua 中的大限四化做叠加分析。请使用 liuNian 中的 isLucky 标记辅助识别关键流年。`

      return { chart: { chart, patterns }, userMessage }
    } catch (e) {
      console.error('Ziwei calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, { chart, patterns }) {
    // Version tag
    llmResult.version = 2

    llmResult.ziweiChart = {
      solarDate: chart.solarDate,
      lunarDate: chart.lunarDate,
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

    // V2 fields
    if (chart.liuNian) llmResult.liuNian = chart.liuNian
    if (chart.decadalSiHua) llmResult.decadalSiHua = chart.decadalSiHua

    // Merge da yun stem/branch into daYunAnalysis if LLM provided it
    if (Array.isArray(llmResult.daYunAnalysis) && chart.decadalSiHua) {
      const analysis = llmResult.daYunAnalysis as Record<string, unknown>[]
      for (let i = 0; i < analysis.length && i < chart.decadalSiHua.length; i++) {
        analysis[i].heavenlyStem = chart.decadalSiHua[i].heavenlyStem
        analysis[i].earthlyBranch = chart.decadalSiHua[i].earthlyBranch
        analysis[i].ageRange = `${chart.decadalSiHua[i].range[0]}-${chart.decadalSiHua[i].range[1]}`
      }
    }
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(ziweiSchemaV2) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('ziwei', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
