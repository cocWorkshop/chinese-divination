/**
 * Reading slicers — progressive disclosure over stored divination results.
 *
 * A slicer takes the parsed `Reading.result` JSON and produces:
 *   - `header`: a compact, always-returned summary safe to ship to the master
 *     LLM on every getReading call. Must be small (<1.5KB JSON for bazi/ziwei,
 *     or the whole result for small divination types).
 *   - `overview`: the top-level narrative LLM section (usually `sections.overview`),
 *     returned alongside the header because master almost always needs it.
 *   - `sections`: an enumerable list of keys the master can fetch individually
 *     via getReadingDetail. Keys should be stable and self-describing.
 *   - `isPaipanOnly`: true when the row was created as a chart-only reading
 *     (no LLM interpretation — paipan/排盘 mode).
 *
 * Slicers are pure functions of the result object. No DB, no side effects.
 */

export interface SlicedReading {
  id: string
  type: string
  createdAt: string
  header: Record<string, unknown>
  overview: string | null
  sections: string[]
  isPaipanOnly: boolean
}

export interface ReadingSlicer {
  /** Divination type key this slicer handles (e.g. 'bazi', 'ziwei'). */
  readonly type: string
  /**
   * Build the compact header object shipped on every getReading call.
   * MUST be safe on partial / legacy / paipan-only results — defensive reads only.
   */
  sliceHeader(result: Record<string, unknown>): Record<string, unknown>
  /** Extract the top-level overview string, if present. */
  getOverview(result: Record<string, unknown>): string | null
  /** Enumerate available section keys for this result. Sorted + deterministic. */
  listSections(result: Record<string, unknown>): string[]
  /** Fetch a single named section; returns null if key is unknown or missing. */
  getSection(result: Record<string, unknown>, section: string): unknown | null
}

/** Narrow a JSON-value slot to an object without throwing. */
export function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Narrow a JSON-value slot to a string without throwing. */
export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}
