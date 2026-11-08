/**
 * get_reading — fetch the slim header + overview of one reading, plus a
 * catalog of fetchable sections. For bazi/ziwei the header is compact; for
 * smaller types it contains the full structured result.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { notFound, ok } from './_errors'
import { sliceReading } from '../slicers'

const InputSchema = z.object({
  readingId: z.string().describe('The reading id, as returned by list_readings.'),
})

const OutputSchema = z.object({
  id: z.string(),
  type: z.string(),
  question: z.string().nullable().optional(),
  createdAt: z.string(),
  header: z.record(z.string(), z.unknown()),
  overview: z.string().nullable(),
  sections: z.array(z.string()),
  isPaipanOnly: z.boolean(),
})

export const getReadingTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'get_reading',
  description:
    'Fetches the slim header + overview of one reading, plus a list of sections you can fetch via `get_reading_detail`. ' +
    'For BaZi: returns pillars/dayMaster/fiveElements/formation in `header`, plus the `overview` section narrative. ' +
    'For ZiWei: returns chart metadata (fiveElementsClass, zodiac, soul, body, yearStem, yearBranch) + formation + 12-palace stars preview + full 命宫 in `header`. ' +
    'For iching/qimen/meihua/fengshui/liuyao: returns the full structured result in `header` (small enough to ship in one shot). ' +
    'Input: `{ readingId }`. ' +
    'Returns: `{ id, type, question, createdAt, header, overview, sections, isPaipanOnly }`. ' +
    'DISCIPLINE FOR EVENT DIVINATIONS (liuyao, iching, meihua, qimen, fengshui): The `question` field contains the specific matter this reading was cast for. Event divinations strictly adhere to 「一事一占」 (one divination per matter) and are valid ONLY for follow-ups on that specific matter. If the user asks about a new or different matter, you MUST NOT reuse this reading — instead explain 「一事一占」 and call `prefill_divination_form` to guide them to cast a fresh divination. ' +
    'For lifelong natal charts (bazi, ziwei): these represent the user\'s lifetime chart and can be cross-referenced across all life domains (career, wealth, marriage, health). ' +
    '`sections` lists keys fetchable via `get_reading_detail` — common values: `career`, `marriage`, `wealth`, `health`, `daYun` (10-year luck periods), `liuNian` (annual fortune), `branchRelationships` (六冲/六合/六害/三刑), `palaces` (紫微 12 palaces detail). ' +
    'Call `list_readings` first to discover the reading id. Do not preemptively fetch every section.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(input, ctx) {
    const reading = await ctx.prisma.reading.findFirst({
      where: { id: input.readingId, userId: ctx.userId, deletedAt: null },
      select: { id: true, type: true, createdAt: true, result: true, question: true },
    })
    if (!reading) return notFound(`Reading ${input.readingId} not found`)

    const sliced = sliceReading(
      reading.type,
      reading.id,
      reading.createdAt.toISOString(),
      reading.result,
    )
    return ok({
      ...sliced,
      question: reading.question ?? null,
    })
  },
})
