/**
 * Event-time Meihua (梅花易數) handler.
 *
 * Uses inputData.readingDateTime (ISO string) to cast the chart. Distinct
 * from personal/other.ts which uses birth date/time.
 */

import { calculateMeihua, calculateMeihuaByNumbers, type MeihuaChart } from '@/lib/meihuaCalculator'
import type { DivinationHandler, DivinationContext, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { getSuggestedQuestionsPrompt } from '../_suggestedQuestions'
import { schemaToLLMTemplate } from '../../schemas/_toLLMTemplate'
import { meihuaSchema } from '../../schemas/meihua.schema'
import {
  mergeMeihuaChart,
  meihuaChartJson,
  meihuaAnalysisInstructions,
} from '../_meihuaShared'

// hour → shichen branch, 24 entries indexed 0..23.
const SHICHEN_BY_HOUR = [
  'zi_early', 'chou', 'chou', 'yin', 'yin', 'mao', 'mao', 'chen',
  'chen', 'si', 'si', 'wu', 'wu', 'wei', 'wei', 'shen',
  'shen', 'you', 'you', 'xu', 'xu', 'hai', 'hai', 'zi_late',
] as const

export const meihuaHandler: DivinationHandler<MeihuaChart> = {
  chartKey: 'meihua',
  schema: meihuaSchema,

  canHandle(ctx) {
    return (
      !!ctx.inputData.readingDateTime ||
      ctx.inputData.meihuaMethod === 'numbers' ||
      (ctx.inputData.num1 !== undefined && ctx.inputData.num2 !== undefined)
    )
  },

  calculate(ctx): CalculationResult<MeihuaChart> {
    try {
      let chart: MeihuaChart
      let methodDetails = ''

      if (
        ctx.inputData.meihuaMethod === 'numbers' ||
        (ctx.inputData.num1 !== undefined && ctx.inputData.num2 !== undefined)
      ) {
        const num1 = Math.max(1, Math.round(Number(ctx.inputData.num1) || 1))
        const num2 = Math.max(1, Math.round(Number(ctx.inputData.num2) || 1))
        chart = calculateMeihuaByNumbers(num1, num2)
        methodDetails = `- 起卦方式：报数起卦（数字1：${num1}，数字2：${num2}）`
      } else {
        const readingDt = new Date((ctx.inputData.readingDateTime as string) || new Date().toISOString())
        const meihuaDate = `${readingDt.getFullYear()}-${String(readingDt.getMonth() + 1).padStart(2, '0')}-${String(readingDt.getDate()).padStart(2, '0')}`
        const hour = readingDt.getHours()
        const meihuaTime = SHICHEN_BY_HOUR[hour] || 'zi_early'
        chart = calculateMeihua(meihuaDate, meihuaTime)
        methodDetails = `- 起卦方式：时间起卦\n- 起卦时间：${ctx.inputData.readingDateTime || meihuaDate}`
      }

      const userMessage = `请为我进行梅花易数排卦分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的梅花易数卦象（已验证准确，请直接使用）
${meihuaChartJson(chart)}

## 用户输入
${methodDetails}
${ctx.question ? `- 求测问题：${ctx.question}` : '- 求测问题：综合运势'}

${meihuaAnalysisInstructions(chart)}`

      return { chart, userMessage }
    } catch (e) {
      console.error('Meihua calculation error:', e)
      return { chart: null, userMessage: buildGenericUserMessage(ctx, '进行梅花易数分析') }
    }
  },

  merge: mergeMeihuaChart,

  buildSchema(ctx) {
    return {
      type: 'meihua',
      ...(schemaToLLMTemplate(meihuaSchema) as Record<string, unknown>),
      suggestedQuestions: getSuggestedQuestionsPrompt('other', ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
    }
  },
}
