/**
 * get_reading_detail — fetch a single named section of a reading.
 *
 * For use ONLY when `get_reading` did not return the data the master needs.
 * Keeps the per-turn token cost proportional to what the user actually asked.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { notFound, ok } from './_errors'
import { getReadingSection } from '../slicers'

const InputSchema = z.object({
  readingId: z.string().describe('The reading id, as returned by list_readings or get_reading.'),
  section: z.string().describe("Section key, e.g. 'career', 'marriage', 'daYun', 'liuNian', 'branchRelationships', 'palaces'."),
})

const OutputSchema = z.object({
  readingId: z.string(),
  section: z.string(),
  content: z.unknown(),
})

export const getReadingDetailTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'get_reading_detail',
  description:
    'Fetches a single named section of a reading. Use ONLY when the user asks about something the slim `get_reading` did not cover. ' +
    'Available sections are listed in `get_reading` output under `sections`. Do not preemptively fetch all sections — context budget is limited. ' +
    'Input: `{ readingId, section }`. ' +
    'Returns: `{ readingId, section, content }` — `content` may be a string, array, or object depending on the section. ' +
    'Common sections: `career`, `marriage`, `wealth`, `health` (narrative text); `daYun` (10-year luck periods array), `liuNian` (annual pillars array), ' +
    '`branchRelationships` (六冲/六合/六害/三刑 object), `palaces` (紫微 12-palace full detail), `keyPredictions` (ziwei life events), ' +
    '`daYunAnalysis` (V2 per-decade structured analysis), `shenSha` (神煞 collected from pillars).',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(input, ctx) {
    const reading = await ctx.prisma.reading.findFirst({
      where: { id: input.readingId, userId: ctx.userId, deletedAt: null },
      select: { id: true, type: true, result: true },
    })
    if (!reading) return notFound(`Reading ${input.readingId} not found`)

    const content = getReadingSection(reading.type, reading.result, input.section)
    return ok({
      readingId: reading.id,
      section: input.section,
      content,
    })
  },
})
