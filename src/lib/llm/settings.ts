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
// Master background tasks (summarization / portrait extraction) default to a
// cheap, fast model — these are infrastructure calls, not user-facing answers.
const DEFAULT_MASTER_BACKGROUND_MODEL = 'openai/gpt-4o-mini'
const DEFAULT_MAX_TOKENS = 8192
// Master background tasks (summary / portrait extraction) emit short outputs;
// a small default keeps them cheap/fast. Admin can override per-function.
const DEFAULT_MASTER_BACKGROUND_MAX_TOKENS = 1500
const DEFAULT_TIMEOUT_SECONDS = 240

// Per-endpoint reasoning defaults.
// Divination is latency-tolerant (60-240s), benefits from deeper thinking.
// Chat / master are interactive — prefer low latency, cheaper output.
const DEFAULT_DIVINATION_REASONING: ReasoningEffort = 'medium'
const DEFAULT_CHAT_REASONING: ReasoningEffort = 'low'
// Master main answer is interactive → low. Background tasks (summaries,
// portrait extraction) don't need reasoning → off by default.
const DEFAULT_MASTER_REASONING: ReasoningEffort = 'low'
const DEFAULT_MASTER_BACKGROUND_REASONING: ReasoningEffort = 'off'

const SETTING_KEYS = [
  'model1Name',
  'chatModelName',
  // Per-function master models: main answer vs. background tasks.
  'masterModelName',
  'masterBackgroundModelName',
  // Legacy key kept as a fallback for masterBackground (was the portrait model).
  'portraitModelName',
  // Per-function reasoning effort.
  'divinationReasoningEffort',
  'chatReasoningEffort',
  'masterReasoningEffort',
  'masterBackgroundReasoningEffort',
  // Per-function max output tokens.
  'divinationMaxTokens',
  'chatMaxTokens',
  'masterMaxTokens',
  'masterBackgroundMaxTokens',
  // Per-function request timeout (seconds).
  'divinationTimeoutSeconds',
  'chatTimeoutSeconds',
  'masterTimeoutSeconds',
  'masterBackgroundTimeoutSeconds',
  // Global fallbacks (used when a per-function key is unset/empty).
  'llmTimeoutSeconds',
  'llmMaxTokens',
  'llmReasoningEffort',
] as const

// Per-endpoint AdminSetting key names + reasoning env var + reasoning default.
// Model keys are resolved separately (irregular legacy names) in
// resolveModelForEndpoint; this table covers reasoning / tokens / timeout.
const ENDPOINT_CFG: Record<Endpoint, {
  reasoningKey: string
  reasoningEnv: string
  reasoningDefault: ReasoningEffort
  maxTokensKey: string
  maxTokensDefault: number
  timeoutKey: string
}> = {
  divination: { reasoningKey: 'divinationReasoningEffort', reasoningEnv: 'DIVINATION_REASONING_EFFORT', reasoningDefault: DEFAULT_DIVINATION_REASONING, maxTokensKey: 'divinationMaxTokens', maxTokensDefault: DEFAULT_MAX_TOKENS, timeoutKey: 'divinationTimeoutSeconds' },
  chat: { reasoningKey: 'chatReasoningEffort', reasoningEnv: 'CHAT_REASONING_EFFORT', reasoningDefault: DEFAULT_CHAT_REASONING, maxTokensKey: 'chatMaxTokens', maxTokensDefault: DEFAULT_MAX_TOKENS, timeoutKey: 'chatTimeoutSeconds' },
  master: { reasoningKey: 'masterReasoningEffort', reasoningEnv: 'MASTER_REASONING_EFFORT', reasoningDefault: DEFAULT_MASTER_REASONING, maxTokensKey: 'masterMaxTokens', maxTokensDefault: DEFAULT_MAX_TOKENS, timeoutKey: 'masterTimeoutSeconds' },
  masterBackground: { reasoningKey: 'masterBackgroundReasoningEffort', reasoningEnv: 'MASTER_BACKGROUND_REASONING_EFFORT', reasoningDefault: DEFAULT_MASTER_BACKGROUND_REASONING, maxTokensKey: 'masterBackgroundMaxTokens', maxTokensDefault: DEFAULT_MASTER_BACKGROUND_MAX_TOKENS, timeoutKey: 'masterBackgroundTimeoutSeconds' },
}

