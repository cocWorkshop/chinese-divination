/**
 * Generic fallback handler used when no registered handler can serve the
 * request (unknown type, or missing required inputs). Sends the raw inputData
 * as JSON to the LLM and asks for a generic analysis.
 *
 * Matches the behavior of the pre-refactor `else { userMessage = '请为我进行…' }`
 * branch in divination/route.ts.
 */

import type { DivinationHandler, DivinationContext, CalculationResult } from './_types'
import { fallbackSchema as fallbackZodSchema } from '../schemas/fallback.schema'

/** Shared helper: minimal prompt carrying the raw inputData + question. */
export function buildGenericUserMessage(ctx: DivinationContext, verb = `进行${ctx.type}分析`): string {
  return `请为我${verb}。
${ctx.targetPersonInfo ? `\n${ctx.targetPersonInfo}\n` : ''}
输入信息：${JSON.stringify(ctx.inputData, null, 2)}
${ctx.question ? `特别关注：${ctx.question}` : ''}`
}

export const fallbackHandler: DivinationHandler<null> = {
  chartKey: null,
  schema: fallbackZodSchema,
  canHandle: () => true,
  calculate(ctx) {
    return { chart: null, userMessage: buildGenericUserMessage(ctx) } satisfies CalculationResult<null>
  },
}
