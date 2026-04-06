/**
 * I Ching (易經) handler — event-based, no calculator.
 *
 * The LLM casts the hexagram and produces the full reading from inputData +
 * question; we only provide the schema and validation.
 */

import type { DivinationHandler, CalculationResult } from '../_types'
import { buildGenericUserMessage } from '../_fallback'
import { ichingSchema } from '../../schemas/iching.schema'

export const ichingHandler: DivinationHandler<null> = {
  chartKey: null,
  schema: ichingSchema,
  canHandle: () => true,
  calculate(ctx): CalculationResult<null> {
    return { chart: null, userMessage: buildGenericUserMessage(ctx) }
  },
}
