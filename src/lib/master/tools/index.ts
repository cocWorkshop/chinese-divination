/**
 * Master tool registry — public entry point.
 *
 * Consumers (master API route, tests) import `masterToolRegistry` and use it
 * for both (a) producing tool defs to pass into streamLLM, and (b) executing
 * tool calls the model makes. Adding a new tool: create a file in this
 * directory, import it here, append to the tools array. That's it.
 */

import { createToolRegistry } from './_registry'
import { getUserProfileTool } from './getUserProfile'
import { listFamilyMembersTool } from './listFamilyMembers'
import { listReadingsTool } from './listReadings'
import { getReadingTool } from './getReading'
import { getReadingDetailTool } from './getReadingDetail'
import { prefillDivinationFormTool } from './prefillDivinationForm'
import { showReadingCardTool } from './showReadingCard'
import type { ToolDef } from './_types'

// Cast to common ToolDef<unknown, unknown> so the registry can hold them uniformly.
const tools: readonly ToolDef<unknown, unknown>[] = [
  getUserProfileTool,
  listFamilyMembersTool,
  listReadingsTool,
  getReadingTool,
  getReadingDetailTool,
  prefillDivinationFormTool,
  showReadingCardTool,
] as unknown as readonly ToolDef<unknown, unknown>[]

export const masterToolRegistry = createToolRegistry(tools)

export type { ToolContext, ToolDef, ToolResult, ToolErrorCode, Lang } from './_types'
export { defineTool } from './_types'
