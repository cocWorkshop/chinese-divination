/**
 * UserPortrait store — typed wrapper around UserPortrait + UserPortraitHistory.
 *
 * Versioning rule: every save that changes any field bumps `version` and
 * appends a row to UserPortraitHistory with the trigger source. Identical
 * portraits (no diff) are no-ops — neither table is touched.
 *
 * Manual edits: lastManualEditAt is set on user-initiated saves so the
 * extractor can respect manually-edited fields and not overwrite them.
 */

import { prisma } from '../prisma'

export type PortraitTone = 'direct' | 'gentle' | 'neutral'
export type PortraitDepth = 'concise' | 'balanced' | 'detailed'
export type PortraitLang = 'zh-TW' | 'en'

export interface PortraitPreferences {
  tone?: PortraitTone
  depth?: PortraitDepth
  language?: PortraitLang
}

/**
 * Domain model. Stored fields are normalized JSON strings in the DB but
 * exposed as parsed objects to callers. lifeContext / toneNotes are free
 * text; topics is a flat array of short topic keys (e.g. "career", "health").
 */
export interface Portrait {
  topics: string[]
  preferences: PortraitPreferences
  lifeContext?: string | null
  toneNotes?: string | null
}

export interface PortraitRow extends Portrait {
  userId: string
  version: number
  generatedPrompt: string | null
  lastExtractedAt: Date
  lastTurnIndexCovered: number
  lastManualEditAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PortraitTrigger = 'auto' | 'manual' | 'admin' | 'restore'

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function loadPortrait(userId: string): Promise<PortraitRow | null> {
  try {
    const row = await prisma.userPortrait.findUnique({ where: { userId } })
    if (!row) return null
    return {
      userId: row.userId,
      version: row.version,
      topics: safeJsonParse<string[]>(row.topics, []),
      preferences: safeJsonParse<PortraitPreferences>(row.preferences, {}),
      lifeContext: row.lifeContext,
      toneNotes: row.toneNotes,
      generatedPrompt: row.generatedPrompt,
      lastExtractedAt: row.lastExtractedAt,
      lastTurnIndexCovered: row.lastTurnIndexCovered,
      lastManualEditAt: row.lastManualEditAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  } catch (err) {
    console.error('[portraitStore] loadPortrait failed:', err)
    return null
  }
}

export async function loadPortraitHistory(
  userId: string,
  limit = 20,
): Promise<Array<{
  id: string
  version: number
  topics: string[]
  preferences: PortraitPreferences
  lifeContext: string | null
  toneNotes: string | null
  trigger: PortraitTrigger
  createdAt: Date
}>> {
  try {
    const rows = await prisma.userPortraitHistory.findMany({
      where: { userId },
      orderBy: { version: 'desc' },
      take: limit,
    })
    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      topics: safeJsonParse<string[]>(r.topics, []),
      preferences: safeJsonParse<PortraitPreferences>(r.preferences, {}),
      lifeContext: r.lifeContext,
      toneNotes: r.toneNotes,
      trigger: r.trigger as PortraitTrigger,
      createdAt: r.createdAt,
    }))
  } catch (err) {
    console.error('[portraitStore] loadPortraitHistory failed:', err)
    return []
  }
}

// ─── Write ─────────────────────────────────────────────────────────────────

/**
 * Compares two portraits for equality. Returns true if all fields match.
 * Used to short-circuit no-op writes.
 */
export function portraitEquals(a: Portrait | null, b: Portrait): boolean {
  if (!a) return false
  if (a.lifeContext !== b.lifeContext) return false
  if (a.toneNotes !== b.toneNotes) return false
  if (JSON.stringify(a.topics) !== JSON.stringify(b.topics)) return false
  if (JSON.stringify(a.preferences) !== JSON.stringify(b.preferences)) return false
  return true
}

export interface SavePortraitInput {
  userId: string
  portrait: Portrait
  trigger: PortraitTrigger
  /** Pre-rendered personalized prompt block to cache. */
  generatedPrompt?: string | null
  /** Cursor for the extractor — turn index of the latest input message. */
  lastTurnIndexCovered?: number
}

export interface SavePortraitResult {
  saved: boolean
  reason?: 'no_change' | 'failed'
  newVersion?: number
}

/**
 * Diff-and-save. If the new portrait is identical to the existing one,
 * skip the write entirely (returns saved:false, reason:'no_change').
 * Otherwise upsert the row, bump the version, and append a history row.
 *
 * The trigger is recorded in the history row so the admin debug page can
 * distinguish auto-extraction from manual edits.
 */
export async function savePortrait(input: SavePortraitInput): Promise<SavePortraitResult> {
  try {
    const existing = await loadPortrait(input.userId)
    if (existing && portraitEquals(existing, input.portrait)) {
      return { saved: false, reason: 'no_change' }
    }

    const newVersion = (existing?.version ?? 0) + 1
    const topicsJson = JSON.stringify(input.portrait.topics)
    const preferencesJson = JSON.stringify(input.portrait.preferences)
    const lifeContext = input.portrait.lifeContext ?? null
    const toneNotes = input.portrait.toneNotes ?? null
    const generatedPrompt = input.generatedPrompt ?? null
    const cursor = input.lastTurnIndexCovered ?? existing?.lastTurnIndexCovered ?? 0
    const isManual = input.trigger === 'manual'
    const now = new Date()

    await prisma.userPortrait.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        version: newVersion,
        topics: topicsJson,
        preferences: preferencesJson,
        lifeContext,
        toneNotes,
        generatedPrompt,
        lastExtractedAt: now,
        lastTurnIndexCovered: cursor,
        lastManualEditAt: isManual ? now : null,
      },
      update: {
        version: newVersion,
        topics: topicsJson,
        preferences: preferencesJson,
        lifeContext,
        toneNotes,
        generatedPrompt,
        lastExtractedAt: now,
        lastTurnIndexCovered: cursor,
        // Preserve previous lastManualEditAt for non-manual triggers; only
        // overwrite when the current save is a manual edit.
        ...(isManual ? { lastManualEditAt: now } : {}),
      },
    })

    await prisma.userPortraitHistory.create({
      data: {
        userId: input.userId,
        version: newVersion,
        topics: topicsJson,
        preferences: preferencesJson,
        lifeContext,
        toneNotes,
        trigger: input.trigger,
      },
    })

    return { saved: true, newVersion }
  } catch (err) {
    console.error('[portraitStore] savePortrait failed:', err)
    return { saved: false, reason: 'failed' }
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────

/**
 * Hard-delete portrait + all history rows for a user. Used by:
 * - User clicking "Delete portrait" on /profile/portrait
 * - DELETE /api/master "Forget everything" button
 * - Account deletion (GDPR)
 * - Admin reset action
 */
export async function deletePortrait(userId: string): Promise<{ deleted: boolean }> {
  try {
    await prisma.$transaction([
      prisma.userPortrait.deleteMany({ where: { userId } }),
      prisma.userPortraitHistory.deleteMany({ where: { userId } }),
    ])
    return { deleted: true }
  } catch (err) {
    console.error('[portraitStore] deletePortrait failed:', err)
    return { deleted: false }
  }
}
