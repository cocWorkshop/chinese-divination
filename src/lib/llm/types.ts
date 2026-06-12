/**
 * Shared types for the unified LLM module.
 */

/**
 * LLM call endpoints. Each resolves its own model/config from AdminSetting.
 *   - 'master'           → Xuanji Master main ask→answer turn (user-facing).
 *   - 'masterBackground' → Master background tasks (history summarization,
 *                          portrait extraction) — configured separately from
 *                          the main answer model so they can run on a cheaper
 *                          model without affecting answer quality.
 */
export type Endpoint = 'divination' | 'chat' | 'master' | 'masterBackground'

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface Message {
  role: MessageRole
  content: string | null
  // Optional fields for tool/function calling roundtrips
  tool_call_id?: string
  tool_calls?: ToolCallRef[]
  name?: string
}

export interface ToolCallRef {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface Tool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: Record<string, unknown>
  }
}

export interface Usage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

/**
 * Reasoning / extended-thinking strength for OpenRouter.
 *
 *   - 'low' | 'medium' | 'high'  → maps to OpenRouter's `reasoning.effort` field
 *     (OpenRouter normalizes this into a reasoning-token budget for both OpenAI
 *     reasoning models and Anthropic extended-thinking models).
 *   - 'off'                       → reasoning is disabled; we omit the parameter
 *     entirely so the model runs in its regular non-reasoning mode.
 *
 * Default throughout the stack is 'medium'.
 */
export type ReasoningEffort = 'low' | 'medium' | 'high' | 'off'

export interface CompletionRequest {
  endpoint: Endpoint
  systemPrompt: string
  messages: Message[]
  userId?: string | null
  /** Override model; otherwise resolved from AdminSetting per endpoint. */
  model?: string
  /** Override max tokens; otherwise resolved from AdminSetting. */
  maxTokens?: number
  /** Override timeout in ms; otherwise resolved from AdminSetting. */
  timeoutMs?: number
  /**
   * Override extended-thinking / reasoning strength for this call.
   * Falls back through AdminSetting → env → default ('medium').
   * Pass 'off' to fully disable reasoning for this single call.
   */
  reasoningEffort?: ReasoningEffort
  /**
   * Ask the provider to constrain output to valid JSON (OpenAI-style
   * `response_format`). Forwarded to OpenRouter; providers that reject the
   * parameter trigger ONE automatic retry without it (see complete/stream),
   * so enabling this can never make a request fail that would otherwise
   * succeed. Ignored by the local Claude proxy. Only meaningful when the
   * prompt itself demands JSON (the divination prompts do).
   */
  responseFormat?: { type: 'json_object' }
  /**
   * Request-correlation id from createRequestLogger() — written to the LlmLog
   * row so one id ties together the route's JSON logs and the DB log.
   */
  requestId?: string
  /** External abort signal merged with the internal timeout signal. */
  signal?: AbortSignal
}

export interface CompletionResult {
  content: string
  model: string
  usage?: Usage
  /** Raw reasoning / extended-thinking text returned by the model, if any. */
  reasoning?: string
  /**
   * Provider finish reason ('stop', 'length', …). 'length' means the output
   * was TRUNCATED by max_tokens — callers seeing truncated JSON should fix
   * the token budget, not the parser.
   */
  finishReason?: string
}

export type StreamChunk =
  | { type: 'content'; text: string }
  | {
      type: 'tool_call_delta'
      index: number
      id?: string
      name?: string
      argumentsDelta?: string
    }
  | { type: 'done'; finishReason: string; usage?: Usage }