// First value that is present and non-blank. Treats '' (an empty admin field)
// as "unset" so it falls through to the global fallback / default.
function firstSet(...vals: (string | undefined)[]): string | undefined {
  for (const v of vals) if (v != null && v.trim() !== '') return v
  return undefined
}

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
    // Admin-configured master model wins (so the admin page is authoritative);
    // then the legacy env-var chain; then model1Name; then default.
    return (
      settingsMap.masterModelName ||
      process.env.MASTER_MODEL ||
      process.env.OPENROUTER_MODEL ||
      settingsMap.model1Name ||
      DEFAULT_MASTER_MODEL
    )
  }
  if (endpoint === 'masterBackground') {
    // Background tasks (summarization / portrait extraction). Admin key wins,
    // then the legacy PORTRAIT_MODEL env + portraitModelName key for backward
    // compatibility, then a cheap default.
    return (
      settingsMap.masterBackgroundModelName ||
      process.env.PORTRAIT_MODEL ||
      settingsMap.portraitModelName ||
      DEFAULT_MASTER_BACKGROUND_MODEL
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
  // divination — historically the "primary"/standard model, so its admin keys
  // keep the legacy names `model1Name` (API id) + `model1Label` (display name).
  // This is intentional: model1 == the Divination model. Other functions use
  // <fn>ModelName; only divination retains the model1 alias.
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
  const c = ENDPOINT_CFG[endpoint]
  // Per-function (DB) → global (DB) → per-function (env) → global (env) → default.
  return parseReasoningEffort(
    firstSet(
      settingsMap[c.reasoningKey],
      settingsMap.llmReasoningEffort,
      process.env[c.reasoningEnv],
      process.env.LLM_REASONING_EFFORT,
    ),
    c.reasoningDefault
  )
}

function resolveMaxTokensForEndpoint(
  endpoint: Endpoint,
  settingsMap: Record<string, string | undefined>
): number {
  const c = ENDPOINT_CFG[endpoint]
  // Per-function (DB) → global llmMaxTokens (DB) → per-function default.
  return parseIntOrDefault(
    firstSet(settingsMap[c.maxTokensKey], settingsMap.llmMaxTokens),
    c.maxTokensDefault
  )
}

function resolveTimeoutSecondsForEndpoint(
  endpoint: Endpoint,
  settingsMap: Record<string, string | undefined>
): number {
  const c = ENDPOINT_CFG[endpoint]
  // Per-function (DB) → global llmTimeoutSeconds (DB) → default.
  return parseIntOrDefault(
    firstSet(settingsMap[c.timeoutKey], settingsMap.llmTimeoutSeconds),
    DEFAULT_TIMEOUT_SECONDS
  )
}

export async function resolveLLMConfig(opts: ResolveOptions): Promise<LLMConfig> {
  const settingsMap = opts.settingsMap ?? (await loadLLMSettings())
  const overrides = opts.overrides ?? {}

  const model = overrides.model ?? resolveModelForEndpoint(opts.endpoint, settingsMap)
  const maxTokens =
    overrides.maxTokens ?? resolveMaxTokensForEndpoint(opts.endpoint, settingsMap)
  const timeoutSeconds = resolveTimeoutSecondsForEndpoint(opts.endpoint, settingsMap)
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
  MASTER_BACKGROUND_MODEL: DEFAULT_MASTER_BACKGROUND_MODEL,
  MAX_TOKENS: DEFAULT_MAX_TOKENS,
  TIMEOUT_SECONDS: DEFAULT_TIMEOUT_SECONDS,
  DIVINATION_REASONING: DEFAULT_DIVINATION_REASONING,
  CHAT_REASONING: DEFAULT_CHAT_REASONING,
  MASTER_REASONING: DEFAULT_MASTER_REASONING,
  MASTER_BACKGROUND_REASONING: DEFAULT_MASTER_BACKGROUND_REASONING,
} as const
