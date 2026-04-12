/**
 * Unified LLM module — public API.
 *
 * Usage:
 *   import { completeLLM, streamLLM, loadDivinationPrompt } from '@/lib/llm'
 */

export { completeLLM, llmErrorStatus } from './complete'
export { streamLLM } from './stream'
export type { StreamRequest } from './stream'
export { loadDivinationPrompt } from './prompts'
export type { DivinationType } from './prompts'
export { resolveLLMConfig, loadLLMSettings, clearLLMSettingsCache, LLM_DEFAULTS, LLM_SETTING_KEYS } from './settings'
export type { LLMConfig } from './settings'
export type {
  Endpoint,
  Message,
  MessageRole,
  Tool,
  ToolCallRef,
  Usage,
  CompletionRequest,
  CompletionResult,
  ReasoningEffort,
  StreamChunk,
} from './types'
