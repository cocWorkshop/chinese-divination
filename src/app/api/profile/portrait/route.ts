/**
 * /api/profile/portrait — user-facing portrait management.
 *
 * GET    — return current portrait + last 10 history versions
 * PUT    — manual edit (replaces fields, writes history with trigger='manual')
 * DELETE — hard delete portrait + ALL history rows
 *
 * All operations are scoped to the authenticated user. Validation is
 * intentionally permissive (the user owns this data and can put whatever
 * they want in lifeContext / toneNotes), but we cap free-text length to
 * keep prompt budgets bounded.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  loadPortrait,
  loadPortraitHistory,
  savePortrait,
  deletePortrait,
  type Portrait,
  type PortraitPreferences,
} from '@/lib/master/portraitStore'
import { renderPersonalizedPrompt } from '@/lib/master/personalizedPrompt'

const VALID_TONES = new Set(['direct', 'gentle', 'neutral'])
const VALID_DEPTHS = new Set(['concise', 'balanced', 'detailed'])
const VALID_LANGS = new Set(['zh-TW', 'en'])

const MAX_LIFE_CONTEXT_CHARS = 600
const MAX_TONE_NOTES_CHARS = 300
const MAX_TOPICS = 12
const MAX_TOPIC_LENGTH = 30

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const userId = session.user.id

  const [portrait, history] = await Promise.all([
    loadPortrait(userId),
    loadPortraitHistory(userId, 10),
  ])

  return NextResponse.json({
    portrait: portrait
      ? {
          version: portrait.version,
          topics: portrait.topics,
          preferences: portrait.preferences,
          lifeContext: portrait.lifeContext,
          toneNotes: portrait.toneNotes,
          generatedPrompt: portrait.generatedPrompt,
          lastExtractedAt: portrait.lastExtractedAt.toISOString(),
          lastTurnIndexCovered: portrait.lastTurnIndexCovered,
          lastManualEditAt: portrait.lastManualEditAt?.toISOString() ?? null,
          createdAt: portrait.createdAt.toISOString(),
          updatedAt: portrait.updatedAt.toISOString(),
        }
      : null,
    history: history.map((h) => ({
      id: h.id,
      version: h.version,
      topics: h.topics,
      preferences: h.preferences,
      lifeContext: h.lifeContext,
      toneNotes: h.toneNotes,
      trigger: h.trigger,
      createdAt: h.createdAt.toISOString(),
    })),
  })
}

// ─── PUT (manual edit) ─────────────────────────────────────────────────────

interface PutBody {
  topics?: string[]
  preferences?: PortraitPreferences
  lifeContext?: string | null
  toneNotes?: string | null
}

function sanitizeBody(body: PutBody, lang: 'zh-TW' | 'en'): Portrait {
  const topics: string[] = Array.isArray(body.topics)
    ? body.topics
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().slice(0, MAX_TOPIC_LENGTH))
        .filter((t) => t.length > 0)
        .slice(0, MAX_TOPICS)
    : []

  const prefs: PortraitPreferences = {}
  const inPrefs = body.preferences && typeof body.preferences === 'object' ? body.preferences : {}
  if (typeof inPrefs.tone === 'string' && VALID_TONES.has(inPrefs.tone)) {
    prefs.tone = inPrefs.tone as PortraitPreferences['tone']
  }
  if (typeof inPrefs.depth === 'string' && VALID_DEPTHS.has(inPrefs.depth)) {
    prefs.depth = inPrefs.depth as PortraitPreferences['depth']
  }
  if (typeof inPrefs.language === 'string' && VALID_LANGS.has(inPrefs.language)) {
    prefs.language = inPrefs.language as PortraitPreferences['language']
  } else {
    // Default the preference language to the user's session language
    prefs.language = lang
  }

  const lifeContext =
    typeof body.lifeContext === 'string' ? body.lifeContext.trim().slice(0, MAX_LIFE_CONTEXT_CHARS) || null : null
  const toneNotes =
    typeof body.toneNotes === 'string' ? body.toneNotes.trim().slice(0, MAX_TONE_NOTES_CHARS) || null : null

  return { topics, preferences: prefs, lifeContext, toneNotes }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const userId = session.user.id

  let body: PutBody
  try {
    body = (await req.json()) as PutBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Resolve user lang from the existing User row (best-effort default)
  const lang: 'zh-TW' | 'en' = 'zh-TW' // default; matches existing master Lang convention

  const portrait = sanitizeBody(body, lang)
  const generatedPrompt = renderPersonalizedPrompt(portrait, lang)

  const result = await savePortrait({
    userId,
    portrait,
    trigger: 'manual',
    generatedPrompt,
  })

  if (!result.saved && result.reason === 'failed') {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  // Return the updated portrait
  const updated = await loadPortrait(userId)
  return NextResponse.json({
    saved: result.saved,
    reason: result.reason,
    newVersion: result.newVersion,
    portrait: updated
      ? {
          version: updated.version,
          topics: updated.topics,
          preferences: updated.preferences,
          lifeContext: updated.lifeContext,
          toneNotes: updated.toneNotes,
          generatedPrompt: updated.generatedPrompt,
          lastManualEditAt: updated.lastManualEditAt?.toISOString() ?? null,
        }
      : null,
  })
}

// ─── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const userId = session.user.id

  const result = await deletePortrait(userId)
  if (!result.deleted) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
  return NextResponse.json({ deleted: true })
}
