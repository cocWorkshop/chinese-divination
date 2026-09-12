/**
 * Local Claude CLI proxy provider.
 *
 * Activated by model sentinel 'local/claude-proxy'. POSTs to CLAUDE_PROXY_URL
 * (default http://127.0.0.1:8095) with an OpenAI-ish request body.
 *
 * Blocking only — no streaming or tool-calling support.
 */

import type { Message, Usage } from '../types'

const DEFAULT_PROXY_URL = 'http://127.0.0.1:8095'

export interface ClaudeProxyRequest {
  systemPrompt: string
  messages: Message[]
  maxTokens: number
  timeoutMs: number
  signal?: AbortSignal
}

export interface ClaudeProxyResponse {
  content: string
  usage?: Usage
}

export async function callClaudeProxy(
  req: ClaudeProxyRequest
): Promise<ClaudeProxyResponse> {
  const proxyUrl = process.env.CLAUDE_PROXY_URL || DEFAULT_PROXY_URL

  // Merge external signal with internal timeout signal.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs)
  const onExternalAbort = () => controller.abort()
  if (req.signal) {
    if (req.signal.aborted) controller.abort()
    else req.signal.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    const body = JSON.stringify({
      messages: [
        { role: 'system', content: req.systemPrompt },
        ...req.messages.map((m) => ({ role: m.role, content: m.content ?? '' })),
      ],
      max_tokens: req.maxTokens,
    })

    const res = await fetch(`${proxyUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      // Carry the upstream status so callers (e.g. the divination route's
      // 429/5xx mapping) can map it instead of always falling back to 502.
      const err = new Error(errBody.error || `Proxy returned ${res.status}`) as Error & { status?: number }
      err.status = res.status
      throw err
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
      }
    }

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    }
  } finally {
    clearTimeout(timeoutId)
    if (req.signal) req.signal.removeEventListener('abort', onExternalAbort)
  }
}
