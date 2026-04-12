import { z } from 'zod'

const s = z.literal('self')
const def = (s as unknown as { _def?: Record<string, unknown>; def?: Record<string, unknown> })._def
  ?? (s as unknown as { def?: Record<string, unknown> }).def
console.log('def keys:', Object.keys(def ?? {}))
console.log('def.value:', (def as { value?: unknown } | undefined)?.value)
console.log('def.values:', (def as { values?: unknown } | undefined)?.values)
console.log('full def:', JSON.stringify(def, (k, v) => typeof v === 'function' ? '[fn]' : v, 2))
