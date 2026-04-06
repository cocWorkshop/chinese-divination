/**
 * Centralized loader for divination-refs/*.md reference prompts.
 *
 * Files are read lazily on first access and cached for the lifetime of the
 * process. Calling more than once for the same type is a map lookup.
 */

import fs from 'fs'
import path from 'path'

export type DivinationType =
  | 'bazi'
  | 'iching'
  | 'liuyao'
  | 'ziwei'
  | 'qimen'
  | 'fengshui'
  | 'meihua'
  | 'other'

const REF_FILE_MAP: Record<DivinationType, string> = {
  bazi: 'bazi.md',
  iching: 'iching.md',
  liuyao: 'liuyao.md',
  ziwei: 'ziwei.md',
  qimen: 'qimen.md',
  fengshui: 'fengshui.md',
  meihua: 'others.md',
  other: 'others.md',
}

const cache = new Map<DivinationType, string>()

/**
 * Load the reference markdown for a divination type. Returns a placeholder
 * string if the file is missing rather than throwing — this matches the
 * prior behavior of the divination route.
 */
export function loadDivinationPrompt(type: DivinationType | string): string {
  const key = (REF_FILE_MAP[type as DivinationType] ? type : 'other') as DivinationType
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const fileName = REF_FILE_MAP[key]
  const filePath = path.join(process.cwd(), 'divination-refs', fileName)
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    cache.set(key, content)
    return content
  } catch (err) {
    console.error(`[llm/prompts] Failed to read ${filePath}:`, err)
    const fallback = '（参考资料暂时不可用）'
    // Do not cache fallback — allow later retries to succeed if the file appears.
    return fallback
  }
}

/** Test hook: clear the in-memory cache. Not for production use. */
export function __clearPromptCache(): void {
  cache.clear()
}
