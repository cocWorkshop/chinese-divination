/**
 * Handler registry + dispatcher for divination types.
 *
 * Handlers are grouped by whether they consume the user's birth profile:
 *   - personal/  — bazi, ziwei, other (birth-date 梅花易數)
 *   - event/     — qimen, liuyao, meihua (event-time), fengshui, iching
 *
 * selectHandler(ctx) returns the registered handler if it can serve the
 * request, else the generic fallbackHandler. This preserves pre-refactor
 * behavior: e.g. `type='bazi'` without birthTime falls through to the
 * generic analysis prompt.
 */

import type { DivinationHandler, DivinationContext } from './_types'
import { fallbackHandler } from './_fallback'
import { getSuggestedQuestionsPrompt } from './_suggestedQuestions'
import { schemaToLLMTemplate } from '../schemas/_toLLMTemplate'
import { validateLLMOutput, type ValidationResult } from '../schemas/_validate'

import { baziHandler } from './personal/bazi'
import { ziweiHandler } from './personal/ziwei'
import { otherHandler } from './personal/other'

import { qimenHandler } from './event/qimen'
import { liuyaoHandler } from './event/liuyao'
import { meihuaHandler } from './event/meihua'
import { fengshuiHandler } from './event/fengshui'
import { ichingHandler } from './event/iching'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, DivinationHandler<any>> = {
  bazi: baziHandler,
  ziwei: ziweiHandler,
  other: otherHandler,
  qimen: qimenHandler,
  liuyao: liuyaoHandler,
  meihua: meihuaHandler,
  fengshui: fengshuiHandler,
  iching: ichingHandler,
}

export function selectHandler(ctx: DivinationContext): DivinationHandler {
  const h = registry[ctx.type]
  if (h && h.canHandle(ctx)) return h
  return fallbackHandler
}

/**
 * Build the JSON template for the LLM system prompt.
 * Uses handler.buildSchema() if provided, otherwise derives from Zod schema.
 */
export function buildHandlerSchema(
  handler: DivinationHandler,
  ctx: DivinationContext,
): Record<string, unknown> {
  if (handler.buildSchema) return handler.buildSchema(ctx)
  const template = schemaToLLMTemplate(handler.schema) as Record<string, unknown>
  return {
    ...template,
    suggestedQuestions: getSuggestedQuestionsPrompt(ctx.type, ctx.language, { age: ctx.userAge, gender: ctx.userGender }),
  }
}

/**
 * Validate LLM output against the handler's Zod schema.
 * Permissive: uses .passthrough() so merge-injected fields are preserved.
 */
export function validateHandlerOutput(
  handler: DivinationHandler,
  data: unknown,
): ValidationResult<Record<string, unknown>> {
  return validateLLMOutput(handler.schema, data)
}

export { fallbackHandler } from './_fallback'
export type { DivinationContext, DivinationHandler, CalculationResult } from './_types'
