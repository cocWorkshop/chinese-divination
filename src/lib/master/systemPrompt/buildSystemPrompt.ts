/**
 * Master system prompt composer — progressive disclosure.
 *
 * Assembles:
 *   1. Core persona (from divination-refs/master.md) — STABLE, cacheable
 *   2. Capability catalog (from tool registry) — STABLE
 *   3. Skills catalog (from skills registry) — STABLE
 *   ─── cache prefix boundary (provider caches this block for 5 min) ───
 *   4. Personalized prompt block (per-user, from UserPortrait)
 *   5. Turn-type appendices (only injected when relevant):
 *      - reflection.md  → only on reflection turns
 *      - activation.md  → only on checkin turns
 *      - templates.md   → only on first user message in a topic
 *   6. Dynamic per-request context (language, current time)
 *
 * By keeping conditional content AFTER the stable prefix, we maximize
 * cache hit rate. Normal message turns (90%+ of traffic) carry zero
 * appendix overhead.
 */

import fs from 'fs'
import path from 'path'
import { loadMasterPersona } from './persona'
import { buildCapabilityCatalog } from './capabilityCatalog'
import { buildSkillsCatalog } from '../skills'

export type TurnType = 'message' | 'reflection' | 'checkin'

export interface BuildMasterSystemPromptInput {
  lang: 'zh-TW' | 'en'
  currentDateTime: string
  personalizedPrompt?: string | null
  /** Turn type determines which appendices are injected. Defaults to 'message'. */
  turnType?: TurnType
  /** Whether this is the first user message in a new topic (injects answer templates). */
  isFirstMessage?: boolean
}

// Lazy-loaded appendix cache
const appendixCache = new Map<string, string>()
function loadAppendix(name: string): string {
  const cached = appendixCache.get(name)
  if (cached !== undefined) return cached
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'divination-refs', 'master-appendices', `${name}.md`),
      'utf-8'
    )
    appendixCache.set(name, content)
    return content
  } catch {
    return ''
  }
}

export function buildMasterSystemPrompt(input: BuildMasterSystemPromptInput): string {
  const persona = loadMasterPersona()
  if (!persona || persona.trim().length === 0) {
    throw new Error('Master persona is empty — refusing to build system prompt without identity')
  }
  const catalog = buildCapabilityCatalog()
  const skills = buildSkillsCatalog(input.lang)

  // ─── Stable prefix (cacheable) ───
  const stablePrefix = [persona, catalog, skills].join('\n\n---\n\n')

  // ─── Per-user layer ───
  const personalized = input.personalizedPrompt && input.personalizedPrompt.trim().length > 0
    ? input.personalizedPrompt
    : null

  // ─── Turn-type appendices (conditional) ───
  const appendices: string[] = []
  const turnType = input.turnType ?? 'message'

  if (turnType === 'reflection') {
    appendices.push(loadAppendix('reflection'))
  } else if (turnType === 'checkin') {
    appendices.push(loadAppendix('activation'))
  }

  // Inject answer templates on first substantive user message
  if (input.isFirstMessage && turnType === 'message') {
    appendices.push(loadAppendix('templates'))
  }

  const appendixBlock = appendices.filter(Boolean).join('\n\n---\n\n') || null

  // ─── Dynamic context ───
  const contextBlock = buildContextBlock(input)

  return [stablePrefix, personalized, appendixBlock, contextBlock]
    .filter(Boolean)
    .join('\n\n---\n\n')
}

function buildContextBlock(input: BuildMasterSystemPromptInput): string {
  return [
    '## Current moment — authoritative; anchor all time reasoning here',
    `- Now (現在): ${input.currentDateTime}`,
    `- Language: ${input.lang}`,
    'Resolve 今天／今年／本月、流年大運、年齡、應期、擇日 against the moment above — never against an assumed or training-cutoff date.',
  ].join('\n')
}
