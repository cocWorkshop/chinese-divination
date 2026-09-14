/**
 * OpenRouter provider (OpenAI SDK wrapper).
 *
 * Instantiates an OpenAI client configured for OpenRouter with consistent
 * HTTP-Referer and X-Title headers across all endpoints.
 */

import OpenAI from 'openai'
import type { Endpoint } from '../types'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

const X_TITLE_BY_ENDPOINT: Record<Endpoint, string> = {
  divination: 'Xuanji Divination',
  chat: 'Xuanji Chat',
  master: 'Xuanji Master',
  masterBackground: 'Xuanji Master (background)',
}

export interface OpenRouterClientOptions {
  endpoint: Endpoint
  timeoutMs: number
}

export function createOpenRouterClient(opts: OpenRouterClientOptions): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }
  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    timeout: opts.timeoutMs,
    // SDK default is 2 silent retries on connection errors / 408 / 429 / 5xx.
    // Set explicitly: (a) the retry ladder in complete.ts/stream.ts only
    // covers response_format rejection, so without this comment the code
    // suggests no auto-retry happens — it does; (b) all attempts share one
    // AbortController bound to the same timeoutMs, so retries stay inside
    // the caller's timeout budget and a user abort is never retried.
    maxRetries: 2,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:8094',
      'X-Title': X_TITLE_BY_ENDPOINT[opts.endpoint],
    },
  })
}
