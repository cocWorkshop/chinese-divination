/**
 * Helpers for building / unpacking OpenRouter's `reasoning` parameter.
 *
 * OpenRouter exposes a unified reasoning object:
 *   { effort: 'low' | 'medium' | 'high' | ..., max_tokens?: number, enabled?: boolean, exclude?: boolean }
 *
 * It normalizes this across OpenAI reasoning models (o1/o3/GPT-5) and
 * Anthropic extended-thinking models: for Anthropic it maps effort into a
 * `budget_tokens` via the documented ratio (low 0.2 / medium 0.5 / high 0.8 of
 * max_tokens, clamped [1024, 128000]).
 *
 * We map our internal ReasoningEffort to this shape:
 *   'off'                     → undefined (omit the parameter entirely)
 *   'low' | 'medium' | 'high' → { effort: <same> }
 *
 * The OpenAI SDK types don't know about `reasoning`, so callers spread the
 * return value into the request body with a cast.
 *
 * Reasoning tokens are returned in a separate `message.reasoning` (and
 * `message.reasoning_details`) field — not inside `message.content` — so they
 * don't pollute what we hand back to callers.
 */

import type { ReasoningEffort } from './types'

export interface OpenRouterReasoningParam {
  reasoning: { effort?: 'low' | 'medium' | 'high'; max_tokens?: number }
}

/**
 * Effort → fraction of max_tokens reserved for reasoning.
 * The remainder is guaranteed for content output.
 *
 * OpenRouter does NOT allow both `effort` and `max_tokens` in the same
 * reasoning object. When `maxTokens` is provided we use `max_tokens` only
 * (gives us a hard cap); otherwise we fall back to `effort` (OpenRouter
 * decides the budget).
 */
const REASONING_FRACTION: Record<'low' | 'medium' | 'high', number> = {
  low: 0.2,
  medium: 0.4,
  high: 0.6,
}

export function buildReasoningParam(
  effort: ReasoningEffort,
  maxTokens?: number,
): OpenRouterReasoningParam | Record<string, never> {
  if (effort === 'off') return {}
  if (maxTokens) {
    // Explicitly cap reasoning tokens so the model can't exhaust max_tokens
    // on thinking alone, leaving zero tokens for the actual content output.
    const cap = Math.max(1024, Math.floor(maxTokens * REASONING_FRACTION[effort]))
    return { reasoning: { max_tokens: cap } }
  }
  return { reasoning: { effort } }
}

/** Shape of `message` on a non-streaming OpenRouter response when reasoning is enabled. */
interface MessageWithReasoning {
  content?: string | null
  reasoning?: string | null
  reasoning_details?: unknown
}

export function extractReasoningText(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') return undefined
  const m = message as MessageWithReasoning
  if (typeof m.reasoning === 'string' && m.reasoning.length > 0) return m.reasoning
  return undefined
}
