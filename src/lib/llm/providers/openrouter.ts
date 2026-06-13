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
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:8094',
      'X-Title': X_TITLE_BY_ENDPOINT[opts.endpoint],
    },
  })
}
