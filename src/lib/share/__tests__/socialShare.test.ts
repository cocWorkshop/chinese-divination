import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  POSTER_RATIOS,
  buildLineShareUrl,
  generateSocialCopy,
  canWebShare,
  triggerNativeShare,
  type ShareCopyParams,
} from '../socialShare'

describe('socialShare engine', () => {
  const mockParams: ShareCopyParams = {
    typeZh: '四柱命局',
    typeEn: 'Four Pillars Chart',
    motto: '逢凶化吉 · 貴人照臨',
    summary: '日主丁火生於寅月，印旺得時，得木火相生之氣，貴人常隨。',
    subjectName: '張道長',
    shareUrl: 'https://chinese-divination.com/r/test_token_123',
    lang: 'zh-TW',
  }

  describe('POSTER_RATIOS', () => {
    it('defines correct 3:4 and 9:16 aspect ratios and pixel dimensions', () => {
      expect(POSTER_RATIOS['3:4'].width).toBe(1080)
      expect(POSTER_RATIOS['3:4'].height).toBe(1440)
      expect(POSTER_RATIOS['3:4'].aspectRatio).toBeCloseTo(0.75)

      expect(POSTER_RATIOS['9:16'].width).toBe(1080)
      expect(POSTER_RATIOS['9:16'].height).toBe(1920)
      expect(POSTER_RATIOS['9:16'].aspectRatio).toBeCloseTo(0.5625)
    })

    it('associates appropriate target platforms with each ratio', () => {
      expect(POSTER_RATIOS['3:4'].platforms).toContain('wechat_moments')
      expect(POSTER_RATIOS['3:4'].platforms).toContain('line')
      expect(POSTER_RATIOS['9:16'].platforms).toContain('instagram')
      expect(POSTER_RATIOS['9:16'].platforms).toContain('tiktok')
    })
  })

  describe('buildLineShareUrl', () => {
    it('creates an encoded URL scheme that opens Line chat with title, motto and url', () => {
      const lineUrl = buildLineShareUrl({
        title: '【玄機靈籤 · 四柱命局】',
        motto: '逢凶化吉 · 貴人照臨',
        url: 'https://chinese-divination.com/r/test_token_123',
      })

      expect(lineUrl.startsWith('https://line.me/R/msg/text/?')).toBe(true)
      const decoded = decodeURIComponent(lineUrl.replace('https://line.me/R/msg/text/?', ''))
      expect(decoded).toContain('【玄機靈籤 · 四柱命局】')
      expect(decoded).toContain('「逢凶化吉 · 貴人照臨」')
      expect(decoded).toContain('https://chinese-divination.com/r/test_token_123')
    })
  })

  describe('generateSocialCopy', () => {
    it('formats WeChat Moments copy with hashtags, subject and QR call to action', () => {
      const copy = generateSocialCopy('wechat_moments', mockParams)
      expect(copy).toContain('【玄機 · 專屬命理籤卡】')
      expect(copy).toContain('四柱命局推演：逢凶化吉 · 貴人照臨')
      expect(copy).toContain('👤 命主：張道長')
      expect(copy).toContain('掃描海報二維碼')
      expect(copy).toContain('#玄機')
      expect(copy).toContain('#每日靈籤')
    })

    it('formats WeChat Chat copy concisely for 1-to-1 conversation', () => {
      const copy = generateSocialCopy('wechat_chat', mockParams)
      expect(copy).toContain('【玄機靈籤】四柱命局：逢凶化吉 · 貴人照臨')
      expect(copy).toContain('(命主：張道長)')
      expect(copy).toContain('這是我在玄機推演的命理解讀')
    })

    it('formats Instagram copy with rich hashtags for engagement', () => {
      const copy = generateSocialCopy('instagram', mockParams)
      expect(copy).toContain('【玄機靈籤 · 四柱命局】')
      expect(copy).toContain('#ChineseDivination')
      expect(copy).toContain('#FortuneTelling')
      expect(copy).toContain('#紫微斗數')
    })

    it('formats TikTok copy with viral phrasing and divination tags', () => {
      const copy = generateSocialCopy('tiktok', mockParams)
      expect(copy).toContain('【玄機東方命理】四柱命局推演：逢凶化吉 · 貴人照臨 🔮')
      expect(copy).toContain('👉 點擊連結測算你的專屬命盤：')
      expect(copy).toContain('#八字算命')
      expect(copy).toContain('#國學智慧')
    })

    it('formats Line copy cleanly with clear CTA', () => {
      const copy = generateSocialCopy('line', mockParams)
      expect(copy).toContain('【玄機靈籤 · 四柱命局】')
      expect(copy).toContain('✨ 逢凶化吉 · 貴人照臨')
      expect(copy).toContain('👉 點此查看專屬命理推演：')
    })

    it('supports English localization', () => {
      const copyEn = generateSocialCopy('instagram', {
        ...mockParams,
        lang: 'en',
      })
      expect(copyEn).toContain('【Xuanji Oracle · Four Pillars Chart】')
      expect(copyEn).toContain('Subject: 張道長')
      expect(copyEn).toContain('Full chart & reading:')
    })
  })

  describe('canWebShare & triggerNativeShare', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('returns false when navigator.share is absent', () => {
      const nav = global.navigator as any
      const origShare = nav.share
      delete nav.share
      expect(canWebShare()).toBe(false)
      nav.share = origShare
    })

    it('invokes navigator.share with files when supported', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined)
      const mockCanShare = vi.fn().mockReturnValue(true)

      const nav = global.navigator as any
      nav.share = mockShare
      nav.canShare = mockCanShare

      const mockFile = new File(['fake-image'], 'poster.png', { type: 'image/png' })
      const res = await triggerNativeShare({
        title: 'Xuanji Poster',
        text: 'Divine chart',
        files: [mockFile],
      })

      expect(res).toBe(true)
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Xuanji Poster',
        text: 'Divine chart',
        files: [mockFile],
      })
    })

    it('gracefully handles AbortError (user dismissed share sheet)', async () => {
      const abortError = new Error('Share canceled')
      abortError.name = 'AbortError'
      const mockShare = vi.fn().mockRejectedValue(abortError)

      const nav = global.navigator as any
      nav.share = mockShare

      const res = await triggerNativeShare({
        title: 'Xuanji Poster',
        url: 'https://example.com',
      })

      expect(res).toBe(false)
    })
  })
})
