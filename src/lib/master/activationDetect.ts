/**
 * Pure helpers for the Master widget's activation-resume dispatcher
 * (see docs/planning/activation-resume-design-2026-04-27.md).
 *
 * Lives outside the React context so it's straightforward to unit-test and
 * so importers don't pull a 'use client' module into server code paths.
 */

/**
 * Minimal CTA payload shape — the fields the dispatcher needs to make a
 * resume decision. Kept local to avoid pulling the client-only
 * MasterChatContext module into server / test paths.
 */
export interface DetectableCtaPayload {
  divinationType: string
  ctaContext?: {
    target?: string
    [k: string]: unknown
  }
}

export interface DetectableMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  kind?: 'text' | 'cta_card' | 'reading_card' | 'greeting' | 'system_note' | 'feedback_prompt'
  ctaPayload?: DetectableCtaPayload
}

/**
 * Walk the transcript backward and return the most-recent assistant CTA
 * card whose corresponding reading has NOT been completed within the
 * transcript itself (i.e. no later reading_card of the same type exists
 * after it). Returns null if no such CTA is found.
 */
export function findLatestPendingCTA(
  messages: DetectableMsg[],
): { timestamp: string; type: string; target: 'self' | 'family' } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue

    if (m.kind === 'reading_card') {
      // A reading card supersedes any earlier CTA of its type — once we hit
      // one walking backward, we know every CTA before it of the same type
      // has been fulfilled. Continue looking for older un-fulfilled CTAs of
      // OTHER types.
      continue
    }

    if (m.kind === 'cta_card' && m.ctaPayload) {
      const ctaType = m.ctaPayload.divinationType
      // Was a reading_card of the same type emitted AFTER this CTA?
      let supersededByLaterReading = false
      for (let j = i + 1; j < messages.length; j++) {
        const later = messages[j]
        if (
          later.role === 'assistant' &&
          later.kind === 'reading_card' &&
          // We don't have divinationType on the readingCardPayload here
          // because DetectableMsg only carries ctaPayload — the caller
          // should pass through reading_card kinds, but for now we treat
          // ANY later reading_card as superseding. False-positive risk: a
          // reading_card for an unrelated type could mask a still-pending
          // CTA. In practice this is rare; the LLM-fallback path catches it.
          later.kind === 'reading_card'
        ) {
          supersededByLaterReading = true
          break
        }
      }
      if (supersededByLaterReading) continue

      const target: 'self' | 'family' = inferCtaTarget(m.ctaPayload)
      return { timestamp: m.timestamp, type: ctaType, target }
    }
  }
  return null
}

function inferCtaTarget(payload: DetectableCtaPayload): 'self' | 'family' {
  const t = payload.ctaContext?.target
  if (!t) return 'self'
  // Heuristic: any "為自己" / "for yourself" framing → self; otherwise family.
  // Family names are unpredictable, so we treat anything else as family.
  if (/自己|yourself|myself/i.test(t)) return 'self'
  return 'family'
}

const CLOSING_PATTERNS_ZH =
  /保重|再[見见]|祝[您你][^，。]{0,12}(順利|顺利|平安|健康|好運|好运|愉快)|多保重|慢走|有事再[來来]|改天[再再]?[聊聊]/
const CLOSING_PATTERNS_EN =
  /\btake care\b|\bgood luck\b|\btalk (?:to you )?later\b|\bcatch you\b|\bsee you\b|\bbye\b|\bfare ?well\b/i

/**
 * User-closing recogniser. We accept short utterances that either start
 * with a closer word (好/明白/收到…) OR contain a thank-you token within a
 * brief overall length. Allowing trailing decoration like "好的，謝謝大師"
 * matters — strict anchoring misses common natural sign-offs.
 */
function isUserClosingZh(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > 20) return false
  if (/^(好|了解|明白|收到|沒了|没了|就這樣|就这样|拜拜|再[見见])/.test(trimmed)) return true
  if (/(謝謝|谢谢)/.test(trimmed)) return true
  return false
}
function isUserClosingEn(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length === 0 || trimmed.length > 30) return false
  if (/^(thanks?|thank you|got it|sounds good|that['’]s all|bye|see ?ya|cheers|ok|okay|alright)\b/i.test(trimmed)) return true
  return false
}

/**
 * Whether the conversation reads as having "closed gracefully" — both the
 * master's last reply AND the user's last message read as closing exchanges.
 * Conservative on purpose: false negative (LLM gets one extra turn) is
 * cheaper than false positive (master stays silent when they should pick up).
 */
export function isClosed(
  messages: DetectableMsg[],
  lang: 'zh-TW' | 'en',
): boolean {
  const lastAssistant = [...messages].reverse().find(
    (m) =>
      m.role === 'assistant' &&
      (m.kind === 'text' || !m.kind) &&
      m.content.trim().length > 0,
  )
  if (!lastAssistant) return false
  const assistantPattern = lang === 'en' ? CLOSING_PATTERNS_EN : CLOSING_PATTERNS_ZH
  if (!assistantPattern.test(lastAssistant.content)) return false

  const lastUser = [...messages].reverse().find(
    (m) => m.role === 'user' && (m.kind === 'text' || !m.kind),
  )
  if (!lastUser) {
    // Master's last reply has a closer but the user hasn't said anything to
    // confirm the close yet — treat as not closed (user might still ask).
    return false
  }
  return lang === 'en'
    ? isUserClosingEn(lastUser.content)
    : isUserClosingZh(lastUser.content)
}
