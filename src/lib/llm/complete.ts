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
import { buildReasoningParam, extractReasoningText } from './reasoning'
import type {
  CompletionRequest,
  CompletionResult,
  Message,
  Usage,
} from './types'

const PREVIEW_LIMIT = 500
const SYSTEM_PROMPT_LOG_LIMIT = 2000
const REASONING_LOG_LIMIT = 1000

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
      reasoningEffort: req.reasoningEffort,
    },
  })

  const started = Date.now()
  const inputPreview = firstUserPreview(req.messages)
  const systemPromptPreview = req.systemPrompt.slice(0, SYSTEM_PROMPT_LOG_LIMIT)

  try {
    let content = ''
    let reasoningText: string | undefined
    let usage: Usage | undefined
    let finishReason: string | undefined

    if (cfg.isLocalProxy) {
      // Local Claude CLI proxy does not understand the OpenRouter `reasoning`
      // parameter — the proxy just shells out to the Claude CLI with a plain
      // messages payload. Silently skip passing it here.
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
        // The OpenAI SDK types don't know about OpenRouter's `reasoning`
        // param; we build the well-typed body, then spread `reasoning` via a
        // cast on the whole create() call so we don't lose the non-stream
        // return-type narrowing.
        const baseBody: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
          model: cfg.model,
          max_tokens: cfg.maxTokens,
          messages: toOpenAIMessages(req.systemPrompt, req.messages),
          ...(req.responseFormat ? { response_format: req.responseFormat } : {}),
        }
        const body = {
          ...baseBody,
          ...buildReasoningParam(cfg.reasoningEffort),
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
        let completion: OpenAI.Chat.Completions.ChatCompletion
        try {
          completion = await client.chat.completions.create(
            body,
            { signal: controller.signal as AbortSignal }
          )
        } catch (firstErr) {
          // Some OpenRouter providers reject `response_format` as an invalid
          // parameter (400/404/422). Enabling JSON mode must never break a
          // request that would otherwise succeed — retry ONCE without it.
          // Deliberately NOT retried: 401/402/403 (auth/payment — doomed),
          // 408/429 (timeout/rate-limit — an instant retry only adds load and
          // the param isn't the problem), 5xx, aborts.
          const status = (firstErr as { status?: number })?.status
          const isParamRejection = status === 400 || status === 404 || status === 422
          if (!req.responseFormat || !isParamRejection) throw firstErr
          console.warn(`[llm] response_format rejected (status=${status}) model=${cfg.model} endpoint=${req.endpoint} — retrying without it`)
          const { response_format: _unused, ...bodyWithoutRF } = body as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & { response_format?: unknown }
          void _unused
          completion = await client.chat.completions.create(
            bodyWithoutRF as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
            { signal: controller.signal as AbortSignal }
          )
        }
        const choice = completion.choices[0]
        const msg = choice?.message
        content = msg?.content || ''
        finishReason = choice?.finish_reason ?? undefined
        // Reasoning tokens come back in a separate `message.reasoning` field
        // on OpenRouter — capture for logging, do NOT merge into content.
        reasoningText = extractReasoningText(msg)
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

    // 'length' = output truncated by max_tokens. Downstream sees broken/partial
    // JSON that the repair ladder will try to salvage — but the real fix is a
    // bigger token budget, so make the root cause loud and greppable.
    if (finishReason === 'length') {
      console.warn(`[llm] finish_reason=length (output truncated by max_tokens=${cfg.maxTokens}) endpoint=${req.endpoint} model=${cfg.model} — consider raising the token budget`)
    }

    const outputPreview = reasoningText
      ? `[reasoning:${cfg.reasoningEffort}] ${reasoningText.slice(0, REASONING_LOG_LIMIT)}\n---\n${content.slice(0, PREVIEW_LIMIT)}`
      : content.slice(0, PREVIEW_LIMIT)

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
      outputPreview,
      systemPrompt: systemPromptPreview,
    })

    return { content, model: cfg.model, usage, reasoning: reasoningText, finishReason }
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
