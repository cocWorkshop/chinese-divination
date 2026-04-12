/**
 * prefill_divination_form — pure URL builder. Emits a navigation CTA so the
 * master chat UI can render a clickable card that takes the user to the
 * divination page with the form pre-hydrated. The master NEVER writes DB state
 * here — all creates (profile update, new family member, reading) happen on
 * the UI path when the user clicks submit, through the existing validated
 * divination pipeline.
 */

import { z } from 'zod'
import { defineTool } from './_types'
import { ok } from './_errors'

const DivinationType = z.enum([
  'bazi', 'ziwei', 'iching', 'qimen', 'meihua', 'fengshui', 'liuyao',
])

const SelfTarget = z.object({ kind: z.literal('self') })
const FamilyTarget = z.object({
  kind: z.literal('family'),
  familyMemberId: z.string().describe('Existing FamilyMember.id from list_family_members.'),
})
const NewFamilyTarget = z.object({
  kind: z.literal('newFamily'),
  relation: z.enum(['spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'friend', 'other']),
  relationDetail: z.string().optional().describe("Required when relation === 'other'. Specific relationship, e.g. '岳父'."),
  name: z.string().optional(),
})
const Target = z.union([SelfTarget, FamilyTarget, NewFamilyTarget])

const PrefillSchema = z.object({
  birthDate: z.string().optional().describe('YYYY-MM-DD'),
  birthTime: z.string().optional().describe("Shichen key (zi/chou/yin/mao/chen/si/wu/wei/shen/you/xu/hai) when timeMode='fuzzy'"),
  exactTime: z.string().optional().describe("HH:MM when timeMode='precise'"),
  timeMode: z.enum(['fuzzy', 'precise']).optional(),
  birthPlace: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  calendarType: z.enum(['solar', 'lunar']).optional(),
  question: z.string().optional().describe('For iching/qimen/meihua/fengshui — the user question.'),
}).optional()

const InputSchema = z.object({
  type: DivinationType,
  target: Target,
  prefill: PrefillSchema,
})

const OutputSchema = z.object({
  url: z.string(),
  ctaLabel: z.string(),
  ctaTitle: z.string(),
  ctaDescription: z.string(),
  divinationType: z.string(),
})

function buildUrl(input: z.infer<typeof InputSchema>): string {
  const params = new URLSearchParams()
  const { target, prefill } = input

  if (target.kind === 'self') {
    params.set('target', 'self')
  } else if (target.kind === 'family') {
    params.set('target', 'family')
    params.set('familyMemberId', target.familyMemberId)
  } else {
    params.set('target', 'family')
    params.set('familyMemberId', '__new__')
    params.set('relation', target.relation)
    if (target.relationDetail) params.set('relationDetail', target.relationDetail)
    if (target.name) params.set('memberName', target.name)
  }

  if (prefill) {
    if (prefill.birthDate) params.set('birthDate', prefill.birthDate)
    if (prefill.birthTime) params.set('birthTime', prefill.birthTime)
    if (prefill.exactTime) params.set('exactTime', prefill.exactTime)
    if (prefill.timeMode) params.set('timeMode', prefill.timeMode)
    if (prefill.birthPlace) params.set('birthPlace', prefill.birthPlace)
    if (prefill.gender) params.set('gender', prefill.gender)
    if (prefill.calendarType) params.set('calendarType', prefill.calendarType)
    if (prefill.question) params.set('question', prefill.question)
  }

  return `/divination/${input.type}?${params.toString()}`
}

const TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  bazi: { zh: '八字命理', en: 'BaZi' },
  ziwei: { zh: '紫微斗數', en: 'Zi Wei' },
  iching: { zh: '易經占卜', en: 'I Ching' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men' },
  meihua: { zh: '梅花易數', en: 'Mei Hua' },
  fengshui: { zh: '風水分析', en: 'Feng Shui' },
  liuyao: { zh: '六爻占卜', en: 'Liu Yao' },
}

export const prefillDivinationFormTool = defineTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>>({
  name: 'prefill_divination_form',
  description:
    'Call this when `list_readings` returns empty for the type the user needs, or the user explicitly asks for a new reading. ' +
    'Returns a URL for a pre-filled divination form. After calling, respond with a short friendly message + render a CTA card using the returned fields so the chat UI shows a clickable button. ' +
    'Do NOT navigate silently — the user must click to proceed through the divination page (where they can review the pre-filled fields and submit). ' +
    'Input: `{ type, target, prefill? }`. ' +
    "`target` is one of: `{kind:'self'}` | `{kind:'family', familyMemberId}` | `{kind:'newFamily', relation, relationDetail?, name?}`. " +
    'For an unknown family member (e.g. the user mentions their father for the first time), use `newFamily` with whatever birth info you extracted from the conversation in `prefill`. ' +
    "When `relation === 'other'`, `relationDetail` is MANDATORY (e.g. '岳父', 'business partner'). " +
    'Returns: `{ url, ctaLabel, ctaTitle, ctaDescription, divinationType }` — pass these verbatim to the UI. ' +
    'After the reading completes on the divination page, you will be notified automatically and can resume the conversation with the new reading in context.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  async handler(input, ctx) {
    // Validate newFamily + relationDetail consistency (Zod can't express
    // cross-field conditional requirements without a refine; we do it here
    // so the error is clear to the LLM).
    if (input.target.kind === 'newFamily' && input.target.relation === 'other' && !input.target.relationDetail) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        message: "relationDetail is required when relation === 'other' (e.g. '岳父', 'business partner').",
      }
    }

    const url = buildUrl(input)
    const label = TYPE_LABELS[input.type] ?? { zh: input.type, en: input.type }
    const lang = ctx.lang
    const typeName = lang === 'en' ? label.en : label.zh

    const ctaLabel = lang === 'en' ? `Start ${typeName} Reading →` : `開始${typeName} →`
    const ctaTitle = lang === 'en' ? `${typeName} Reading` : `${typeName}`
    const ctaDescription =
      lang === 'en'
        ? `I need your ${typeName} chart to continue. Click to open the divination form — fields are pre-filled where I had the info.`
        : `需要你的${typeName}結果來繼續分析。點擊打開占卜表單 — 已知的資訊已自動填入。`

    return ok({
      url,
      ctaLabel,
      ctaTitle,
      ctaDescription,
      divinationType: input.type,
    })
  },
})
