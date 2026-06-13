/**
 * Build the LLM system prompt for a divination reading.
 *
 * Combines the handler's schema template with today's date, language
 * preferences, and the reference markdown loaded from divination-refs/.
 */

import { loadDivinationPrompt } from '@/lib/llm'
import type { DivinationContext } from './_types'

export function buildSystemPrompt(
  ctx: DivinationContext,
  schema: Record<string, unknown>
): string {
  const refContent = loadDivinationPrompt(ctx.type)
  const isEn = ctx.language === 'en'
  const langText = isEn ? 'English' : '繁體中文（Traditional Chinese）'
  const textLang = isEn ? 'English' : '繁體中文'
  const todayStr = ctx.clientDate.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  })

  return `You are a master of Chinese traditional divination with deep expertise in ${ctx.type}.
Today's date: ${todayStr}.

Reference knowledge:
${refContent}

IMPORTANT: You must respond with ONLY valid JSON. No markdown code blocks, no explanation outside the JSON.
Follow this exact JSON schema for ${ctx.type}:
${JSON.stringify(schema, null, 2)}

The user's language preference is ${langText}. Write all text values (sections, advice, analysis paragraphs) in ${textLang}.
For luckyInfo: colors must be in ${textLang} (e.g. ${isEn ? 'Red, Green, Gold' : '紅色, 綠色, 金色'}), directions in ${textLang} (e.g. ${isEn ? 'South, East' : '南方, 東方'}).
Keep core Chinese terminology (天干地支, star names, palace names, trigram names) in Chinese regardless of language setting.
In the prose text values, never echo raw input-data field names, JSON keys, or boolean literals (true/false) — express everything in natural ${textLang} divination terms.
Be thorough and insightful in the text sections. Minimum 100 words per section.
For the pillars/stars/palace data fields, use proper Chinese characters (e.g. 甲乙丙丁 for stems, 子丑寅卯 for branches).`
}
