import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getPosterConfig } from '@/components/reading/fatePosterConfig'

/**
 * Server-side metadata generator for public reading cards (/r/[token]).
 * Provides rich OpenGraph and Twitter card previews for Line, WeChat, Discord, Twitter, etc.
 */
export async function generateReadingMetadata(token: string): Promise<Metadata> {
  try {
    const reading = await prisma.reading.findFirst({
      where: { shareToken: token, deletedAt: null },
      select: {
        type: true,
        result: true,
        question: true,
        language: true,
        user: { select: { name: true } },
        familyMember: { select: { name: true, relation: true } },
      },
    })

    if (!reading) {
      return {
        title: '找不到此預測結果 | 玄機 Xuanji',
        description: 'Reading not found or has been revoked.',
      }
    }

    const config = getPosterConfig(reading.type)
    const isZh = reading.language !== 'en'

    // Clean markdown characters for crisp openGraph description
    const plainText = reading.result
      ? reading.result.replace(/[#*`_\[\]()\-]/g, ' ').replace(/\s+/g, ' ').trim()
      : ''
    const summary = plainText.slice(0, 110)

    const title = isZh
      ? `【玄機靈籤】${config.zh}推演 · ${config.motto}`
      : `【Xuanji Oracle】${config.en} · ${config.motto}`

    const description = summary
      ? `${summary}... ${isZh ? '古法智慧推演，洞析天時地利。' : 'Ancient Chinese Divination Metaphysics.'}`
      : isZh
      ? '古法智慧推演，洞析天時地利，指引前程明路。'
      : 'Ancient Chinese Divination Metaphysics.'

    const canonicalUrl = `https://chinese-divination.com/r/${token}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: '玄機 · Xuanji',
        locale: isZh ? 'zh_TW' : 'en_US',
        type: 'article',
        images: [
          {
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['/og-image.png'],
      },
    }
  } catch {
    return {
      title: '專屬命理靈籤 | 玄機 Xuanji',
      description: '古法智慧推演，洞析天時地利，指引前程明路。',
    }
  }
}
