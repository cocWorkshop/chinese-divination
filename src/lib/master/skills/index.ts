/**
 * Skills registry + catalog builder.
 *
 * Adding a new skill:
 *   1. Create a file in this directory exporting a SkillDef.
 *   2. Import it here and append to `skills`.
 *   3. That's it. buildSkillsCatalog() picks it up automatically, and the
 *      master system prompt includes it on the next request.
 */

import type { SkillDef } from './_types'
import { baziHepanSkill } from './baziHepan'
import { guaMingHuCanSkill } from './guaMingHuCan'

export const skills: readonly SkillDef[] = [baziHepanSkill, guaMingHuCanSkill]

export function getSkill(id: string): SkillDef | undefined {
  return skills.find((s) => s.id === id)
}

/**
 * Render the skills catalog for injection into the master system prompt.
 * Language-aware: picks zh or en name/description per user language.
 */
export function buildSkillsCatalog(lang: 'zh-TW' | 'en' = 'zh-TW'): string {
  const isZh = lang !== 'en'
  const lines: string[] = ['## Available skills (composite workflows)', '']
  for (const s of skills) {
    const name = isZh ? s.name_zh : s.name_en
    const desc = isZh ? s.description_zh : s.description_en
    const prereq = isZh ? s.prerequisites.summary_zh : s.prerequisites.summary_en
    lines.push(`### ${s.id} — ${name}`)
    lines.push(desc)
    lines.push('')
    lines.push(`**Prerequisites:** ${prereq}`)
    if (s.triggers && s.triggers.length > 0) {
      lines.push(`**Trigger cues:** ${s.triggers.join(' / ')}`)
    }
    lines.push('')
    lines.push(s.recipe)
    lines.push('')
  }
  return lines.join('\n')
}

export type { SkillDef, DivinationType } from './_types'
