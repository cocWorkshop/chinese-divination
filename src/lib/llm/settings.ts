/**
 * Centralized resolution of LLM configuration for all endpoints.
 *
 * Resolution order per field:
 *   1. Caller override (CompletionRequest / StreamRequest)
 *   2. AdminSetting row (from DB, short-TTL cached)
 *   3. Environment variable
 *   4. Hardcoded default
 *
 * Routes pass their own AdminSetting map if they already fetched it (to avoid
 * a duplicate query); otherwise this module will load the keys it needs via
 * loadLLMSettings(), which serves from a process-wide TTL cache.
 */

import { prisma } from '../prisma'
import type { Endpoint, ReasoningEffort } from './types'

export interface LLMConfig {
  model: string
  maxTokens: number
  timeoutMs: number
  /** Sentinel detection: 'local/claude-proxy' routes to the claudeProxy provider. */
  isLocalProxy: boolean
  /** Resolved reasoning / extended-thinking strength for this call. */
  reasoningEffort: ReasoningEffort
}

export interface ResolveOptions {
  endpoint: Endpoint
  /** Pre-fetched AdminSetting key→value map. If omitted, this module loads from the cache. */
  settingsMap?: Record<string, string | undefined>
  /** Explicit overrides from caller (take precedence over everything). */
  overrides?: {
    model?: string
    maxTokens?: number
    timeoutMs?: number
    reasoningEffort?: ReasoningEffort
  }
}

const DEFAULT_MODEL = 'anthropic/claude-3-5-haiku'
const DEFAULT_MASTER_MODEL = 'openai/gpt-4o'
const DEFAULT_MAX_TOKENS = 8192
const DEFAULT_TIMEOUT_SECONDS = 240

// Per-endpoint reasoning defaults.
// Divination is latency-tolerant (60-240s), benefits from deeper thinking.
// Chat / master are interactive — prefer low latency, cheaper output.
const DEFAULT_DIVINATION_REASONING: ReasoningEffort = 'medium'
const DEFAULT_CHAT_REASONING: ReasoningEffort = 'low'

const SETTING_KEYS = [
  'model1Name',
  'chatModelName',
  'llmTimeoutSeconds',
  'llmMaxTokens',
  // Per-endpoint reasoning settings (preferred).
  'divinationReasoningEffort',
  'chatReasoningEffort',
  // Global fallback (used if the endpoint-specific key is unset).
  'llmReasoningEffort',
] as const

// Keys that routes must include when they pre-fetch AdminSetting themselves
// and pass `settingsMap` to `resolveLLMConfig`. Exported so call sites can't drift.
export const LLM_SETTING_KEYS = SETTING_KEYS

const VALID_REASONING: readonly ReasoningEffort[] = ['low', 'medium', 'high', 'off']

function parseReasoningEffort(
  raw: string | undefined,
  fallback: ReasoningEffort
): ReasoningEffort {
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase() as ReasoningEffort
  return VALID_REASONING.includes(normalized) ? normalized : fallback
}

// ─── TTL cache for loadLLMSettings ──────────────────────────────────────────
// Avoids a DB round-trip on every LLM call. Admin-setting changes become
// visible within CACHE_TTL_MS (default 60s). Tests can force-invalidate via
// clearLLMSettingsCache(). Routes that fetch settings directly (e.g. the
// divination route, which also needs maintenanceMode / divinationEnabled)
// bypass this cache intentionally — those routes must include the
// LLM_SETTING_KEYS in their own `key in` filter.

const CACHE_TTL_MS = 60_000
let settingsCache: {
  value: Record<string, string | undefined>
  expiresAt: number
} | null = null

export function clearLLMSettingsCache(): void {
  settingsCache = null
}

export async function loadLLMSettings(): Promise<Record<string, string | undefined>> {
  const now = Date.now()
  if (settingsCache && settingsCache.expiresAt > now) {
    return settingsCache.value
  }
  const rows = await prisma.adminSetting.findMany({
    where: { key: { in: SETTING_KEYS as unknown as string[] } },
  })
  const value = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  settingsCache = { value, expiresAt: now + CACHE_TTL_MS }
  return value
}

function parseIntOrDefault(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function resolveModelForEndpoint(
  endpoint: Endpoint,
  settingsMap: Record<string, string | undefined>
): string {
  if (endpoint === 'master') {
    // Master keeps its distinct env-var chain but also honors model1Name from
    // AdminSetting if no env override is set.
    return (
      process.env.MASTER_MODEL ||
      process.env.OPENROUTER_MODEL ||
      settingsMap.model1Name ||
      DEFAULT_MASTER_MODEL
    )
  }
  if (endpoint === 'chat') {
    return (
      settingsMap.chatModelName ||
      settingsMap.model1Name ||
      process.env.OPENROUTER_MODEL ||
      DEFAULT_MODEL
    )
  }
  // divination
  return (
    settingsMap.model1Name ||
    process.env.OPENROUTER_MODEL ||
    DEFAULT_MODEL
  )
}

function resolveReasoningForEndpoint(
  endpoint: Endpoint,
  settingsMap: Record<string, string | undefined>
): ReasoningEffort {
  // divination vs chat/master split
  const isDivination = endpoint === 'divination'
  const endpointKey = isDivination
    ? settingsMap.divinationReasoningEffort
    : settingsMap.chatReasoningEffort
  const endpointEnv = isDivination
    ? process.env.DIVINATION_REASONING_EFFORT
    : process.env.CHAT_REASONING_EFFORT
  const fallbackDefault = isDivination ? DEFAULT_DIVINATION_REASONING : DEFAULT_CHAT_REASONING

  // Endpoint-specific (DB) → global fallback (DB) → endpoint-specific (env)
  // → global fallback (env) → hardcoded default.
  return parseReasoningEffort(
    endpointKey ??
      settingsMap.llmReasoningEffort ??
      endpointEnv ??
      process.env.LLM_REASONING_EFFORT,
    fallbackDefault
  )
}

export async function resolveLLMConfig(opts: ResolveOptions): Promise<LLMConfig> {
  const settingsMap = opts.settingsMap ?? (await loadLLMSettings())
  const overrides = opts.overrides ?? {}

  const model = overrides.model ?? resolveModelForEndpoint(opts.endpoint, settingsMap)
  const maxTokens =
    overrides.maxTokens ??
    parseIntOrDefault(settingsMap.llmMaxTokens, DEFAULT_MAX_TOKENS)
  const timeoutSeconds = parseIntOrDefault(
    settingsMap.llmTimeoutSeconds,
    DEFAULT_TIMEOUT_SECONDS
  )
  const timeoutMs = overrides.timeoutMs ?? timeoutSeconds * 1000

  const reasoningEffort =
    overrides.reasoningEffort ?? resolveReasoningForEndpoint(opts.endpoint, settingsMap)

  return {
    model,
    maxTokens,
    timeoutMs,
    isLocalProxy: model === 'local/claude-proxy',
    reasoningEffort,
  }
}

export const LLM_DEFAULTS = {
  MODEL: DEFAULT_MODEL,
  MASTER_MODEL: DEFAULT_MASTER_MODEL,
  MAX_TOKENS: DEFAULT_MAX_TOKENS,
  TIMEOUT_SECONDS: DEFAULT_TIMEOUT_SECONDS,
  DIVINATION_REASONING: DEFAULT_DIVINATION_REASONING,
  CHAT_REASONING: DEFAULT_CHAT_REASONING,
} as const
