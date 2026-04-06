/**
 * Centralized resolution of LLM configuration for all endpoints.
 *
 * Resolution order per field:
 *   1. AdminSetting row (from DB)
 *   2. Environment variable
 *   3. Hardcoded default
 *
 * Routes pass their own AdminSetting map if they already fetched it (to avoid
 * a duplicate query); otherwise this module will load the keys it needs.
 */

import { prisma } from '../prisma'
import type { Endpoint } from './types'

export interface LLMConfig {
  model: string
  maxTokens: number
  timeoutMs: number
  /** Sentinel detection: 'local/claude-proxy' routes to the claudeProxy provider. */
  isLocalProxy: boolean
}

export interface ResolveOptions {
  endpoint: Endpoint
  /** Pre-fetched AdminSetting key→value map. If omitted, a single findMany is issued. */
  settingsMap?: Record<string, string | undefined>
  /** Explicit overrides from caller (take precedence over everything). */
  overrides?: { model?: string; maxTokens?: number; timeoutMs?: number }
}

const DEFAULT_MODEL = 'anthropic/claude-3-5-haiku'
const DEFAULT_MASTER_MODEL = 'openai/gpt-4o'
const DEFAULT_MAX_TOKENS = 8192
const DEFAULT_TIMEOUT_SECONDS = 240

const SETTING_KEYS = [
  'model1Name',
  'chatModelName',
  'llmTimeoutSeconds',
  'llmMaxTokens',
] as const

export async function loadLLMSettings(): Promise<Record<string, string | undefined>> {
  const rows = await prisma.adminSetting.findMany({
    where: { key: { in: SETTING_KEYS as unknown as string[] } },
  })
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
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
    // Master keeps its distinct env-var chain (confirmed in plan) but now
    // also honors model1Name from AdminSetting if no env override is set.
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

  return {
    model,
    maxTokens,
    timeoutMs,
    isLocalProxy: model === 'local/claude-proxy',
  }
}

export const LLM_DEFAULTS = {
  MODEL: DEFAULT_MODEL,
  MASTER_MODEL: DEFAULT_MASTER_MODEL,
  MAX_TOKENS: DEFAULT_MAX_TOKENS,
  TIMEOUT_SECONDS: DEFAULT_TIMEOUT_SECONDS,
} as const
