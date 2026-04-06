/**
 * BaZi (八字) handler — personal birth-profile type.
 *
 * Requires: solarBirthDate + (birthTime || exactTime).
 * Uses V2 schema with structured da yun analysis, formation, seasonal note.
 */

import { calculateBazi, type BaziChart } from '@/lib/baziCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs, hasBirthDateTime } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { baziSchemaV2 } from '../../schemas/bazi.schema'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'

export const baziHandler: DivinationHandler<BaziChart> = {
  chartKey: 'bazi',
  schema: baziSchemaV2,

  canHandle(ctx) {
    const birth = extractBirthInputs(ctx.inputData)
    return hasBirthDateTime(birth)
  },

  calculate(ctx): CalculationResult<BaziChart> {
    const birth = extractBirthInputs(ctx.inputData)
    if (!birth.solarBirthDate) {
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
    try {
      const chart = calculateBazi(
        birth.solarBirthDate,
        birth.timeMode === 'precise' ? '' : (birth.birthTime || ''),
        birth.birthPlace,
        birth.gender === 'female' ? 'female' : 'male',
        birth.timeMode === 'precise' ? birth.exactTime : undefined,
        birth.birthLng,
        birth.birthLat
      )
      // Select relevant 流年: current year ±10
      const currentYear = new Date().getFullYear()
      const relevantLiuNian = chart.liuNian?.filter(ln =>
        ln.year >= currentYear - 5 && ln.year <= currentYear + 15
      ) || []

      // Build structured da yun data for LLM to fill theme/interactions/keyYears/advice
      const daYunForPrompt = chart.daYun.map(dy => ({
        stem: dy.stem,
        branch: dy.branch,
        nayin: dy.nayin,
        startAge: dy.startAge,
        endAge: dy.endAge,
        startYear: dy.startYear,
        endYear: dy.endYear,
      }))

      const userMessage = `请为我进行八字命理精批。请按照系统指南中的六步推理框架（定格局→判旺衰→论调候→析十神→查关系→排大运）进行分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 命盘数据（程序预计算，直接使用）
${JSON.stringify({
  fourPillars: { year: chart.yearPillar, month: chart.monthPillar, day: chart.dayPillar, hour: chart.hourPillar },
  dayMaster: chart.dayMaster,
  fiveElements: chart.fiveElements,
  strength: chart.strength,
  strengthLabel: chart.strengthLabel,
  luckyElements: chart.luckyElements,
  avoidElements: chart.avoidElements,
  qiYun: chart.qiYun,
  daYun: daYunForPrompt,
  branchRelationships: chart.branchRelationships,
  liuNian: relevantLiuNian,
  hideHeavenStemDay: chart.hideHeavenStemDay,
  fetalOrigin: chart.fetalOrigin,
  ownSign: chart.ownSign,
  bodySign: chart.bodySign,
}, null, 2)}

## 用户信息
- 出生：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `/ 农历 ${birth.lunarOriginal}` : ''} ${birth.timeMode === 'precise' ? birth.exactTime + '（真太阳时校正）' : birth.birthTime + '（模糊时辰）'}
- 出生地：${birth.birthPlace || '未提供'} | 性别：${birth.gender}
${birth.birthEnvironment ? `- 出生环境：${birth.birthEnvironment}` : ''}
${ctx.question ? `- 特别关注：${ctx.question}` : ''}

## 输出要求
- **formation**: 格局名称 + 50+字分析（参照《子平真诠》，用 hideHeavenStemDay 确定月令司令）
- **seasonalNote**: 调候分析（参照《穷通宝鉴》）
- **sections**: overview(200+字) career(150+字) marriage(150+字) wealth(150+字) health(100+字)
- **daYunAnalysis**: 8步大运数组，每步含 theme/interactions/keyYears(2-3个)/advice，结合 liuNian 数据
- **branchAnalysis**: 原局地支关系解读（引用 branchRelationships 数据）
- **keyAdvice**: 3-5条具体建议 | **luckyInfo**: colors + directions`

      return { chart, userMessage }
    } catch (e) {
      console.error('BaZi calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, chart) {
    // Version tag
    llmResult.version = 2

    // Merge pillar data from calculator
    llmResult.pillars = {
      year: chart.yearPillar,
      month: chart.monthPillar,
      day: chart.dayPillar,
      hour: chart.hourPillar,
    }
    llmResult.dayMaster = {
      ...((llmResult.dayMaster as object | undefined) || {}),
      stem: chart.dayMaster.stem,
      element: chart.dayMaster.element,
      yinYang: chart.dayMaster.yinYang,
      strength: chart.strength,
      strengthLabel: chart.strengthLabel,
    }
    llmResult.fiveElements = chart.fiveElements
    if (chart.trueSolarTime) {
      llmResult.trueSolarTime = chart.trueSolarTime
    }
    llmResult.daYun = chart.daYun
    llmResult.xiaoYun = chart.xiaoYun
    llmResult.qiYun = chart.qiYun
    if (!llmResult.luckyElements || (llmResult.luckyElements as string[]).length === 0) {
      llmResult.luckyElements = chart.luckyElements
    }
    if (!llmResult.avoidElements || (llmResult.avoidElements as string[]).length === 0) {
      llmResult.avoidElements = chart.avoidElements
    }

    // Merge da yun stem/branch/age/year into daYunAnalysis if LLM provided it
    if (Array.isArray(llmResult.daYunAnalysis)) {
      const daYunAnalysis = llmResult.daYunAnalysis as Record<string, unknown>[]
      for (let i = 0; i < daYunAnalysis.length && i < chart.daYun.length; i++) {
        daYunAnalysis[i].stem = chart.daYun[i].stem
        daYunAnalysis[i].branch = chart.daYun[i].branch
        daYunAnalysis[i].startAge = chart.daYun[i].startAge
        daYunAnalysis[i].endAge = chart.daYun[i].endAge
        daYunAnalysis[i].startYear = chart.daYun[i].startYear
        daYunAnalysis[i].endYear = chart.daYun[i].endYear
      }
    }

    // V2 fields
    if (chart.liuNian) llmResult.liuNian = chart.liuNian
    if (chart.branchRelationships) llmResult.branchRelationships = chart.branchRelationships
    if (chart.hideHeavenStemDay) llmResult.hideHeavenStemDay = chart.hideHeavenStemDay
    if (chart.fetalOrigin) llmResult.fetalOrigin = chart.fetalOrigin
    if (chart.ownSign) llmResult.ownSign = chart.ownSign
    if (chart.bodySign) llmResult.bodySign = chart.bodySign
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(baziSchemaV2) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('bazi', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
