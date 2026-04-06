/**
 * "Other" (其他) handler — birth-date-based 梅花易數 (Plum Blossom).
 *
 * Personal birth-profile type: derives the meihua chart from the user's
 * solarBirthDate + birthTime (fuzzy shichen). Shares chart/merge logic with
 * the event-time meihua handler.
 */

import { calculateMeihua, type MeihuaChart } from '@/lib/meihuaCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { extractBirthInputs } from '../_birthProfile'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'
import { meihuaSchema } from '../../schemas/meihua.schema'
import {
  mergeMeihuaChart,
  meihuaChartJson,
  meihuaAnalysisInstructions,
} from '../_meihuaShared'

export const otherHandler: DivinationHandler<MeihuaChart> = {
  chartKey: 'meihua',
  schema: meihuaSchema,

  canHandle(ctx) {
    const birth = extractBirthInputs(ctx.inputData)
    return !!(birth.solarBirthDate && birth.birthTime)
  },

  calculate(ctx): CalculationResult<MeihuaChart> {
    const birth = extractBirthInputs(ctx.inputData)
    if (!birth.solarBirthDate || !birth.birthTime) {
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
    try {
      const chart = calculateMeihua(birth.solarBirthDate, birth.birthTime)
      const userMessage = `请为我进行梅花易数排卦分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的梅花易数卦象（已验证准确，请直接使用）
${meihuaChartJson(chart)}

## 用户输入
- 出生日期：${birth.solarBirthDate}（公历）${birth.lunarOriginal ? `（用户输入农历 ${birth.lunarOriginal}）` : ''}
- 时辰：${birth.birthTime}
${ctx.question ? `- 求测问题：${ctx.question}` : '- 求测问题：综合运势'}

${meihuaAnalysisInstructions(chart)}`
      return { chart, userMessage }
    } catch (e) {
      console.error('Meihua calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx) }
    }
  },

  merge: mergeMeihuaChart,

  buildSchema(ctx) {
    return {
      type: 'other',
      ...(schemaToLLMTemplate(meihuaSchema) as Record<string, unknown>),
      subType: 'meihua或liuren',
      suggestedQuestions: getSuggestedQuestionsPrompt('other', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
