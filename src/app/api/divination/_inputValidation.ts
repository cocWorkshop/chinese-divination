/**
 * Shared request-body validation for /api/divination and
 * /api/divination/init. Route Handlers don't get Server Actions'
 * bodySizeLimit, so without these caps a client can persist and forward
 * arbitrary-size payloads to the LLM provider (cost amplification).
 */

import type { Prisma } from '@prisma/client'

const MAX_INPUT_DATA_JSON_CHARS = 20_000 // real birth profiles are <1KB
const MAX_NAME = 100
const MAX_RELATION = 50
const MAX_RELATION_DETAIL = 100
const MAX_QUESTION = 500

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export function validateInputData(
  raw: unknown
): Result<Record<string, Prisma.InputJsonValue>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'inputData must be a JSON object' }
  }
  if (JSON.stringify(raw).length > MAX_INPUT_DATA_JSON_CHARS) {
    return { ok: false, error: 'inputData too large' }
  }
  // Round-trip through JSON to strip non-JSON values (undefined, class
  // instances) — what the LLM and the DB see is exactly what was measured.
  return { ok: true, value: JSON.parse(JSON.stringify(raw)) }
}

/** Language is used in prompt branches + stored — whitelist it. */
export function sanitizeLanguage(raw: unknown): 'zh-TW' | 'en' {
  return raw === 'en' ? 'en' : 'zh-TW'
}

/** Cap the free-text question; reject non-strings instead of 500ing in Prisma. */
export function sanitizeQuestion(raw: unknown): Result<string | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'question must be a string' }
  if (raw.length > MAX_QUESTION) return { ok: false, error: `Question too long (max ${MAX_QUESTION} characters)` }
  return { ok: true, value: raw || null }
}

export interface SanitizedFamilyMember {
  relation: string
  relationDetail: string | null
  name: string | null
}

/** Cap newFamilyMember fields the way /api/family-members' Zod schema does. */
export function validateNewFamilyMember(raw: unknown): Result<SanitizedFamilyMember | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'newFamilyMember must be an object' }
  }
  const fm = raw as Record<string, unknown>
  if (typeof fm.relation !== 'string' || !fm.relation) {
    return { ok: true, value: null } // relation absent → caller treats as "not creating"
  }
  return {
    ok: true,
    value: {
      relation: fm.relation.slice(0, MAX_RELATION),
      relationDetail:
        typeof fm.relationDetail === 'string' && fm.relationDetail.trim()
          ? fm.relationDetail.trim().slice(0, MAX_RELATION_DETAIL)
          : null,
      name:
        typeof fm.name === 'string' && fm.name.trim()
          ? fm.name.trim().slice(0, MAX_NAME)
          : null,
    },
  }
}
