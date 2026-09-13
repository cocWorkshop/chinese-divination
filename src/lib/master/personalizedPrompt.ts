/**
 * Personalized prompt rendering — pure function.
 *
 * Takes a Portrait and a language preference, returns the rendered context
 * block that gets injected into the master system prompt AFTER the persona
 * + capability catalog + skills, BEFORE the dynamic session context.
 *
 * The rendered block ALWAYS ends with a hard-coded identity guard that
 * prevents the LLM from drifting from the master persona. The guard is
 * NOT loaded from the portrait — it's a constant, so a buggy or
 * adversarial portrait cannot remove it.
 *
 * Returns null when there's nothing meaningful to render (cold-start
 * path = current behavior, no personalized block in the system prompt).
 */

import type { Portrait, PortraitLang } from './portraitStore'

const IDENTITY_GUARD_ZH =
  '以上为用户上下文。它影响你举例的侧重和深度，**不影响**你的身份、语气、专业立场。你始终是 玄機大師 — 一位专业、严谨、尊重传统的中国命理师。'

const IDENTITY_GUARD_EN =
  'The above is user context. It affects the focus and depth of your examples, but **does NOT** affect your identity, tone, or professional stance. You remain Master Xuanji — a professional, rigorous, traditional Chinese divination practitioner.'

const TOPIC_LABELS_ZH: Record<string, string> = {
  career: '事业',
  wealth: '财运',
  marriage: '婚姻',
  love: '感情',
  family: '家庭',
  health: '健康',
  study: '学业',
  travel: '出行',
  legal: '法律',
  spiritual: '修行',
  parenting: '子女',
  parents: '父母',
  business: '事业',
  finance: '财运',
  relationships: '感情',
}

const TOPIC_LABELS_EN: Record<string, string> = {
  career: 'career',
  wealth: 'wealth',
  marriage: 'marriage',
  love: 'relationships',
  family: 'family',
  health: 'health',
  study: 'studies',
  travel: 'travel',
  legal: 'legal matters',
  spiritual: 'spiritual practice',
  parenting: 'children',
  parents: 'parents',
  business: 'career',
  finance: 'finances',
  relationships: 'relationships',
}

function topicLabel(t: string, lang: PortraitLang): string {
  const map = lang === 'en' ? TOPIC_LABELS_EN : TOPIC_LABELS_ZH
  return map[t] ?? t
}

function joinTopics(topics: string[], lang: PortraitLang): string {
  if (topics.length === 0) return ''
  const labeled = topics.slice(0, 5).map((t) => topicLabel(t, lang))
  if (lang === 'en') {
    if (labeled.length === 1) return labeled[0]
    if (labeled.length === 2) return `${labeled[0]} and ${labeled[1]}`
    return `${labeled.slice(0, -1).join(', ')}, and ${labeled[labeled.length - 1]}`
  }
  return labeled.join('、')
}

function preferenceClauseZh(p: Portrait['preferences']): string | null {
  const parts: string[] = []
  if (p.tone === 'direct') parts.push('直接')
  if (p.tone === 'gentle') parts.push('温和')
  if (p.depth === 'concise') parts.push('简洁')
  if (p.depth === 'detailed') parts.push('详细')
  if (parts.length === 0) return null
  return parts.join('、')
}

function preferenceClauseEn(p: Portrait['preferences']): string | null {
  const parts: string[] = []
  if (p.tone === 'direct') parts.push('direct')
  if (p.tone === 'gentle') parts.push('gentle')
  if (p.depth === 'concise') parts.push('concise')
  if (p.depth === 'detailed') parts.push('detailed')
  if (parts.length === 0) return null
  return parts.join(', ')
}

/**
 * Detects whether a portrait has any content worth rendering. Empty
 * portraits (no topics, no preferences, no life context) return null
 * from renderPersonalizedPrompt — the cold-start path.
 */
export function isPortraitEmpty(portrait: Portrait): boolean {
  if (portrait.topics && portrait.topics.length > 0) return false
  if (portrait.preferences && Object.keys(portrait.preferences).length > 0) return false
  if (portrait.lifeContext && portrait.lifeContext.trim().length > 0) return false
  if (portrait.toneNotes && portrait.toneNotes.trim().length > 0) return false
  return true
}

/**
 * Render the personalized prompt block. Returns null if the portrait
 * has nothing to say — caller should omit the block entirely in that case.
 */
export function renderPersonalizedPrompt(
  portrait: Portrait | null,
  lang: PortraitLang,
  growthContext?: { tier: number; title: string } | null,
): string | null {
  const hasPortrait = Boolean(portrait && !isPortraitEmpty(portrait))
  const hasGrowth = Boolean(growthContext && growthContext.title)

  if (!hasPortrait && !hasGrowth) return null

  const lines: string[] = []

  if (lang === 'en') {
    lines.push('## User context for this conversation')
    lines.push('')
    if (hasGrowth) {
      lines.push(`- Metaphysical Cultivation Realm: ${growthContext!.title} (Tier ${growthContext!.tier})`)
    }
    if (portrait?.topics?.length) {
      lines.push(`- Topics this user cares about: ${joinTopics(portrait.topics, lang)}`)
    }
    const prefs = portrait ? preferenceClauseEn(portrait.preferences) : null
    if (prefs) {
      lines.push(`- Communication preferences: ${prefs}`)
    }
    if (portrait?.lifeContext?.trim()) {
      lines.push(`- Life context: ${portrait.lifeContext.trim()}`)
    }
    if (portrait?.toneNotes?.trim()) {
      lines.push(`- Tone notes: ${portrait.toneNotes.trim()}`)
    }
    lines.push('')
    lines.push(IDENTITY_GUARD_EN)
  } else {
    lines.push('## 本次对话的用户上下文')
    lines.push('')
    if (hasGrowth) {
      lines.push(`- 易道修为境界：${growthContext!.title}`)
    }
    if (portrait?.topics?.length) {
      lines.push(`- 用户关注的主题：${joinTopics(portrait.topics, lang)}`)
    }
    const prefs = portrait ? preferenceClauseZh(portrait.preferences) : null
    if (prefs) {
      lines.push(`- 沟通偏好：${prefs}`)
    }
    if (portrait?.lifeContext?.trim()) {
      lines.push(`- 生活背景：${portrait.lifeContext.trim()}`)
    }
    if (portrait?.toneNotes?.trim()) {
      lines.push(`- 回应方式备注：${portrait.toneNotes.trim()}`)
    }
    lines.push('')
    lines.push(IDENTITY_GUARD_ZH)
  }

  return lines.join('\n')
}

// Re-export the identity guard constants for tests that assert presence
export { IDENTITY_GUARD_ZH, IDENTITY_GUARD_EN }
