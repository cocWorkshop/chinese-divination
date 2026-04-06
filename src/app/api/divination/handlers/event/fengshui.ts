/**
 * Feng Shui (風水 / flying stars) handler — event-based, no calculator.
 *
 * The LLM produces the full reading from inputData + question; we only
 * provide the schema and validation.
 */

import type { DivinationHandler, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { fengshuiSchema } from '../../schemas/fengshui.schema'

export const fengshuiHandler: DivinationHandler<null> = {
  chartKey: null,
  schema: fengshuiSchema,
  canHandle: () => true,
  calculate(ctx): CalculationResult<null> {
    return { chart: null, userMessage: buildGenericUserMessage(ctx) }
  },
}
