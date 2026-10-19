import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatMessagesForCopy, copyToClipboard } from '../widget/chatCopy'
import type { MasterMsg } from '../MasterChatContext'

describe('chatCopy helpers', () => {
  describe('formatMessagesForCopy', () => {
    it('returns empty string when there are no messages or only feedback prompts', () => {
      expect(formatMessagesForCopy([], false)).toBe('')
      const onlyPrompt: MasterMsg[] = [
        {
          role: 'assistant',
          content: '',
          timestamp: '2026-10-18T20:00:00Z',
          kind: 'feedback_prompt',
        },
      ]
      expect(formatMessagesForCopy(onlyPrompt, false)).toBe('')
    })

    it('formats conversation turns in Chinese with classical headers', () => {
      const messages: MasterMsg[] = [
        {
          role: 'user',
          content: '大師，我想問今年的事業走向如何？',
          timestamp: '2026-10-18T20:01:00Z',
        },
        {
          role: 'assistant',
          content: '命主今年逢官印相生之局，事業有提拔之象，但須防口舌。',
          timestamp: '2026-10-18T20:01:10Z',
        },
      ]
      const text = formatMessagesForCopy(messages, false)
      expect(text).toContain('【玄機大師對話記錄】')
      expect(text).toContain('問：\n大師，我想問今年的事業走向如何？')
      expect(text).toContain('玄機大師：\n命主今年逢官印相生之局，事業有提拔之象，但須防口舌。')
      expect(text).toContain('---')
    })

    it('formats conversation turns in English when isEn is true', () => {
      const messages: MasterMsg[] = [
        {
          role: 'user',
          content: 'How will my career look this year?',
          timestamp: '2026-10-18T20:01:00Z',
        },
        {
          role: 'assistant',
          content: 'Your annual chart suggests recognition and authority.',
          timestamp: '2026-10-18T20:01:10Z',
        },
      ]
      const text = formatMessagesForCopy(messages, true)
      expect(text).toContain('【Master Xuanji Chat Records】')
      expect(text).toContain('User：\nHow will my career look this year?')
      expect(text).toContain('Master Xuanji：\nYour annual chart suggests recognition and authority.')
    })

    it('formats reading cards and CTA cards cleanly', () => {
      const messages: MasterMsg[] = [
        {
          role: 'assistant',
          content: '',
          timestamp: '2026-10-18T20:02:00Z',
          kind: 'reading_card',
          readingCardPayload: {
            readingId: 'rd-123',
            divinationType: 'bazi',
            title: '八字命盤 · 乾造',
            subtitle: '甲木生於寅月，身旺官透',
            url: '/reading/rd-123',
            note: '已為您同步大運流年盤',
          },
        },
        {
          role: 'assistant',
          content: '',
          timestamp: '2026-10-18T20:03:00Z',
          kind: 'cta_card',
          ctaPayload: {
            url: '/divination/liuyao',
            ctaLabel: '前往搖卦',
            ctaTitle: '起六爻卦測今日出行',
            ctaDescription: '建議以出行所問起一卦象',
            divinationType: 'liuyao',
          },
        },
        {
          role: 'system',
          content: '六爻排盤完成',
          timestamp: '2026-10-18T20:04:00Z',
          kind: 'system_note',
        },
      ]
      const text = formatMessagesForCopy(messages, false)
      expect(text).toContain('[命盤參考] 八字命盤 · 乾造 - 甲木生於寅月，身旺官透\n已為您同步大運流年盤')
      expect(text).toContain('[占卜推演建議] 起六爻卦測今日出行\n建議以出行所問起一卦象')
      expect(text).toContain('[系統提示] 六爻排盤完成')
    })
  })

  describe('copyToClipboard', () => {
    beforeEach(() => {
      ;(globalThis as any).window = {}
    })

    afterEach(() => {
      // @ts-ignore
      delete globalThis.window
      // @ts-ignore
      delete globalThis.document
      // @ts-ignore
      delete globalThis.navigator
      vi.restoreAllMocks()
    })

    it('returns false for empty input', async () => {
      expect(await copyToClipboard('')).toBe(false)
    })

    it('uses navigator.clipboard.writeText when available', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      ;(globalThis as any).navigator = {
        clipboard: { writeText: writeTextMock },
      }
      const result = await copyToClipboard('test copy content')
      expect(result).toBe(true)
      expect(writeTextMock).toHaveBeenCalledWith('test copy content')
    })

    it('falls back to execCommand when clipboard.writeText rejects', async () => {
      ;(globalThis as any).navigator = {
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      }
      const execCommandMock = vi.fn().mockReturnValue(true)
      const fakeElement = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      }
      ;(globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(fakeElement),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: execCommandMock,
      }

      const result = await copyToClipboard('fallback copy content')
      expect(result).toBe(true)
      expect(execCommandMock).toHaveBeenCalledWith('copy')
    })
  })
})
