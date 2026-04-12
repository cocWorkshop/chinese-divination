/**
 * Shared types for the unified LLM module.
 */

export type Endpoint = 'divination' | 'chat' | 'master'

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
  /** External abort signal merged with the internal timeout signal. */
  signal?: AbortSignal
}

export interface CompletionResult {
  content: string
  model: string
  usage?: Usage
  /** Raw reasoning / extended-thinking text returned by the model, if any. */
  reasoning?: string
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
