/**
 * Slicer registry + entry-point for progressive disclosure.
 */

import { baziSlicer } from './bazi'
import { ziweiSlicer } from './ziwei'
import { createIdentitySlicer } from './_identity'
import { asObject, type ReadingSlicer, type SlicedReading } from './_types'

export type { ReadingSlicer, SlicedReading }

const slicers: Record<string, ReadingSlicer> = {
  bazi: baziSlicer,
  ziwei: ziweiSlicer,
  iching: createIdentitySlicer('iching'),
  qimen: createIdentitySlicer('qimen'),
  meihua: createIdentitySlicer('meihua'),
  fengshui: createIdentitySlicer('fengshui'),
  liuyao: createIdentitySlicer('liuyao'),
  other: createIdentitySlicer('other'),
}

const fallbackSlicer = createIdentitySlicer('fallback')

/** Look up the slicer for a divination type. Unknown types fall back to identity. */
export function slicerFor(type: string): ReadingSlicer {
  return slicers[type] ?? fallbackSlicer
}

/**
 * Slice a parsed reading result into a SlicedReading envelope.
 * `rawResult` can be a string (JSON.stringify'd) or an object.
 * Returns a default empty structure if the result is missing or unparseable —
 * tools should never crash on malformed result rows.
 */
export function sliceReading(
  type: string,
  id: string,
  createdAt: string,
  rawResult: unknown,
): SlicedReading {
  const parsed = parseResult(rawResult)
  const slicer = slicerFor(type)
  const isPaipanOnly = parsed.paipanOnly === true

  if (!parsed || Object.keys(parsed).length === 0) {
    return {
      id,
      type,
      createdAt,
      header: {},
      overview: null,
      sections: [],
      isPaipanOnly,
    }
  }

  return {
    id,
    type,
    createdAt,
    header: slicer.sliceHeader(parsed),
    overview: slicer.getOverview(parsed),
    sections: slicer.listSections(parsed),
    isPaipanOnly,
  }
}

/**
 * Extract a single named section from a parsed reading result.
 * Returns `null` if the section key is unknown, the result is malformed,
 * or the section is not present in this particular reading.
 */
export function getReadingSection(
  type: string,
  rawResult: unknown,
  section: string,
): unknown | null {
  const parsed = parseResult(rawResult)
  if (!parsed || Object.keys(parsed).length === 0) return null
  const slicer = slicerFor(type)
  return slicer.getSection(parsed, section)
}

function parseResult(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === 'object') return asObject(raw) ?? {}
  if (typeof raw !== 'string') return {}
  const trimmed = raw.trim()
  if (!trimmed) return {}
  // Strip markdown code fences if present (legacy LLM output sometimes included them).
  const stripped = trimmed.replace(/^```json\n?/, '').replace(/\n?```$/, '')
  try {
    const obj = JSON.parse(stripped)
    return asObject(obj) ?? {}
  } catch {
    return {}
  }
}
