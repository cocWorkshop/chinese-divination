/**
 * Identity slicer factory — for divination types whose results are small
 * enough to ship in one shot. Header = entire parsed result minus the
 * `sections.overview` (which is returned separately). sections list enumerates
 * all keys under `sections` so the master can request them individually if it
 * wants to reduce context further, but by default the whole thing is in header.
 */

import { asObject, asString, type ReadingSlicer } from './_types'

export function createIdentitySlicer(type: string): ReadingSlicer {
  return {
    type,

    sliceHeader(result) {
      // Return everything except the overview section (which is piped separately
      // via getOverview). Keeps the header compact for the common case where the
      // master only needs structured data + overview.
      const copy: Record<string, unknown> = { ...result }
      const sections = asObject(copy.sections)
      if (sections && sections.overview) {
        const { overview: _overview, ...rest } = sections
        copy.sections = rest
      }
      return copy
    },

    getOverview(result) {
      const sections = asObject(result.sections)
      if (!sections) return null
      return asString(sections.overview)
    },

    listSections(result) {
      const sections = asObject(result.sections)
      if (!sections) return []
      return Object.keys(sections)
        .filter((k) => k !== 'overview' && typeof sections[k] === 'string')
        .sort()
    },

    getSection(result, section) {
      const sections = asObject(result.sections)
      if (!sections) return null
      const v = sections[section]
      return typeof v === 'string' ? v : null
    },
  }
}
