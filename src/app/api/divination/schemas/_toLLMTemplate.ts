/**
 * Convert a Zod schema into a plain JSON object suitable for embedding
 * in an LLM system prompt.
 *
 * Mapping rules:
 *   z.string().describe('instruction')  → "instruction"
 *   z.string()  (no describe)           → ""
 *   z.enum(['a','b','c'])               → "a/b/c"
 *   z.literal(v)                        → v
 *   z.number()                          → default or 0
 *   z.boolean()                         → default or false
 *   z.array(...).default([...])         → the default array
 *   z.array(inner)                      → [walk(inner)]
 *   z.object({...})                     → { key: walk(val), ... }
 *
 * Wrappers (ZodDefault, ZodOptional, ZodNullable) are unwrapped before
 * dispatch.  Defaults are extracted first so that
 * e.g. `z.array(z.string()).default(['a','b'])` → ['a','b'].
 *
 * Compatible with Zod v4.
 */

import { z } from 'zod'

export function schemaToLLMTemplate(schema: z.ZodTypeAny): unknown {
  // If the schema has a default, use it directly (before unwrapping).
  const defaultVal = extractDefault(schema)
  if (defaultVal !== undefined) return defaultVal

  const inner = unwrap(schema)

  if (inner instanceof z.ZodLiteral) {
    return inner.value
  }

  if (inner instanceof z.ZodEnum) {
    return (inner.options as string[]).join('/')
  }

  if (inner instanceof z.ZodString) {
    return inner.description ?? ''
  }

  if (inner instanceof z.ZodNumber) {
    return 0
  }

  if (inner instanceof z.ZodBoolean) {
    return false
  }

  if (inner instanceof z.ZodArray) {
    return [schemaToLLMTemplate(inner.element as z.ZodTypeAny)]
  }

  if (inner instanceof z.ZodObject) {
    const shape = inner.shape as Record<string, z.ZodTypeAny>
    const result: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(shape)) {
      result[key] = schemaToLLMTemplate(field)
    }
    return result
  }

  // Fallback for union, tuple, etc.
  return null
}

/** Unwrap ZodDefault / ZodOptional / ZodNullable layers. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodDefault) return unwrap(schema._def.innerType as z.ZodTypeAny)
  if (schema instanceof z.ZodOptional) return unwrap(schema._def.innerType as z.ZodTypeAny)
  if (schema instanceof z.ZodNullable) return unwrap(schema._def.innerType as z.ZodTypeAny)
  return schema
}

/** Extract a default value if the outermost layer is ZodDefault. */
function extractDefault(schema: z.ZodTypeAny): unknown {
  // Zod v4: _def.defaultValue is a plain value, not a function.
  if (schema instanceof z.ZodDefault) return schema._def.defaultValue
  return undefined
}
