/**
 * Master system prompt composer.
 *
 * Assembles:
 *   1. Persona (from divination-refs/master.md)
 *   2. Capability catalog (generated from tool registry)
 *   3. Skills catalog (generated from skills registry, language-aware)
 *   4. Dynamic per-request context (language, current time, optional user portrait)
 *
 * Kept deterministic so the first ~90% is stable → benefits from the
 * provider-side prompt cache (Anthropic 5-min TTL) across turns.
 */

import { loadMasterPersona } from './persona'
import { buildCapabilityCatalog } from './capabilityCatalog'
import { buildSkillsCatalog } from '../skills'

export interface BuildMasterSystemPromptInput {
  lang: 'zh-TW' | 'en'
  currentDateTime: string
  /**
   * Optional legacy portrait summary — read once from the deprecated
   * MasterSession.portrait field for backward compatibility during the
   * Phase 4+ migration window. Phase 6 drops this entirely.
   */
  portrait?: string | null
  /**
   * Personalized prompt block (Phase 4+). Rendered from UserPortrait by
   * renderPersonalizedPrompt(). When null/empty, the block is omitted —
   * cold-start path is identical to the pre-feature output.
   *
   * The block must already include the identity guard sentence at the
   * end (renderPersonalizedPrompt always appends it). The composer does
   * not add or modify the guard.
   */
  personalizedPrompt?: string | null
}

export function buildMasterSystemPrompt(input: BuildMasterSystemPromptInput): string {
  const persona = loadMasterPersona()
  if (!persona || persona.trim().length === 0) {
    throw new Error('Master persona is empty — refusing to build system prompt without identity')
  }
  const catalog = buildCapabilityCatalog()
  const skills = buildSkillsCatalog(input.lang)
  const personalized = input.personalizedPrompt && input.personalizedPrompt.trim().length > 0
    ? input.personalizedPrompt
    : null
  const contextBlock = buildContextBlock(input)

  // Persona first (stable, cacheable), catalog + skills next (regenerates
  // when you add a tool/skill but still stable within a release), then the
  // personalized block (per-user, cache-breaking but bounded), then the
  // dynamic context (session-specific).
  return [persona, catalog, skills, personalized, contextBlock]
    .filter(Boolean)
    .join('\n\n---\n\n')
}

function buildContextBlock(input: BuildMasterSystemPromptInput): string {
  const lines: string[] = ['## Current session']
  lines.push(`- Language: ${input.lang}`)
  lines.push(`- Current date/time: ${input.currentDateTime}`)
  if (input.portrait && input.portrait.trim().length > 0) {
    lines.push('')
    lines.push('## User portrait (stable facts accumulated across sessions)')
    lines.push(input.portrait.trim())
  }
  return lines.join('\n')
}
