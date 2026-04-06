/**
 * Streaming LLM completion with optional tool-calling support.
 *
 * Owns:
 *   - config resolution (per endpoint)
 *   - OpenRouter client creation (claudeProxy does not support streaming)
 *   - timeout enforcement
 *   - per-call logging via logLlmCall() at stream end (success or error)
 *
 * Yields StreamChunk values:
 *   - { type: 'content', text }
 *   - { type: 'tool_call_delta', index, id?, name?, argumentsDelta? }
 *   - { type: 'done', finishReason, usage? }
 *
 * Callers (e.g. the master route) own the tool-execution loop: when they
 * see finishReason === 'tool_calls' in the done chunk, they dispatch the
 * tools, append results to their message list, and call streamLLM() again.
 */

import OpenAI from 'openai'
import { logLlmCall } from '../llmLogger'
import { resolveLLMConfig } from './settings'
import { createOpenRouterClient } from './providers/openrouter'
import type {
  CompletionRequest,
  Message,
  StreamChunk,
  Tool,
  Usage,
} from './types'

const PREVIEW_LIMIT = 500
const SYSTEM_PROMPT_LOG_LIMIT = 2000

export interface StreamRequest extends CompletionRequest {
  tools?: Tool[]
}

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

export async function* streamLLM(
  req: StreamRequest
): AsyncIterable<StreamChunk> {
  const cfg = await resolveLLMConfig({
    endpoint: req.endpoint,
    overrides: {
      model: req.model,
      maxTokens: req.maxTokens,
      timeoutMs: req.timeoutMs,
    },
  })

  if (cfg.isLocalProxy) {
    throw new Error(
      "streamLLM does not support the 'local/claude-proxy' model; use completeLLM for blocking calls."
    )
  }

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

  const started = Date.now()
  const inputPreview = firstUserPreview(req.messages)
  const systemPromptPreview = req.systemPrompt.slice(0, SYSTEM_PROMPT_LOG_LIMIT)
  let accumulatedContent = ''
  let finishReason = ''
  let usage: Usage | undefined

  try {
    const completion = await client.chat.completions.create(
      {
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        messages: toOpenAIMessages(req.systemPrompt, req.messages),
        ...(req.tools ? { tools: req.tools as unknown as OpenAI.Chat.Completions.ChatCompletionTool[] } : {}),
        stream: true,
      },
      { signal: controller.signal as AbortSignal }
    )

    for await (const chunk of completion) {
      const choice = chunk.choices[0]
      if (!choice) continue
      const delta = choice.delta
      if (choice.finish_reason) finishReason = choice.finish_reason

      if (delta?.content) {
        accumulatedContent += delta.content
        yield { type: 'content', text: delta.content }
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index === undefined) continue
          yield {
            type: 'tool_call_delta',
            index: tc.index,
            id: tc.id,
            name: tc.function?.name,
            argumentsDelta: tc.function?.arguments,
          }
        }
      }

      // OpenAI streaming usage (sent in last chunk when stream_options.include_usage is set;
      // OpenRouter forwards it if available).
      const chunkUsage = (chunk as { usage?: OpenAI.Completions.CompletionUsage | null }).usage
      if (chunkUsage) {
        usage = {
          promptTokens: chunkUsage.prompt_tokens,
          completionTokens: chunkUsage.completion_tokens,
          totalTokens: chunkUsage.total_tokens,
        }
      }
    }

    yield { type: 'done', finishReason, usage }

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
      outputPreview: accumulatedContent.slice(0, PREVIEW_LIMIT),
      systemPrompt: systemPromptPreview,
    })
  } catch (err) {
    const e = err as { message?: string }
    await logLlmCall({
      userId: req.userId ?? null,
      endpoint: req.endpoint,
      model: cfg.model,
      modelTier: 'model1',
      latencyMs: Date.now() - started,
      status: 'error',
      errorMessage: e?.message || 'Unknown LLM stream error',
      inputPreview,
      systemPrompt: systemPromptPreview,
    })
    throw err
  } finally {
    clearTimeout(timeoutId)
    if (req.signal) req.signal.removeEventListener('abort', onExternalAbort)
  }
}
