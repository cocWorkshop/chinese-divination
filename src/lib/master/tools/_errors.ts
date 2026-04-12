/**
 * Typed tool error constructors. Tool handlers return these as values rather
 * than throwing — that way the error kind survives the JSON boundary to the
 * LLM, which can reason about it (e.g. NOT_FOUND → "I should call list first").
 */

import type { ToolErrorCode, ToolResult } from './_types'

function err<T>(code: ToolErrorCode, message: string): ToolResult<T> {
  return { ok: false, code, message }
}

export const notFound = <T>(message: string): ToolResult<T> => err<T>('NOT_FOUND', message)
export const invalidInput = <T>(message: string): ToolResult<T> => err<T>('INVALID_INPUT', message)
export const forbidden = <T>(message: string): ToolResult<T> => err<T>('FORBIDDEN', message)
export const internal = <T>(message: string): ToolResult<T> => err<T>('INTERNAL', message)
export const incompleteProfile = <T>(message: string): ToolResult<T> =>
  err<T>('INCOMPLETE_PROFILE', message)

export const ok = <T>(data: T): ToolResult<T> => ({ ok: true, data })
