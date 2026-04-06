/**
 * Permissive validation of LLM output against a Zod schema.
 *
 * Uses .passthrough() so merge()-injected extra fields are preserved.
 * On failure, returns the Zod errors for logging but still exposes
 * the raw data for salvage — matching the current lenient behaviour
 * where only a missing `sections` object causes a hard reject.
 */

import { z } from 'zod'

export interface ValidationOk<T> {
  success: true
  data: T
}

export interface ValidationFail {
  success: false
  issues: z.ZodIssue[]
  /** The raw data is passed through even on failure so callers can still salvage. */
  raw: unknown
}

export type ValidationResult<T> = ValidationOk<T> | ValidationFail

export function validateLLMOutput<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown,
): ValidationResult<z.infer<z.ZodObject<T>>> {
  const result = schema.passthrough().safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, issues: result.error.issues, raw: data }
}
