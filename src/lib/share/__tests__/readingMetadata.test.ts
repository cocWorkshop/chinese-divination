import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateReadingMetadata } from '../readingMetadata'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    reading: {
      findFirst: vi.fn(),
    },
  },
}))

describe('generateReadingMetadata (OpenGraph & Twitter Card SSR)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates dynamic oriental OpenGraph metadata for shared readings', async () => {
    vi.mocked(prisma.reading.findFirst).mockResolvedValue({
      type: 'bazi',
      result: '## 命局推演\n日主丁火生於寅月，喜木火相生，得天乙貴人照臨，事業大展鴻圖。',
      question: '今年事業如何？',
      language: 'zh-TW',
      user: { name: '李雲風' },
      familyMember: null,
    } as any)

    const metadata = await generateReadingMetadata('test-token-777')
    const og = metadata.openGraph as any
    const twitter = metadata.twitter as any

    expect(metadata.title).toBe('【玄機靈籤】四柱命局推演 · 逢凶化吉 · 貴人照臨')
    expect(og?.title).toBe('【玄機靈籤】四柱命局推演 · 逢凶化吉 · 貴人照臨')
    expect(og?.url).toBe('https://chinese-divination.com/r/test-token-777')
    expect(og?.type).toBe('article')
    expect(og?.locale).toBe('zh_TW')
    expect(metadata.description).toContain('日主丁火生於寅月')
    expect(twitter?.card).toBe('summary_large_image')
  })

  it('generates English OpenGraph metadata for English readings', async () => {
    vi.mocked(prisma.reading.findFirst).mockResolvedValue({
      type: 'ziwei',
      result: 'The Zi Wei Emperor star is placed in the Career palace with auspicious stars.',
      question: 'Career outlook',
      language: 'en',
      user: { name: 'John Doe' },
      familyMember: null,
    } as any)

    const metadata = await generateReadingMetadata('en-token-888')
    const og = metadata.openGraph as any

    expect(metadata.title).toBe('【Xuanji Oracle】Zi Wei Constellation · 洞見星機 · 趨吉避凶')
    expect(og?.locale).toBe('en_US')
  })

  it('returns fallback metadata when reading is not found or revoked', async () => {
    vi.mocked(prisma.reading.findFirst).mockResolvedValue(null)

    const metadata = await generateReadingMetadata('nonexistent')

    expect(metadata.title).toContain('找不到此預測結果')
  })

  it('gracefully catches exceptions and returns resilient metadata', async () => {
    vi.mocked(prisma.reading.findFirst).mockRejectedValue(new Error('DB connection failed'))

    const metadata = await generateReadingMetadata('err-token')

    expect(metadata.title).toBe('專屬命理靈籤 | 玄機 Xuanji')
  })
})
