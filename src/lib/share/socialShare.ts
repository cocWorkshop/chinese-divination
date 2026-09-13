/**
 * Social Media Sharing Engine for Xuanji
 * Supports Line, WeChat (Chat & Moments), Instagram (Stories & Feed), and TikTok.
 */

export type PosterRatio = '3:4' | '9:16'

export interface PosterDimensions {
  width: number
  height: number
  aspectRatio: number
  nameZh: string
  nameEn: string
  recommendedForZh: string
  recommendedForEn: string
  platforms: string[]
}

export const POSTER_RATIOS: Record<PosterRatio, PosterDimensions> = {
  '3:4': {
    width: 1080,
    height: 1440,
    aspectRatio: 3 / 4,
    nameZh: '3:4 經典籤卡',
    nameEn: '3:4 Classic Card',
    recommendedForZh: '適合 微信朋友圈 / 微信聊天 / 小紅書 / Line',
    recommendedForEn: 'Best for WeChat Moments & Chat, Xiaohongshu, Line',
    platforms: ['wechat_moments', 'wechat_chat', 'line'],
  },
  '9:16': {
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    nameZh: '9:16 沉浸快拍',
    nameEn: '9:16 Story / Reel',
    recommendedForZh: '適合 Instagram 快拍 / TikTok 圖文 / 全螢幕',
    recommendedForEn: 'Best for Instagram Stories, TikTok Photo Mode, Mobile Fullscreen',
    platforms: ['instagram', 'tiktok'],
  },
}

export type SocialPlatform = 'line' | 'wechat_moments' | 'wechat_chat' | 'instagram' | 'tiktok' | 'general'

export interface ShareCopyParams {
  typeZh: string
  typeEn: string
  motto: string
  summary: string
  subjectName?: string | null
  shareUrl: string
  lang?: string
}

/**
 * Builds the Line direct sharing URL scheme.
 * Opens the Line app on mobile or desktop with prefilled text & URL.
 */
export function buildLineShareUrl(params: { title: string; motto?: string; url: string }): string {
  const content = [
    params.title,
    params.motto ? `「${params.motto}」` : null,
    params.url,
  ].filter(Boolean).join('\n')

  return `https://line.me/R/msg/text/?${encodeURIComponent(content)}`
}

/**
 * Generates cultured, platform-tailored copywriting ready for one-tap copying and posting.
 */
export function generateSocialCopy(platform: SocialPlatform, params: ShareCopyParams): string {
  const isZh = params.lang !== 'en'
  const title = isZh ? `【玄機靈籤 · ${params.typeZh}】` : `【Xuanji Oracle · ${params.typeEn}】`
  const motto = params.motto ? `✨ ${params.motto}` : ''
  const subject = params.subjectName ? (isZh ? `命主：${params.subjectName}` : `Subject: ${params.subjectName}`) : ''
  const snippet = params.summary ? `「${params.summary.slice(0, 70)}${params.summary.length > 70 ? '...' : ''}」` : ''

  switch (platform) {
    case 'line':
      return [
        title,
        motto,
        subject,
        snippet,
        '',
        isZh ? '👉 點此查看專屬命理推演：' : '👉 View full reading:',
        params.shareUrl,
      ].filter(line => line !== null && line !== undefined).join('\n').trim()

    case 'wechat_moments':
      return [
        isZh ? `【玄機 · 專屬命理籤卡】` : `【Xuanji · Fortune Poster】`,
        `${params.typeZh}推演：${params.motto}`,
        subject ? `👤 ${subject}` : '',
        snippet,
        '',
        isZh ? '📜 掃描海報二維碼或點擊連結親解 👇' : '📜 Scan poster QR or tap link below 👇',
        params.shareUrl,
        '',
        '#玄機 #東方命理 #易經八字 #每日靈籤',
      ].filter(Boolean).join('\n')

    case 'wechat_chat':
      return [
        isZh ? `【玄機靈籤】${params.typeZh}：${params.motto}` : `【Xuanji】${params.typeEn}: ${params.motto}`,
        subject ? `(${subject})` : '',
        snippet,
        isZh ? '這是我在玄機推演的命理解讀，點此親解：' : 'Here is my divination reading from Xuanji:',
        params.shareUrl,
      ].filter(Boolean).join('\n')

    case 'instagram':
      return [
        title,
        motto,
        subject ? `👤 ${subject}` : '',
        '',
        snippet,
        '',
        isZh ? '🔗 完整推演報告請見個人簡介連結或：' : '🔗 Full chart & reading:',
        params.shareUrl,
        '.',
        '#玄機 #Xuanji #ChineseDivination #八字 #命理 #易經 #紫微斗數 #東方美學 #FortuneTelling #Horoscope',
      ].filter(Boolean).join('\n')

    case 'tiktok':
      return [
        isZh ? `【玄機東方命理】${params.typeZh}推演：${params.motto} 🔮` : `【Xuanji】${params.typeEn}: ${params.motto} 🔮`,
        snippet,
        '',
        isZh ? '👉 點擊連結測算你的專屬命盤：' : '👉 Decode your fate chart here:',
        params.shareUrl,
        '',
        '#玄機 #命理 #八字算命 #紫微斗數 #國學智慧 #占卜 #命運',
      ].filter(Boolean).join('\n')

    case 'general':
    default:
      return [
        title,
        motto,
        snippet,
        '',
        params.shareUrl,
      ].filter(Boolean).join('\n')
  }
}

/**
 * Checks whether Web Share API is available in the current environment.
 */
export function canWebShare(files?: File[]): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (files && files.length > 0 && navigator.canShare) {
    try {
      return navigator.canShare({ files })
    } catch {
      return false
    }
  }
  return true
}

/**
 * Attempts to trigger the native system share sheet (iOS/Android/macOS/Windows).
 * Gracefully falls back to false if unshared or unsupported.
 */
export async function triggerNativeShare(opts: {
  title: string
  text?: string
  url?: string
  files?: File[]
}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false

  try {
    if (opts.files && opts.files.length > 0 && navigator.canShare?.({ files: opts.files })) {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        files: opts.files,
      })
      return true
    }

    await navigator.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
    })
    return true
  } catch (err: unknown) {
    // AbortError indicates the user dismissed the share modal deliberately
    if (err instanceof Error && err.name === 'AbortError') {
      return false
    }
    return false
  }
}
