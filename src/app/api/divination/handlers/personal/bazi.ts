/**
 * BaZi (八字) handler — personal birth-profile type.
 *
 * Requires: solarBirthDate + (birthTime || exactTime).
 * The bazi calculator does its own true-solar-time correction (via birthLng/birthLat),
 * so no DST preprocessing is needed here.
 */

import { calculateBazi, type BaziChart } from '@/lib/baziCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs, hasBirthDateTime } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { baziSchema } from '../../schemas/bazi.schema'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'

export const baziHandler: DivinationHandler<BaziChart> = {
  chartKey: 'bazi',
  schema: baziSchema,

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
      const userMessage = `请为我进行八字命理精批。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的四柱命盘与大运（已验证准确，请直接使用）
${JSON.stringify({
  fourPillars: { year: chart.yearPillar, month: chart.monthPillar, day: chart.dayPillar, hour: chart.hourPillar },
  dayMaster: chart.dayMaster,
  fiveElements: chart.fiveElements,
  strength: chart.strength,
  strengthLabel: chart.strengthLabel,
  luckyElements: chart.luckyElements,
  avoidElements: chart.avoidElements,
  qiYun: chart.qiYun,
  daYun: chart.daYun,
}, null, 2)}

## 用户输入
- 出生日期：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `（用户输入农历 ${birth.lunarOriginal}）` : ''}
- 出生时辰：${birth.timeMode === 'precise' ? birth.exactTime : birth.birthTime}${birth.timeMode === 'precise' ? '（精确时间，已真太阳时校正）' : '（模糊时辰）'}
- 出生地：${birth.birthPlace || '未提供'}
- 性别：${birth.gender}
${birth.birthEnvironment ? `- 出生地环境：${birth.birthEnvironment}` : ''}
${ctx.question ? `- 特别关注：${ctx.question}` : ''}

## 解盘要求
你是资深命理师，请基于以上命盘进行精批。数据中每柱包含：十神(tenGods)、十二长生(changSheng)、空亡(kongWang)、神煞(shenSha)，请充分利用。
1. **overview**：命主性格、出身家庭、六亲关系（150字以上）
2. **career**：事业方向、适合行业、贵人运（150字以上）
3. **marriage**：配偶特征、婚姻质量、感情运势（150字以上）
4. **wealth**：正财偏财分析、理财建议（150字以上）
5. **health**：易患疾病、养生注意（100字以上）
6. **daYunDetail**：逐步精批每个10年大运（共${chart.daYun.length}步），标注每步大运起止年份，点出重点领域和需要注意的流年（300字以上）

四柱和大运数据以程序计算结果为准，你只负责解盘分析。`

      return { chart, userMessage }
    } catch (e) {
      console.error('BaZi calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge(llmResult, chart) {
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
  },

  buildSchema(ctx) {
    return {
      ...(schemaToLLMTemplate(baziSchema) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('bazi', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
