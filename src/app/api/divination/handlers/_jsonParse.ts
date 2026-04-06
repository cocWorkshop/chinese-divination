/**
 * Extract JSON from LLM output.
 *
 * LLMs sometimes wrap JSON in ```json fences, prepend an explanation paragraph,
 * or leave trailing prose. This helper is forgiving: it strips code fences,
 * then trims to the outermost { … } brace pair, then JSON.parses.
 *
 * On any parse failure, returns a fallback shape that ResultRenderer can
 * still display (raw content + a single overview section).
 */

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
    return { type, raw: rawText, sections: { overview: rawText }, keyAdvice: [] }
  }
}
