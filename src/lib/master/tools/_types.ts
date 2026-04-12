/**
 * Tool infrastructure types.
 *
 * Each tool is a self-contained unit: name, description (shown to the LLM),
 * Zod input/output schemas, and an async handler. Tools are registered with
 * `createToolRegistry()` which handles dispatch, input validation, and typed
 * error surfacing. The LLM never sees the handler — only the description and
 * the input schema rendered as JSON Schema.
 */

import type { z } from 'zod'
import type { PrismaClient } from '@prisma/client'

export type Lang = 'zh-TW' | 'en'

export interface ToolContext {
  /** Authenticated user id. Tools must enforce row-level access via this. */
  userId: string
  /** Language for returned messages (e.g. error strings shown via the LLM). */
  lang: Lang
  /** Prisma client instance. Injected so tools are unit-testable. */
  prisma: PrismaClient
}

export type ToolErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'FORBIDDEN'
  | 'INTERNAL'
  | 'INCOMPLETE_PROFILE'

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ToolErrorCode; message: string }

export interface ToolDef<I, O> {
  /** Canonical name the LLM calls (snake_case, matches capability catalog). */
  readonly name: string
  /**
   * The description the LLM reads. Embed a "Returns:" sentence describing the
   * output shape so the LLM can reason about the tool result without a
   * separate output schema. Keep under ~600 chars to preserve prompt budget.
   */
  readonly description: string
  readonly inputSchema: z.ZodType<I>
  readonly outputSchema: z.ZodType<O>
  handler(input: I, ctx: ToolContext): Promise<ToolResult<O>>
}

/** Convenience constructor that preserves type inference across schemas + handler. */
export function defineTool<I, O>(def: ToolDef<I, O>): ToolDef<I, O> {
  return def
}
