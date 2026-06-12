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

/**
 * The route's hard-reject #2 gate: does the parsed LLM output contain anything
 * actually renderable? Permissive on purpose (partial/truncated readings are
 * kept), but a section only counts if it has CONTENT — a bare key with an
 * empty/whitespace string (e.g. `{"sections":{"overview":""}}`) used to pass
 * the old key-count check, get saved as `completed`, deduct credits, and
 * render a blank reading.
 */
export function hasRenderableContent(output: Record<string, unknown>): boolean {
  const sections = output.sections
  if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
    for (const v of Object.values(sections as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim().length > 0) return true
      if (v && typeof v === 'object' && Object.keys(v).length > 0) return true
    }
  }
  const interp = output.interpretation
  if (typeof interp === 'string' && interp.trim().length > 0) return true
  if (interp && typeof interp === 'object' && Object.keys(interp).length > 0) return true
  return false
}
