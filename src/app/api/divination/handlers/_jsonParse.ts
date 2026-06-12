/**
 * Extract JSON from LLM output.
 *
 * LLMs sometimes wrap JSON in ```json fences, prepend an explanation paragraph,
 * leave trailing prose, or produce mismatched braces.  This helper is forgiving:
 * it strips code fences, trims to the outermost { … } brace pair, then
 * JSON.parses.  When the first parse fails it tries our targeted repairs
 * (premature root-close, truncation), then the general-purpose `jsonrepair`
 * library (missing/unbalanced quotes, single quotes, trailing commas,
 * unescaped newlines, …) before giving up. Real-world trigger for the
 * jsonrepair pass: array string elements emitted WITHOUT their opening quote
 * (`[\n  文字…",`), which discarded an otherwise-complete paid reading.
 *
 * On hard parse failure (cleaning + both repairs failed), returns a marker
 * shape `{ __parseFailed: true, ... }` that the route hard-rejects. We
 * deliberately do NOT inject the raw text into `sections.overview` here —
 * doing so used to fool the route's permissive hard-reject check into
 * saving the bad payload, which then surfaced as raw JSON on the result
 * page. The route looks for `__parseFailed` and bails before saving.
 */

import { jsonrepair } from 'jsonrepair'

/** Marker exported so the route + tests can recognize a failed-parse fallback. */
export const PARSE_FAILED_KEY = '__parseFailed'

export function parseJsonFromLLMOutput(
  rawText: string,
  type: string
): Record<string, unknown> {
  let cleaned = rawText.trim()
  try {
    // Strip ```json ... ``` or ``` ... ``` fences.
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim()
    }
    // Trim leading/trailing non-JSON prose.
    if (!cleaned.startsWith('{')) {
      const firstBrace = cleaned.indexOf('{')
      if (firstBrace !== -1) cleaned = cleaned.substring(firstBrace)
    }
    if (!cleaned.endsWith('}')) {
      const lastBrace = cleaned.lastIndexOf('}')
      if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1)
    }
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    // Attempt repair: LLMs occasionally emit extra `}` mid-way (premature
    // root-close) or truncate the output.  Try brace-rebalancing first, then
    // truncation recovery.
    try {
      const fixed = repairJson(cleaned)
      if (fixed !== cleaned) {
        const parsed = JSON.parse(fixed) as Record<string, unknown>
        // Observability: a silent repair means the model emitted broken JSON.
        // Track which rung fired so model-quality drift shows up in logs
        // BEFORE outputs degrade into hard failures.
        console.warn(`[jsonParse] repaired pass=targeted type=${type} rawLen=${rawText.length}`)
        return parsed
      }
    } catch { /* fall through */ }
    // Targeted repairs failed — run the general-purpose jsonrepair pass
    // (missing opening quotes, single quotes, trailing commas, unescaped
    // control chars, …). Guard the result: jsonrepair will happily "repair"
    // plain prose into a JSON *string*, so only accept a plain object.
    try {
      const parsed = JSON.parse(jsonrepair(cleaned)) as unknown
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        console.warn(`[jsonParse] repaired pass=jsonrepair type=${type} rawLen=${rawText.length}`)
        return parsed as Record<string, unknown>
      }
    } catch { /* fall through */ }
    // All repairs failed — emit the explicit parseFailed marker. The raw
    // text is still attached for log forensics / DB llmRawOutput, but is
    // intentionally NOT placed under any field the renderer would display.
    return { [PARSE_FAILED_KEY]: true, type, rawText }
  }
}

/**
 * Attempt two repairs:
 * 1. Remove premature root-close braces (extra `}` mid-way).
 * 2. If the output is truncated (unterminated string / unclosed braces),
 *    close the string and append enough `}` / `]` to balance.
 */
function repairJson(src: string): string {
  // --- Pass 1: remove premature root-close braces ---
  const len = src.length
  let depth = 0
  let inString = false
  let escape = false
  const removals: number[] = []

  for (let i = 0; i < len; i++) {
    const ch = src[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { if (inString) escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) {
        // Check if there is meaningful JSON content remaining after this position.
        const rest = src.substring(i + 1).trim()
        if (rest.startsWith(',') || rest.startsWith('"')) {
          // Premature root-close — mark for removal
          removals.push(i)
          depth = 1 // restore depth as if we're still inside root
        }
      }
    }
  }

  let repaired = src
  if (removals.length > 0) {
    const parts: string[] = []
    let prev = 0
    for (const idx of removals) {
      parts.push(src.substring(prev, idx))
      prev = idx + 1
    }
    parts.push(src.substring(prev))
    repaired = parts.join('')
  }

  // --- Pass 2: handle truncated output ---
  // Re-scan to find final state
  depth = 0
  inString = false
  escape = false
  const stack: string[] = [] // track open brackets for closing
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { if (inString) escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }

  if (inString || stack.length > 0) {
    // Truncated output — close it.
    // Trim trailing incomplete key-value: remove trailing comma, colon, partial key
    let trimmed = repaired
    if (inString) {
      // Close the unterminated string
      trimmed += '"'
    }
    // Remove any trailing comma or colon outside strings
    trimmed = trimmed.replace(/[,:\s]+$/, '')
    // Close remaining brackets
    trimmed += stack.reverse().join('')
    repaired = trimmed
  }

  return repaired
}
