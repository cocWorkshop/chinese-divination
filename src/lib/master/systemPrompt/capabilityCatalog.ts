/**
 * Capability catalog — generated from the master tool registry so the
 * description you embed in the master system prompt can't drift from the
 * tool descriptions themselves. One line per tool: name + first sentence of
 * its description.
 */

import { masterToolRegistry } from '../tools'

/** Renders a short Markdown list of available tools. */
export function buildCapabilityCatalog(): string {
  const lines: string[] = ['## Available tools', '']
  for (const t of masterToolRegistry.tools) {
    // Use only the first sentence so the catalog stays compact; the full
    // description is still passed to the LLM via the tool definition itself.
    const firstSentence = t.description.split(/(?<=[.!?])\s+/)[0] ?? t.description
    lines.push(`- **${t.name}** — ${firstSentence}`)
  }
  return lines.join('\n')
}
