/**
 * Master system prompt composer.
 *
 * Assembles:
 *   1. Persona (from divination-refs/master.md)
 *   2. Capability catalog (generated from tool registry)
 *   3. Skills catalog (generated from skills registry, language-aware)
 *   4. Personalized prompt block (optional, rendered from UserPortrait)
 *   5. Dynamic per-request context (language, current time)
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
   * Personalized prompt block rendered from UserPortrait by
   * renderPersonalizedPrompt(). When null/empty, the block is omitted —
   * the cold-start path is identical to the pre-feature output.
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
  return [
    '## Current session',
    `- Language: ${input.lang}`,
    `- Current date/time: ${input.currentDateTime}`,
  ].join('\n')
}
