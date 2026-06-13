/**
 * Shared types for divination handlers.
 *
 * Each handler owns one divination type's contract:
 *   - whether it can handle the current inputs (canHandle)
 *   - running the programmatic calculator + building the LLM user message (calculate)
 *   - merging programmatic chart data into the parsed LLM JSON (merge)
 *   - a Zod schema for LLM output validation and prompt template generation
 *   - optionally overriding the default buildSchema behaviour
 *
 * Route.ts orchestrates: auth → credits → dispatch → LLM → parse → merge → validate → save.
 */

import type { z } from 'zod'

export interface DivinationContext {
  type: string
  language: string                  // 'en' | 'zh-TW' | 'zh'
  inputData: Record<string, unknown>
  question?: string
  targetPersonInfo: string          // "此次预测对象为用户的配偶（张三）" or ''
  clientDate: Date
  userAge?: number
  userGender?: string
}

export interface CalculationResult<TChart = unknown> {
  /** Programmatic chart (null when handler has no calculator, e.g. iching/fengshui). */
  chart: TChart | null
  /** Message sent to the LLM as the user turn. */
  userMessage: string
}

export interface DivinationHandler<TChart = unknown> {
  /** Key under which this chart is stored in Reading.calculationData (null = no chart). */
  readonly chartKey: string | null
  /** Zod schema defining the expected LLM output structure. */
  readonly schema: z.ZodObject<z.ZodRawShape>
  /** True if this handler can serve the given inputs (required fields present). */
  canHandle(ctx: DivinationContext): boolean
  /** Run calculator and build the LLM user message. */
  calculate(ctx: DivinationContext): CalculationResult<TChart>
  /** Merge programmatic chart data into the parsed LLM result in place. */
  merge?(llmResult: Record<string, unknown>, chart: TChart, ctx: DivinationContext): void
  /**
   * Override the default buildSchema behaviour.
   * Default: schemaToLLMTemplate(this.schema) + suggestedQuestions.
   */
  buildSchema?(ctx: DivinationContext): Record<string, unknown>
}
