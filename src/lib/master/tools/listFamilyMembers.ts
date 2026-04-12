/**
 * list_family_members — returns all FamilyMember rows for the authenticated user.
 *
 * Master calls this BEFORE any family-targeted reading lookup so it can pick
 * the right `familyMemberId` for `list_readings` or `prefill_divination_form`.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { ok } from './_errors'

const InputSchema = z.object({}).describe('No arguments.')

const MemberSchema = z.object({
  id: z.string(),
  relation: z.string(),
  relationDetail: z.string().nullable(),
  name: z.string().nullable(),
  birthDate: z.string().nullable(),
  birthTime: z.string().nullable(),
  exactTime: z.string().nullable(),
  timeMode: z.string().nullable(),
  birthPlace: z.string().nullable(),
  gender: z.string().nullable(),
  calendarType: z.string().nullable(),
  isComplete: z.boolean(),
})

const OutputSchema = z.object({
  members: z.array(MemberSchema),
})

export const listFamilyMembersTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'list_family_members',
  description:
    'Lists all family members the user has saved. Call BEFORE any family-targeted reading lookup. Each entry has: ' +
    '`id` (use this as familyMemberId in other tools), `relation` (spouse/father/mother/son/daughter/brother/sister/friend/other), ' +
    "`relationDetail` (populated when relation === 'other', e.g. '岳父' / 'business partner' / '老板'), " +
    '`name`, birth data fields, and `isComplete` (true when the member has enough birth data for a bazi/ziwei reading). ' +
    'Returns: `{ members: Array<{id, relation, relationDetail, name, birthDate, birthTime, exactTime, timeMode, birthPlace, gender, calendarType, isComplete}> }`. ' +
    'If the user mentions a family member not in this list, you must use `prefill_divination_form` with a `newFamily` target to lead them to create one.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(_input, ctx) {
    const rows = await ctx.prisma.familyMember.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        relation: true,
        relationDetail: true,
        name: true,
        birthDate: true,
        birthTime: true,
        exactTime: true,
        timeMode: true,
        birthPlace: true,
        gender: true,
        calendarType: true,
      },
    })

    const members = rows.map((r) => ({
      ...r,
      isComplete: !!(r.birthDate && r.birthTime && r.gender && r.birthPlace),
    }))

    return ok({ members })
  },
})
