/**
 * Event-time Meihua (梅花易數) handler.
 *
 * Uses inputData.readingDateTime (ISO string) to cast the chart. Distinct
 * from personal/other.ts which uses birth date/time.
 */

import { calculateMeihua, type MeihuaChart } from '@/lib/meihuaCalculator'
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
    return !!ctx.inputData.readingDateTime
  },

  calculate(ctx): CalculationResult<MeihuaChart> {
    try {
      const readingDt = new Date(ctx.inputData.readingDateTime as string)
      const meihuaDate = `${readingDt.getFullYear()}-${String(readingDt.getMonth() + 1).padStart(2, '0')}-${String(readingDt.getDate()).padStart(2, '0')}`
      const hour = readingDt.getHours()
      const meihuaTime = SHICHEN_BY_HOUR[hour] || 'zi_early'
      const chart = calculateMeihua(meihuaDate, meihuaTime)

      const userMessage = `请为我进行梅花易数排卦分析。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
## 程序预计算的梅花易数卦象（已验证准确，请直接使用）
${meihuaChartJson(chart)}

## 用户输入
- 起卦时间：${ctx.inputData.readingDateTime}
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
