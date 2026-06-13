/**
 * Master module — public API surface.
 *
 * This is the single import point for the master chat agent. Callers (e.g.
 * src/app/api/master/route.ts) should only pull from this module, never
 * reach into subfolders.
 */

export { masterToolRegistry } from './tools'
export type { ToolContext, ToolDef, ToolResult, ToolErrorCode, Lang } from './tools'

export { buildMasterSystemPrompt } from './systemPrompt/buildSystemPrompt'
export type { BuildMasterSystemPromptInput } from './systemPrompt/buildSystemPrompt'
export { loadMasterPersona, clearMasterPersonaCache } from './systemPrompt/persona'
export { buildCapabilityCatalog } from './systemPrompt/capabilityCatalog'

export { skills, getSkill, buildSkillsCatalog } from './skills'
export type { SkillDef, DivinationType } from './skills'

export { sliceReading, getReadingSection, slicerFor } from './slicers'
export type { SlicedReading, ReadingSlicer } from './slicers'
