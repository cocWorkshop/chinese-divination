/**
 * Minimal Zod → JSON Schema converter for tool input schemas.
 *
 * Covers the subset we need for master tools:
 *   - z.object with z.string / z.number / z.boolean / z.enum / z.array / nested objects / z.literal / z.union
 *   - .optional() / .nullable() / .describe() / .default()
 *
 * This is intentionally small — we're not trying to handle every Zod feature.
 * If you need discriminated unions or refinements in a tool input schema,
 * extend this walker or install `zod-to-json-schema` as a dep.
 */

import { z, ZodType } from 'zod'

export type JsonSchema = Record<string, unknown>

export function zodToToolSchema(schema: ZodType): JsonSchema {
  return walk(schema)
}

function walk(schema: ZodType): JsonSchema {
  // Unwrap optional / nullable / default wrappers first so we see the inner type.
  // Zod v3 uses `_def` with `typeName`. Zod v4 uses `def`. Handle both.
  const def = (schema as unknown as { _def?: Record<string, unknown>; def?: Record<string, unknown> })._def
    ?? (schema as unknown as { def?: Record<string, unknown> }).def

  if (!def) return {}

  const typeName = (def.typeName ?? def.type) as string | undefined
  const description =
    (schema as unknown as { description?: string }).description ??
    ((def as unknown as { description?: string }).description)

  const annotate = (obj: JsonSchema): JsonSchema => {
    if (description) obj.description = description
    return obj
  }

  if (isOptional(typeName)) {
    const inner = (def.innerType ?? def.inner) as ZodType
    return walk(inner)
  }
  if (isNullable(typeName)) {
    const inner = (def.innerType ?? def.inner) as ZodType
    const result = walk(inner)
    // Loosely encode nullable as type union with "null"
    if (Array.isArray(result.type)) {
      return { ...result, type: [...result.type, 'null'] }
    }
    if (typeof result.type === 'string') {
      return { ...result, type: [result.type, 'null'] }
    }
    return result
  }
  if (isDefault(typeName)) {
    const inner = (def.innerType ?? def.inner) as ZodType
    const defaultValue = typeof def.defaultValue === 'function' ? (def.defaultValue as () => unknown)() : def.defaultValue
    const result = walk(inner)
    if (defaultValue !== undefined) result.default = defaultValue
    return result
  }

  if (typeName === 'ZodString' || typeName === 'string') {
    return annotate({ type: 'string' })
  }
  if (typeName === 'ZodNumber' || typeName === 'number') {
    return annotate({ type: 'number' })
  }
  if (typeName === 'ZodBoolean' || typeName === 'boolean') {
    return annotate({ type: 'boolean' })
  }
  if (typeName === 'ZodLiteral' || typeName === 'literal') {
    // Zod v3: def.value (single primitive).
    // Zod v4: def.values (array; supports literal unions like z.literal(['a','b'])).
    const values: unknown[] = Array.isArray((def as { values?: unknown[] }).values)
      ? ((def as { values: unknown[] }).values)
      : [(def as { value?: unknown }).value]
    if (values.length === 1) {
      const v = values[0]
      return annotate({ type: typeof v, const: v })
    }
    // Multi-value literal → emit enum. Assume homogeneous primitive type
    // (Zod itself would reject heterogeneous literal unions here).
    return annotate({ type: typeof values[0], enum: values })
  }
  if (typeName === 'ZodEnum' || typeName === 'enum') {
    const values = (def.values ?? def.entries) as unknown
    const enumArr = Array.isArray(values) ? values : Object.values(values as Record<string, unknown>)
    return annotate({ type: 'string', enum: enumArr })
  }
  if (typeName === 'ZodArray' || typeName === 'array') {
    const element = (def.type ?? def.element) as ZodType
    return annotate({ type: 'array', items: element ? walk(element) : {} })
  }
  if (typeName === 'ZodObject' || typeName === 'object') {
    const shape = typeof def.shape === 'function' ? (def.shape as () => Record<string, ZodType>)() : (def.shape as Record<string, ZodType>)
    const properties: Record<string, JsonSchema> = {}
    const required: string[] = []
    for (const [key, value] of Object.entries(shape ?? {})) {
      properties[key] = walk(value)
      if (!isFieldOptional(value)) required.push(key)
    }
    const result: JsonSchema = { type: 'object', properties, additionalProperties: false }
    if (required.length > 0) result.required = required
    return annotate(result)
  }
  if (typeName === 'ZodUnion' || typeName === 'union') {
    const options = (def.options ?? def.types) as ZodType[]
    return annotate({ anyOf: options.map((o) => walk(o)) })
  }
  if (typeName === 'ZodDiscriminatedUnion' || typeName === 'discriminatedUnion') {
    const options = (def.options ?? def.types) as ZodType[]
    return annotate({ anyOf: options.map((o) => walk(o)) })
  }
  if (typeName === 'ZodRecord' || typeName === 'record') {
    const valueType = (def.valueType ?? def.value) as ZodType | undefined
    return annotate({ type: 'object', additionalProperties: valueType ? walk(valueType) : true })
  }
  if (typeName === 'ZodAny' || typeName === 'any' || typeName === 'ZodUnknown' || typeName === 'unknown') {
    return annotate({})
  }

  // Unknown node — log once in dev for discovery.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[zodToToolSchema] Unsupported Zod node: ${typeName}`)
  }
  return annotate({})
}

function isOptional(typeName: string | undefined): boolean {
  return typeName === 'ZodOptional' || typeName === 'optional'
}
function isNullable(typeName: string | undefined): boolean {
  return typeName === 'ZodNullable' || typeName === 'nullable'
}
function isDefault(typeName: string | undefined): boolean {
  return typeName === 'ZodDefault' || typeName === 'default'
}

function isFieldOptional(schema: ZodType): boolean {
  const def = (schema as unknown as { _def?: Record<string, unknown>; def?: Record<string, unknown> })._def
    ?? (schema as unknown as { def?: Record<string, unknown> }).def
  const typeName = (def?.typeName ?? def?.type) as string | undefined
  return isOptional(typeName) || isDefault(typeName)
}

// Re-export z for convenience so tool files can `import { z } from '../tools/_zodToToolSchema'`
// to stay decoupled from direct zod imports if we ever switch conversion strategies.
export { z }
