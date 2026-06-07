/**
 * Helpers for building / unpacking OpenRouter's `reasoning` parameter.
 *
 * We send the UNIFIED `effort` form — `{ reasoning: { effort: 'low'|'medium'|'high' } }`
 * — which is the most portable control across providers on OpenRouter:
 *   - OpenAI o-series / GPT-5 and xAI Grok take `effort` natively.
 *   - For Anthropic extended-thinking and Gemini "thinking" models, OpenRouter
 *     converts `effort` into the provider's reasoning/thinking-token budget
 *     (a fraction of max_tokens), leaving the remainder for content output.
 *   - Models with NO reasoning support (e.g. claude-3-5-haiku, gpt-4o) simply
 *     ignore the parameter — OpenRouter does not error.
 *
 * We deliberately do NOT send the `max_tokens` budget form: it's only honored
 * by Anthropic/Gemini and is NOT reliably converted for OpenAI reasoning
 * models, so it fails the "works on every model we may use" requirement.
 * Letting OpenRouter own the per-provider budget keeps a single code path that
 * behaves correctly everywhere.
 *
 * IMPORTANT: reasoning only has a visible effect when the configured model
 * actually supports it. Pointing a function at a non-reasoning model makes the
 * effort setting a (harmless) no-op.
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
  reasoning: { effort: 'low' | 'medium' | 'high' }
}

export function buildReasoningParam(
  effort: ReasoningEffort,
): OpenRouterReasoningParam | Record<string, never> {
  // 'off' → omit the parameter entirely so the model runs in normal mode.
  if (effort === 'off') return {}
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
