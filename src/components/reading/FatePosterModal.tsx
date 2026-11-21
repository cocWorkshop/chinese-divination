'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { T } from '@/lib/i18n'
import SectionDrawer from '@/components/results/SectionDrawer'
import {
  POSTER_RATIOS,
  type PosterRatio,
  type SocialPlatform,
  extractCleanReadingExcerpt,
  buildLineShareUrl,
  generateSocialCopy,
  canWebShare,
  triggerNativeShare,
} from '@/lib/share/socialShare'
import { SparkleIcon, ScrollIcon, CopyIcon, LinkIcon } from '@/components/DivinationIcons'
import { typeMap, getPosterConfig } from './fatePosterConfig'
export { typeMap, getPosterConfig }

export interface FatePosterSectionProps {
  readingId: string
  shareToken?: string | null
  divinationType: string
  subjectName?: string | null
  result?: string | null
  lang?: string
  /** Optional legacy modal props for backward compatibility */
  isOpen?: boolean
  onClose?: () => void
  defaultOpen?: boolean
}

async function copyToClipboardSafe(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
}

export default function FatePosterModal({
  readingId,
  shareToken: initialShareToken,
  divinationType,
  subjectName,
  result,
  lang = 'zh-TW',
  defaultOpen = false,
}: FatePosterSectionProps) {
  const [ratio, setRatio] = useState<PosterRatio>('3:4')
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [activeToken, setActiveToken] = useState<string | null>(initialShareToken || null)

  useEffect(() => {
    if (initialShareToken) setActiveToken(initialShareToken)
  }, [initialShareToken])

  const info = useMemo(() => getPosterConfig(divinationType), [divinationType])

  // Derive a clean human-readable excerpt from either V2 JSON or plain markdown
  const cleanSummary = useMemo(() => {
    const excerpt = extractCleanReadingExcerpt(result, ratio === '9:16' ? 140 : 96)
    if (excerpt) return excerpt
    return T(
      lang,
      '古法智慧推演，洞析天時地利，指引前程明路。',
      'Classical divination wisdom illuminating current pathways.',
    )
  }, [result, ratio, lang])

  // Ensure a valid public shareToken exists so QR code and social links never 404
  const ensurePublicShareUrl = useCallback(async (): Promise<string> => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://chinese-divination.com'
    if (activeToken) return `${origin}/r/${activeToken}`
    try {
      const res = await fetch(`/api/readings/${readingId}/share`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data?.token) {
          setActiveToken(data.token)
          return `${origin}/r/${data.token}`
        }
      }
    } catch {
      // Fallback if offline or unauthenticated
    }
    return `${origin}/r/${activeToken || readingId}`
  }, [activeToken, readingId])

  // Auto-provision shareToken on mount if missing so the QR code on the poster works immediately
  useEffect(() => {
    if (!activeToken && readingId) {
      ensurePublicShareUrl().catch(() => {})
    }
  }, [activeToken, readingId, ensurePublicShareUrl])

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${activeToken || readingId}`
    : `https://chinese-divination.com/r/${activeToken || readingId}`

  // Check Web Share API capability
  useEffect(() => {
    setHasNativeShare(canWebShare())
  }, [])

  // Generate QR Code data URL
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#d4a853', light: '#0a0f1e' },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {})
  }, [shareUrl])

  // Pure canvas renderer returning a Canvas element
  const renderCanvas = useCallback(
    async (targetRatio: PosterRatio): Promise<HTMLCanvasElement> => {
      const dimensions = POSTER_RATIOS[targetRatio]
      const { width, height } = dimensions

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      // 1. Cosmic Deep Navy Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
      bgGrad.addColorStop(0, '#060a15')
      bgGrad.addColorStop(0.5, '#0b1326')
      bgGrad.addColorStop(1, '#050913')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Radial Golden Nebula in Upper Center
      const nebulaY = targetRatio === '9:16' ? 700 : 540
      const radial = ctx.createRadialGradient(width / 2, nebulaY, 60, width / 2, nebulaY, width * 0.65)
      radial.addColorStop(0, 'rgba(212, 168, 83, 0.12)')
      radial.addColorStop(0.5, 'rgba(23, 38, 70, 0.35)')
      radial.addColorStop(1, 'rgba(6, 10, 21, 0)')
      ctx.fillStyle = radial
      ctx.fillRect(0, 0, width, height)

      // 2. Traditional Gold Filigree Double Borders
      const margin = 45
      const innerMargin = 60
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.38)'
      ctx.lineWidth = 3
      ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

      ctx.strokeStyle = 'rgba(212, 168, 83, 0.18)'
      ctx.lineWidth = 1
      ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2)

      // Cloud Corners (祥雲回紋角飾)
      const drawCorner = (x: number, y: number, rot: number) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rot)
        ctx.strokeStyle = '#d4a853'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(0, 30)
        ctx.lineTo(0, 0)
        ctx.lineTo(30, 0)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(6, 22)
        ctx.lineTo(6, 6)
        ctx.lineTo(22, 6)
        ctx.stroke()
        ctx.restore()
      }
      const cOffset = 72
      drawCorner(cOffset, cOffset, 0)
      drawCorner(width - cOffset, cOffset, Math.PI / 2)
      drawCorner(width - cOffset, height - cOffset, Math.PI)
      drawCorner(cOffset, height - cOffset, -Math.PI / 2)

      // Dynamic Y-coordinates based on aspect ratio
      const isStory = targetRatio === '9:16'
      const topTitleY = isStory ? 200 : 140
      const subtitleY = topTitleY + 50
      const subjectY = subtitleY + 56
      const mottoBoxY = isStory ? 410 : 315
      const mottoBoxH = isStory ? 160 : 135
      const proseStartY = mottoBoxY + mottoBoxH + (isStory ? 85 : 65)
      const dividerY = isStory ? height - 320 : height - 290
      const footerY = dividerY + 95

      // 3. Header Title & Astronomical Year
      ctx.textAlign = 'center'
      ctx.fillStyle = '#d4a853'
      ctx.font = '34px "Noto Serif SC", serif'
      ctx.fillText(T(lang, '【 玄 機 靈 籤 】', '【 XUANJI ORACLE 】'), width / 2, topTitleY)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.font = '22px sans-serif'
      ctx.fillText(
        T(lang, `歲次丙午 · ${info.zh}推演`, `Solar Cycle · ${info.en}`),
        width / 2,
        subtitleY
      )

      if (subjectName) {
        ctx.fillStyle = 'rgba(212, 168, 83, 0.85)'
        ctx.font = '23px "Noto Serif SC", serif'
        ctx.fillText(`${T(lang, '命主：', 'Subject: ')}${subjectName}`, width / 2, subjectY)
      }

      // 4. Central Motto Box
      const mottoBoxW = width - 260
      const mottoBoxX = 130
      ctx.fillStyle = 'rgba(17, 29, 53, 0.75)'
      ctx.fillRect(mottoBoxX, mottoBoxY, mottoBoxW, mottoBoxH)
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(mottoBoxX, mottoBoxY, mottoBoxW, mottoBoxH)

      ctx.strokeStyle = 'rgba(212, 168, 83, 0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(mottoBoxX + 6, mottoBoxY + 6, mottoBoxW - 12, mottoBoxH - 12)

      ctx.fillStyle = '#fce8a6'
      ctx.font = 'bold 44px "Noto Serif SC", serif'
      ctx.fillText(info.motto, width / 2, mottoBoxY + (isStory ? 95 : 82))

      // 5. Core Divination Prose
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
      ctx.font = '31px "Noto Serif SC", serif'
      ctx.textAlign = 'left'

      const maxLineWidth = width - 260
      const startX = 130
      let cursorY = proseStartY
      const words = cleanSummary.split('')
      let line = ''
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i]
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxLineWidth && i > 0) {
          ctx.fillText(line, startX, cursorY)
          line = words[i]
          cursorY += isStory ? 58 : 52
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, startX, cursorY)

      // 6. Three Attribute Badges
      const pills = T(
        lang,
        ['吉曜照臨', '守正待時', '逢生化煞'],
        ['Auspicious Timing', 'Cultivate & Wait', 'Balance Restored'],
      )
      const pillY = cursorY + (isStory ? 120 : 100)
      ctx.textAlign = 'center'
      const pillSpacing = width / 3
      pills.forEach((pill, i) => {
        const px = pillSpacing * i + pillSpacing / 2
        const pillW = 230
        const pillH = 54
        ctx.fillStyle = 'rgba(212, 168, 83, 0.12)'
        ctx.fillRect(px - pillW / 2, pillY - 32, pillW, pillH)
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.35)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(px - pillW / 2, pillY - 32, pillW, pillH)
        ctx.fillStyle = '#e8c278'
        ctx.font = '24px "Noto Serif SC", serif'
        ctx.fillText(pill, px, pillY + 5)
      })

      // 7. Divider Line
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(130, dividerY)
      ctx.lineTo(width - 130, dividerY)
      ctx.stroke()

      // 8. Footer Vermillion Seal (Left)
      ctx.save()
      ctx.translate(210, footerY)
      ctx.rotate(-0.06)
      ctx.strokeStyle = '#c0392b'
      ctx.lineWidth = 4
      ctx.strokeRect(-65, -45, 130, 90)
      ctx.strokeRect(-60, -40, 120, 80)
      ctx.fillStyle = '#c0392b'
      ctx.font = 'bold 36px "Noto Serif SC", serif'
      ctx.textAlign = 'center'
      ctx.fillText('玄機', 0, -6)
      ctx.fillText('天算', 0, 30)
      ctx.restore()

      // Attribution Brand
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(212, 168, 83, 0.85)'
      ctx.font = '26px "Noto Serif SC", serif'
      ctx.fillText('玄機 · XuanJi', 310, footerY - 12)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.font = '21px sans-serif'
      ctx.fillText(T(lang, '古法智慧 · 當代精算', 'Ancient Wisdom, Modern Clarity'), 310, footerY + 24)

      // 9. QR Code (Right)
      if (qrDataUrl) {
        const img = new Image()
        img.src = qrDataUrl
        await new Promise((res) => {
          img.onload = res
          img.onerror = res
        })
        const qrSize = 135
        ctx.drawImage(img, width - 130 - qrSize, footerY - 55, qrSize, qrSize)
      }

      return canvas
    },
    [cleanSummary, info, lang, qrDataUrl, subjectName]
  )

  // Generate poster blob
  const generateBlob = useCallback(
    async (targetRatio: PosterRatio): Promise<Blob | null> => {
      const canvas = await renderCanvas(targetRatio)
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png')
      })
    },
    [renderCanvas]
  )

  // Update preview image when dependencies change
  useEffect(() => {
    if (!qrDataUrl) return
    let active = true
    renderCanvas(ratio)
      .then((canvas) => {
        if (active) setPreviewDataUrl(canvas.toDataURL('image/png'))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [qrDataUrl, ratio, renderCanvas])

  // Download high-resolution PNG
  const handleDownload = async (targetRatio?: PosterRatio) => {
    const effectiveRatio = targetRatio ?? ratio
    setDownloading(true)
    try {
      await ensurePublicShareUrl()
      const blob = await generateBlob(effectiveRatio)
      if (!blob) throw new Error('Blob generation failed')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ratioTag = effectiveRatio === '9:16' ? 'story' : 'card'
      a.download = `xuanji-fate-${divinationType}-${ratioTag}-${readingId.slice(0, 6)}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(
        T(
          lang,
          `已下載 ${POSTER_RATIOS[effectiveRatio].nameZh}！`,
          `Downloaded ${POSTER_RATIOS[effectiveRatio].nameEn}!`,
        ),
      )
    } catch (e) {
      console.error('Failed to generate poster:', e)
      toast.error(T(lang, '生成失敗，請重試', 'Generation failed, please retry'))
    } finally {
      setDownloading(false)
    }
  }

  // Native Web Share API invocation
  const handleNativeShare = async () => {
    setSharing(true)
    try {
      const urlToShare = await ensurePublicShareUrl()
      const blob = await generateBlob(ratio)
      if (!blob) throw new Error('Blob creation failed')

      const file = new File(
        [blob],
        `xuanji-fate-${divinationType}-${readingId.slice(0, 6)}.png`,
        { type: 'image/png' }
      )

      const success = await triggerNativeShare({
        title: T(lang, `【玄機靈籤】${info.zh}推演`, `【Xuanji Oracle】${info.en}`),
        text: `${info.motto}\n${cleanSummary}`,
        url: urlToShare,
        files: [file],
      })

      if (success) {
        toast.success(T(lang, '分享成功！', 'Shared successfully!'))
      }
    } catch (e) {
      console.error('Native share failed:', e)
      toast.error(T(lang, '分享未能開啟', 'Could not open share menu'))
    } finally {
      setSharing(false)
    }
  }

  // Line direct share (1-click via URL scheme)
  const handleLineShare = async () => {
    const urlToShare = await ensurePublicShareUrl()
    const lineUrl = buildLineShareUrl({
      title: T(lang, `【玄機靈籤 · ${info.zh}】`, `【Xuanji Oracle · ${info.en}】`),
      motto: info.motto,
      url: urlToShare,
    })
    window.open(lineUrl, '_blank', 'noopener,noreferrer')
    toast.success(T(lang, '已開啟 Line 分享', 'Opened Line share'))
  }

  // Copy platform-tailored copywriting (and optionally download the matching poster ratio)
  const handleCopyPlatformText = async (
    platform: SocialPlatform,
    labelZh: string,
    labelEn: string,
    autoRatio?: PosterRatio,
  ) => {
    if (autoRatio && autoRatio !== ratio) {
      setRatio(autoRatio)
    }
    const urlToShare = await ensurePublicShareUrl()
    const text = generateSocialCopy(platform, {
      typeZh: info.zh,
      typeEn: info.en,
      motto: info.motto,
      summary: cleanSummary,
      subjectName,
      shareUrl: urlToShare,
      lang,
    })
    const ok = await copyToClipboardSafe(text)
    if (ok) {
      toast.success(
        T(lang, `已複製 ${labelZh} 分享文案與連結！`, `Copied ${labelEn} caption & link!`),
      )
    } else {
      toast.error(T(lang, '複製失敗，請手動複製', 'Copy failed'))
    }
  }

  // Copy plain share URL
  const handleCopyLink = async () => {
    const urlToShare = await ensurePublicShareUrl()
    const ok = await copyToClipboardSafe(urlToShare)
    if (ok) {
      toast.success(T(lang, '專屬分享連結已複製！', 'Share link copied!'))
    } else {
      toast.error(T(lang, '複製失敗', 'Copy failed'))
    }
  }

  return (
    <div className="mt-4">
      <SectionDrawer
        defaultOpen={defaultOpen}
        icon={<ScrollIcon size={16} className="text-gold" />}
        title={T(lang, '專屬命理靈籤分享卡', 'Personal Fate Card & Social Share')}
        trailing={
          <span className="text-[11px] text-[var(--text-muted)] font-normal hidden sm:inline">
            {T(lang, '點擊展開預覽與社交分享', 'Expand to preview & share')}
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-start pt-1">
          {/* Left Column: Poster Preview + Ratio Switcher (5 cols) */}
          <div className="sm:col-span-5 flex flex-col items-center gap-2.5">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gold/5 border border-gold/20 text-xs">
              <button
                type="button"
                onClick={() => setRatio('3:4')}
                className={`px-2.5 py-1 rounded-md transition-all font-serif cursor-pointer ${
                  ratio === '3:4'
                    ? 'bg-gold text-navy-950 font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-gold'
                }`}
              >
                {T(lang, '3:4 經典籤卡', '3:4 Card')}
              </button>
              <button
                type="button"
                onClick={() => setRatio('9:16')}
                className={`px-2.5 py-1 rounded-md transition-all font-serif cursor-pointer ${
                  ratio === '9:16'
                    ? 'bg-gold text-navy-950 font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-gold'
                }`}
              >
                {T(lang, '9:16 快拍長圖', '9:16 Story')}
              </button>
            </div>

            <div
              className={`rounded-xl border border-gold/25 bg-[#060a15] relative overflow-hidden shadow-md flex items-center justify-center w-full ${
                ratio === '9:16' ? 'max-w-[200px] aspect-[9/16]' : 'max-w-[230px] aspect-[3/4]'
              }`}
            >
              {previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDataUrl}
                  alt="Xuanji Fate Poster"
                  className="w-full h-full object-contain select-none"
                />
              ) : (
                <div className="p-6 text-center text-gold/60 text-xs animate-pulse font-serif">
                  {T(lang, '正在繪製靈籤…', 'Rendering card…')}
                </div>
              )}
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center">
              {T(lang, '手機端可直接長按圖片保存至相簿', 'Long-press image on mobile to save')}
            </p>
          </div>

          {/* Right Column: Clean Primary Actions & Social Media Share (7 cols) */}
          <div className="sm:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-serif text-gold font-medium">
                {T(lang, `【${info.zh}】${info.motto}`, `${info.en} · ${info.motto}`)}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 font-serif">
                {cleanSummary}
              </p>
            </div>

            {/* Primary Actions: Download Image & Copy Public Link */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload()}
                disabled={downloading}
                className="flex-1 min-w-[140px] py-2 px-3.5 rounded-lg bg-gradient-to-r from-[#d4a853] via-[#e5be6a] to-[#c99738] text-navy-950 font-serif font-semibold text-xs hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <ScrollIcon size={13} />
                <span>
                  {downloading
                    ? T(lang, '繪製中…', 'Rendering…')
                    : T(lang, `下載籤卡圖片 (${ratio})`, `Download PNG (${ratio})`)}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2 px-3.5 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold font-serif text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LinkIcon size={13} />
                <span>{T(lang, '複製分享連結', 'Copy Link')}</span>
              </button>

              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={sharing}
                  className="py-2 px-3 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/25 text-gold font-serif text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  title={T(lang, '調用系統分享', 'System Share')}
                >
                  <SparkleIcon size={12} />
                  <span>{T(lang, '系統分享', 'Share')}</span>
                </button>
              )}
            </div>

            {/* Concise Social Platforms Grid */}
            <div className="pt-3 border-t border-gold/15 space-y-2">
              <div className="text-[11px] text-[var(--text-muted)] font-serif">
                {T(lang, '社交平台快捷分享（自動匹配尺寸或複製專屬文案）：', 'Quick share to social platforms:')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Line: 1-tap open */}
                <button
                  type="button"
                  onClick={handleLineShare}
                  className="px-3 py-2 rounded-lg bg-gold/5 hover:bg-gold/15 border border-gold/20 hover:border-gold/40 text-left transition-all flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-serif font-medium text-[var(--text-primary)] group-hover:text-gold">
                      Line
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {T(lang, '一鍵開啟 Line 傳送', '1-tap send via Line')}
                    </div>
                  </div>
                  <span className="text-xs text-gold flex-shrink-0">→</span>
                </button>

                {/* WeChat: Copy Moments caption + switch to 3:4 */}
                <button
                  type="button"
                  onClick={() => handleCopyPlatformText('wechat_moments', '微信朋友圈', 'WeChat', '3:4')}
                  className="px-3 py-2 rounded-lg bg-gold/5 hover:bg-gold/15 border border-gold/20 hover:border-gold/40 text-left transition-all flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-serif font-medium text-[var(--text-primary)] group-hover:text-gold">
                      {T(lang, '微信 / 朋友圈', 'WeChat')}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {T(lang, '複製文案 (3:4 籤卡)', 'Copy caption (3:4)')}
                    </div>
                  </div>
                  <CopyIcon size={12} className="text-gold/70 group-hover:text-gold flex-shrink-0" />
                </button>

                {/* Instagram: Copy IG caption + switch to 9:16 */}
                <button
                  type="button"
                  onClick={() => handleCopyPlatformText('instagram', 'Instagram', 'Instagram', '9:16')}
                  className="px-3 py-2 rounded-lg bg-gold/5 hover:bg-gold/15 border border-gold/20 hover:border-gold/40 text-left transition-all flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-serif font-medium text-[var(--text-primary)] group-hover:text-gold">
                      Instagram
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {T(lang, '複製標籤文案 (9:16)', 'Copy tags (9:16)')}
                    </div>
                  </div>
                  <CopyIcon size={12} className="text-gold/70 group-hover:text-gold flex-shrink-0" />
                </button>

                {/* TikTok / Xiaohongshu: Copy tags + switch to 9:16 */}
                <button
                  type="button"
                  onClick={() => handleCopyPlatformText('tiktok', 'TikTok / 小紅書', 'TikTok', '9:16')}
                  className="px-3 py-2 rounded-lg bg-gold/5 hover:bg-gold/15 border border-gold/20 hover:border-gold/40 text-left transition-all flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-serif font-medium text-[var(--text-primary)] group-hover:text-gold">
                      {T(lang, 'TikTok / 小紅書', 'TikTok')}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {T(lang, '複製話題文案 (9:16)', 'Copy caption (9:16)')}
                    </div>
                  </div>
                  <CopyIcon size={12} className="text-gold/70 group-hover:text-gold flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionDrawer>
    </div>
  )
}
