/**
 * Persona loader — reads divination-refs/master.md from disk, cached per
 * process. Mirrors the pattern used by src/lib/llm/prompts.ts for divination
 * reference files.
 */

import fs from 'fs'
import path from 'path'

let cached: string | null = null

export function loadMasterPersona(): string {
  if (cached !== null) return cached
  const p = path.join(process.cwd(), 'divination-refs', 'master.md')
  try {
    cached = fs.readFileSync(p, 'utf-8')
    return cached
  } catch (e) {
    console.error(`[master/persona] Failed to load ${p}:`, (e as Error).message)
    cached = '' // prevent repeated attempts on hot path
    return ''
  }
}

/** Test-only: clear the in-process cache so new file content can be loaded. */
export function clearMasterPersonaCache(): void {
  cached = null
}
