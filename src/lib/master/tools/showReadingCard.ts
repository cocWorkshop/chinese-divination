/**
 * show_reading_card — pure UI helper. Renders a clickable card in the chat
 * that links to an existing reading page. Use this instead of restating chart
 * contents in prose.
 *
 * No DB writes. Validates that the reading belongs to the authenticated user
 * (security: master must not be able to surface other users' readings) and
 * builds a human-readable title + subtitle from reading metadata.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { ok, notFound } from './_errors'
import type { Lang } from './_types'

const InputSchema = z.object({
  readingId: z.string().describe(
    'The reading id to render as a clickable card. Must be a reading the current user owns — pass an id returned by list_readings or get_reading. The handler validates ownership.',
  ),
  note: z.string().max(60).optional().describe(
    'Optional 1-line note shown under the card title, e.g. "你最近一次的八字". Keep under 30 chars.',
  ),
})

const OutputSchema = z.object({
  readingId: z.string(),
  divinationType: z.string(),
  title: z.string(),
  subtitle: z.string(),
  url: z.string(),
  note: z.string().optional(),
})

const TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  bazi: { zh: '八字命盤', en: 'BaZi Reading' },
  ziwei: { zh: '紫微斗數命盤', en: 'Zi Wei Reading' },
  iching: { zh: '易經占卜', en: 'I Ching Reading' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men Reading' },
  meihua: { zh: '梅花易數', en: 'Mei Hua Reading' },
  fengshui: { zh: '風水分析', en: 'Feng Shui Reading' },
  liuyao: { zh: '六爻占卜', en: 'Liu Yao Reading' },
  other: { zh: '占卜', en: 'Reading' },
}

function readingTitleByType(type: string, lang: Lang): string {
  const label = TYPE_LABELS[type] ?? TYPE_LABELS.other
  return lang === 'en' ? label.en : label.zh
}

function formatDate(d: Date, lang: Lang): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return `${y}年${m}月${day}日`
}

interface ReadingMeta {
  type: string
  createdAt: Date
  targetType: string | null
  question: string | null
  result: string | null
}

function buildReadingSubtitle(reading: ReadingMeta, lang: Lang): string {
  const parts: string[] = []
  parts.push(formatDate(reading.createdAt, lang))

  if (reading.targetType === 'family') {
    parts.push(lang === 'en' ? 'family member' : '家人')
  }

  // Try to extract a short snippet from the result for context
  if (reading.question) {
    const q = reading.question.trim().slice(0, 28)
    if (q) parts.push(`${lang === 'en' ? 'Q: ' : '問題：'}${q}${reading.question.length > 28 ? '…' : ''}`)
  }

  return parts.join(' · ')
}

export const showReadingCardTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'show_reading_card',
  description:
    'Render a clickable card in the chat that links to an existing reading page. ' +
    'Use this when referencing a reading the user already has — INSTEAD of restating ' +
    'chart contents (pillars, palaces, formation) in prose. Show the card and let the ' +
    'user click through to read the full chart on its dedicated page. ' +
    'Input: `{ readingId, note? }`. The reading must belong to the authenticated user. ' +
    'Returns: `{ readingId, divinationType, title, subtitle, url, note? }`. ' +
    'After calling, the chat UI renders the card automatically — your prose response ' +
    'should be brief; the card carries the chart detail.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(input, ctx) {
    const reading = await ctx.prisma.reading.findFirst({
      where: { id: input.readingId, userId: ctx.userId, deletedAt: null },
      select: {
        id: true,
        type: true,
        createdAt: true,
        targetType: true,
        question: true,
        result: true,
      },
    })
    if (!reading) {
      return notFound(`Reading ${input.readingId} not found or not owned by this user.`)
    }

    const title = readingTitleByType(reading.type, ctx.lang)
    const subtitle = buildReadingSubtitle(reading, ctx.lang)

    return ok({
      readingId: reading.id,
      divinationType: reading.type,
      title,
      subtitle,
      url: `/dashboard/reading/${reading.id}`,
      ...(input.note ? { note: input.note } : {}),
    })
  },
})
