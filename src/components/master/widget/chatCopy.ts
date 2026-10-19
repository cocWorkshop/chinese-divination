import type { MasterMsg } from '../MasterChatContext'
import { TEN } from '@/lib/i18n'

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  if (typeof window === 'undefined') return false

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall back to execCommand below
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.width = '2em'
    textarea.style.height = '2em'
    textarea.style.padding = '0'
    textarea.style.border = 'none'
    textarea.style.outline = 'none'
    textarea.style.boxShadow = 'none'
    textarea.style.background = 'transparent'
    textarea.style.opacity = '0'
    textarea.style.zIndex = '-1'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)
    return successful
  } catch {
    return false
  }
}

export function formatMessagesForCopy(
  messages: MasterMsg[],
  isEn: boolean,
): string {
  const title = TEN(isEn, '【玄機大師對話記錄】', '【Master Xuanji Chat Records】')
  const blocks: string[] = []

  for (const msg of messages) {
    if (msg.kind === 'feedback_prompt') continue

    if (msg.kind === 'system_note' && msg.content) {
      const tag = TEN(isEn, '系統提示', 'System Note')
      blocks.push(`[${tag}] ${msg.content}`)
      continue
    }

    if (msg.kind === 'reading_card' && msg.readingCardPayload) {
      const card = msg.readingCardPayload
      const tag = TEN(isEn, '命盤參考', 'Reading Reference')
      const notePart = card.note ? `\n${card.note}` : ''
      blocks.push(`[${tag}] ${card.title} - ${card.subtitle}${notePart}`)
      continue
    }

    if (msg.kind === 'cta_card' && msg.ctaPayload) {
      const cta = msg.ctaPayload
      const tag = TEN(isEn, '占卜推演建議', 'Divination Recommendation')
      blocks.push(`[${tag}] ${cta.ctaTitle}\n${cta.ctaDescription}`)
      continue
    }

    if (!msg.content) continue

    const speaker = msg.role === 'user'
      ? TEN(isEn, '問', 'User')
      : TEN(isEn, '玄機大師', 'Master Xuanji')
    blocks.push(`${speaker}：\n${msg.content.trim()}`)
  }

  if (blocks.length === 0) return ''
  return `${title}\n\n${blocks.join('\n\n---\n\n')}`
}

