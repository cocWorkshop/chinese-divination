/**
 * Blocking LLM completion.
 *
 * Owns:
 *   - config resolution (model / maxTokens / timeoutMs per endpoint)
 *   - provider dispatch (OpenRouter or local Claude proxy)
 *   - timeout enforcement via AbortController
 *   - success + error logging via logLlmCall()
 *
 * Callers receive { content, model, usage } or an Error (after logging).
 */

import OpenAI from 'openai'
import { logLlmCall } from '../llmLogger'
import { resolveLLMConfig } from './settings'
import { createOpenRouterClient } from './providers/openrouter'
import { callClaudeProxy } from './providers/claudeProxy'
import type {
  CompletionRequest,
  CompletionResult,
  Message,
  Usage,
} from './types'

const PREVIEW_LIMIT = 500
const SYSTEM_PROMPT_LOG_LIMIT = 2000

function toOpenAIMessages(
  systemPrompt: string,
  messages: Message[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]
  for (const m of messages) {
    if (m.role === 'tool') {
      out.push({
        role: 'tool',
        tool_call_id: m.tool_call_id ?? '',
        content: m.content ?? '',
      })
    } else if (m.role === 'assistant') {
      out.push({
        role: 'assistant',
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam)
    } else if (m.role === 'system') {
      out.push({ role: 'system', content: m.content ?? '' })
    } else {
      out.push({ role: 'user', content: m.content ?? '' })
    }
  }
  return out
}

function firstUserPreview(messages: Message[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  return (lastUser?.content ?? '').slice(0, PREVIEW_LIMIT)
}

export async function completeLLM(
  req: CompletionRequest
): Promise<CompletionResult> {
  const cfg = await resolveLLMConfig({
    endpoint: req.endpoint,
    overrides: {
      model: req.model,
      maxTokens: req.maxTokens,
      timeoutMs: req.timeoutMs,
    },
  })

  const started = Date.now()
  const inputPreview = firstUserPreview(req.messages)
  const systemPromptPreview = req.systemPrompt.slice(0, SYSTEM_PROMPT_LOG_LIMIT)

  try {
    let content = ''
    let usage: Usage | undefined

    if (cfg.isLocalProxy) {
      const result = await callClaudeProxy({
        systemPrompt: req.systemPrompt,
        messages: req.messages,
        maxTokens: cfg.maxTokens,
        timeoutMs: cfg.timeoutMs,
        signal: req.signal,
      })
      content = result.content
      usage = result.usage
    } else {
      const client = createOpenRouterClient({
        endpoint: req.endpoint,
        timeoutMs: cfg.timeoutMs,
      })
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs)
      const onExternalAbort = () => controller.abort()
      if (req.signal) {
        if (req.signal.aborted) controller.abort()
        else req.signal.addEventListener('abort', onExternalAbort, { once: true })
      }
      try {
        const completion = await client.chat.completions.create(
          {
            model: cfg.model,
            max_tokens: cfg.maxTokens,
            messages: toOpenAIMessages(req.systemPrompt, req.messages),
          },
          { signal: controller.signal as AbortSignal }
        )
        content = completion.choices[0]?.message?.content || ''
        usage = completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined
      } finally {
        clearTimeout(timeoutId)
        if (req.signal) req.signal.removeEventListener('abort', onExternalAbort)
      }
    }

    await logLlmCall({
      userId: req.userId ?? null,
      endpoint: req.endpoint,
      model: cfg.model,
      modelTier: 'model1',
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
      latencyMs: Date.now() - started,
      status: 'success',
      inputPreview,
      outputPreview: content.slice(0, PREVIEW_LIMIT),
      systemPrompt: systemPromptPreview,
    })

    return { content, model: cfg.model, usage }
  } catch (err) {
    const e = err as { message?: string; status?: number }
    await logLlmCall({
      userId: req.userId ?? null,
      endpoint: req.endpoint,
      model: cfg.model,
      modelTier: 'model1',
      latencyMs: Date.now() - started,
      status: 'error',
      errorMessage: e?.message || 'Unknown LLM error',
      inputPreview,
      systemPrompt: systemPromptPreview,
    })
    throw err
  }
}

/** Narrow type guard for HTTP status on OpenAI SDK errors. */
export function llmErrorStatus(err: unknown): number | undefined {
  return (err as { status?: number })?.status
}
