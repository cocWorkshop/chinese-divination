/**
 * list_readings — metadata-only listing of the user's saved readings.
 *
 * NEVER loads `result` / `llmRawOutput` / `calculationData` / `llmPrompt`.
 * Keeps response small so context stays lean. Filter by type and target.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { ok } from './_errors'

const DivinationType = z.enum([
  'bazi', 'ziwei', 'iching', 'qimen', 'meihua', 'fengshui', 'liuyao', 'other',
])

const InputSchema = z.object({
  type: DivinationType.optional().describe('Filter by divination type. Omit to list all types.'),
  targetType: z.enum(['self', 'family']).optional().describe('Filter self vs family member.'),
  familyMemberId: z.string().optional().describe('When targetType is family, restrict to one member.'),
  limit: z.number().int().min(1).max(30).default(10).describe('Max rows. Default 10, cap 30.'),
})

const ReadingSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string(),
  targetType: z.string(),
  familyMemberId: z.string().nullable(),
  question: z.string().nullable(),
  hasInterpretation: z.boolean(),
  isPaipanOnly: z.boolean(),
  status: z.string(),
})

const OutputSchema = z.object({
  readings: z.array(ReadingSummarySchema),
})

export const listReadingsTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'list_readings',
  description:
    "Lists the user's saved readings filtered by type and/or target. METADATA ONLY — no chart, no interpretation. " +
    'Call this FIRST whenever you need to reason about a divination: bazi compatibility, ziwei interpretation, cross-referencing etc. ' +
    'Parameters: `{ type?, targetType?, familyMemberId?, limit? }` where `type` is one of bazi/ziwei/iching/qimen/meihua/fengshui/liuyao/other, ' +
    "`targetType` is 'self' or 'family', and `limit` defaults to 10 (max 30). " +
    'Returns: `{ readings: Array<{id, type, createdAt, targetType, familyMemberId, question, hasInterpretation, isPaipanOnly, status}> }`. ' +
    'If the result is empty for the type the user needs, you MUST call `prefill_divination_form` and render a CTA card — never fabricate readings.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(input, ctx) {
    const where: Record<string, unknown> = {
      userId: ctx.userId,
      deletedAt: null,
    }
    if (input.type) where.type = input.type
    if (input.targetType) where.targetType = input.targetType
    if (input.familyMemberId) where.familyMemberId = input.familyMemberId

    const rows = await ctx.prisma.reading.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: input.limit ?? 10,
      select: {
        id: true,
        type: true,
        createdAt: true,
        targetType: true,
        familyMemberId: true,
        question: true,
        llmRawOutput: true, // only to compute hasInterpretation flag, not returned
        status: true,
        result: true,       // peek to detect paipanOnly flag
      },
    })

    const readings = rows.map((r) => {
      const hasInterpretation = !!r.llmRawOutput && r.llmRawOutput.length > 0
      let isPaipanOnly = false
      try {
        if (typeof r.result === 'string' && r.result) {
          const parsed = JSON.parse(r.result.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
          isPaipanOnly = parsed?.paipanOnly === true
        }
      } catch {
        /* ignore */
      }
      return {
        id: r.id,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
        targetType: r.targetType,
        familyMemberId: r.familyMemberId,
        question: r.question,
        hasInterpretation,
        isPaipanOnly,
        status: r.status,
      }
    })

    return ok({ readings })
  },
})
