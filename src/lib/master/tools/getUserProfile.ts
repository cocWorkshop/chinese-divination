/**
 * get_user_profile — returns the authenticated user's birth profile.
 *
 * Read-only. No side effects. The master LLM uses this at the start of a
 * session (or whenever it needs birth data) before making divination
 * decisions. Returns `isComplete` so the LLM can short-circuit to
 * `prefill_divination_form` if the profile is too sparse to proceed.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { notFound, ok } from './_errors'
import { computeAge } from './_age'

const InputSchema = z.object({}).describe('No arguments. Operates on the authenticated user.')

const OutputSchema = z.object({
  birthDate: z.string().nullable(),
  birthTime: z.string().nullable(),
  exactTime: z.string().nullable(),
  timeMode: z.string().nullable(),
  birthPlace: z.string().nullable(),
  gender: z.string().nullable(),
  calendarType: z.string().nullable(),
  birthEnvironment: z.string().nullable(),
  birthLat: z.number().nullable(),
  birthLng: z.number().nullable(),
  name: z.string().nullable(),
  language: z.string().nullable(),
  /** Auto-computed Western age (周歲) from birthDate. Null when birthDate is missing or unparseable. */
  age: z.number().int().nullable(),
  isComplete: z.boolean(),
})

export const getUserProfileTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'get_user_profile',
  description:
    "Returns the authenticated user's stored birth profile. Use this at the start of a conversation or whenever you need birth data to reason about the user. All fields may be null for users who haven't filled their profile. " +
    'Returns: `{ birthDate, birthTime, exactTime, timeMode, birthPlace, gender, calendarType, birthLat, birthLng, name, language, age, isComplete }`. ' +
    '`age` is the auto-computed Western age (周歲) in years, or null if birthDate is missing — never compute it yourself. ' +
    "When `timeMode === 'precise'`, prefer `exactTime` (HH:MM) over `birthTime` (shichen). " +
    'If `isComplete` is false, you must ask the user via `prefill_divination_form` to start a bazi reading (which fills the profile) — do NOT fabricate birth data.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(_input, ctx) {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        birthDate: true,
        birthTime: true,
        exactTime: true,
        timeMode: true,
        birthPlace: true,
        gender: true,
        calendarType: true,
        birthEnvironment: true,
        birthLat: true,
        birthLng: true,
        name: true,
        language: true,
      },
    })
    if (!user) return notFound('User not found')

    const isComplete = !!(user.birthDate && user.birthTime && user.gender && user.birthPlace)

    return ok({
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      exactTime: user.exactTime,
      timeMode: user.timeMode,
      birthPlace: user.birthPlace,
      gender: user.gender,
      calendarType: user.calendarType,
      birthEnvironment: user.birthEnvironment,
      birthLat: user.birthLat,
      birthLng: user.birthLng,
      name: user.name,
      language: user.language,
      age: computeAge(user.birthDate),
      isComplete,
    })
  },
})
