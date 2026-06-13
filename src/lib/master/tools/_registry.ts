/**
 * Tool registry — assembles a set of ToolDef into:
 *   1. A set of OpenAI-format tool declarations for streamLLM's `tools` param.
 *   2. A single `execute(name, rawArgs, ctx)` dispatcher that validates input
 *      with the tool's Zod schema and calls the handler.
 *
 * The registry is pure; state lives in the tools themselves (none of them
 * hold state today — they're request-scoped via ToolContext).
 */

import type { Tool } from '@/lib/llm'
import type { ToolContext, ToolDef, ToolResult } from './_types'
import { invalidInput, internal } from './_errors'
import { zodToToolSchema } from './_zodToToolSchema'

export interface ToolRegistry {
  /** All tools in registration order. */
  readonly tools: readonly ToolDef<unknown, unknown>[]
  /** Tool declarations in the exact shape streamLLM / OpenAI SDK expects. */
  toolDefs(): Tool[]
  /** Execute a tool by name with raw JSON args. Never throws; returns a ToolResult. */
  execute(name: string, rawArgs: unknown, ctx: ToolContext): Promise<ToolResult<unknown>>
  /** Look up a single tool by name (for tests / introspection). */
  get(name: string): ToolDef<unknown, unknown> | undefined
}

export function createToolRegistry(
  tools: readonly ToolDef<unknown, unknown>[],
): ToolRegistry {
  const byName = new Map<string, ToolDef<unknown, unknown>>()
  for (const t of tools) {
    if (byName.has(t.name)) {
      throw new Error(`Duplicate tool name in registry: ${t.name}`)
    }
    byName.set(t.name, t)
  }

  return {
    tools,
    toolDefs() {
      return tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: zodToToolSchema(t.inputSchema),
        },
      }))
    },
    async execute(name, rawArgs, ctx) {
      const tool = byName.get(name)
      if (!tool) {
        return invalidInput(`Unknown tool: ${name}`)
      }
      const parsed = tool.inputSchema.safeParse(rawArgs ?? {})
      if (!parsed.success) {
        return invalidInput(
          `Invalid input for ${name}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        )
      }
      try {
        return await tool.handler(parsed.data, ctx)
      } catch (e) {
        return internal((e as Error).message || 'Unknown tool handler error')
      }
    },
    get(name) {
      return byName.get(name)
    },
  }
}
