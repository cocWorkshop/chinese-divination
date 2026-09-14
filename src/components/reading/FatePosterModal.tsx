'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/i18n'
import {
  POSTER_RATIOS,
  type PosterRatio,
  type SocialPlatform,
  buildLineShareUrl,
  generateSocialCopy,
  canWebShare,
  triggerNativeShare,
} from '@/lib/share/socialShare'
import { CloseIcon, SparkleIcon, ScrollIcon } from '@/components/DivinationIcons'

export interface FatePosterModalProps {
  isOpen: boolean
  onClose: () => void
  readingId: string
  shareToken?: string | null
  divinationType: string
  subjectName?: string | null
  result?: string | null
  lang?: string
}

import { typeMap, getPosterConfig } from './fatePosterConfig'
export { typeMap, getPosterConfig }


export default function FatePosterModal({
  isOpen,
  onClose,
  readingId,
  shareToken,
  divinationType,
  subjectName,
  result,
  lang = 'zh-TW',
}: FatePosterModalProps) {
  const isZh = lang !== 'en'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ratio, setRatio] = useState<PosterRatio>('3:4')
  const [activeTab, setActiveTab] = useState<'poster' | 'platforms'>('poster')
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [hasNativeShare, setHasNativeShare] = useState(false)

  const info = useMemo(() => getPosterConfig(divinationType), [divinationType])

  // Derive a clean excerpt from result
  const cleanSummary = (() => {
    if (!result) {
      return isZh
        ? '古法智慧推演，洞析天時地利，指引前程明路。'
        : 'Classical divination wisdom illuminating current pathways.'
    }
    const plain = result.replace(/[#*`_\[\]()\-]/g, ' ').replace(/\s+/g, ' ').trim()
    return plain.slice(0, ratio === '9:16' ? 140 : 96) + '...'
  })()

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${shareToken || readingId}`
    : `https://chinese-divination.com/r/${readingId}`

  // Check Web Share API capability
  useEffect(() => {
    setHasNativeShare(canWebShare())
  }, [])

  // Generate QR Code data URL
  useEffect(() => {
    if (!isOpen) return
    QRCode.toDataURL(shareUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#d4a853', light: '#0a0f1e' },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {})
  }, [isOpen, shareUrl])

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
        // Little interior accent
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
      ctx.fillText(isZh ? '【 玄 機 靈 籤 】' : '【 XUANJI ORACLE 】', width / 2, topTitleY)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.font = '22px sans-serif'
      ctx.fillText(
        isZh ? `歲次丙午 · ${info.zh}推演` : `Solar Cycle · ${info.en}`,
        width / 2,
        subtitleY
      )

      if (subjectName) {
        ctx.fillStyle = 'rgba(212, 168, 83, 0.85)'
        ctx.font = '23px "Noto Serif SC", serif'
        ctx.fillText(`${isZh ? '命主：' : 'Subject: '}${subjectName}`, width / 2, subjectY)
      }

      // 4. Central Motto Box
      const mottoBoxW = width - 260
      const mottoBoxX = 130
      ctx.fillStyle = 'rgba(17, 29, 53, 0.75)'
      ctx.fillRect(mottoBoxX, mottoBoxY, mottoBoxW, mottoBoxH)
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(mottoBoxX, mottoBoxY, mottoBoxW, mottoBoxH)

      // Inner subtle border
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
      const pills = isZh
        ? ['吉曜照臨', '守正待時', '逢生化煞']
        : ['Auspicious Timing', 'Cultivate & Wait', 'Balance Restored']
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
      ctx.rotate(-0.06) // subtle aesthetic tilt
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
      ctx.fillText(isZh ? '古法智慧 · 當代精算' : 'Ancient Wisdom, Modern Clarity', 310, footerY + 24)

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
    [cleanSummary, info, isZh, qrDataUrl, subjectName]
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
    if (!isOpen || !qrDataUrl) return
    let active = true
    renderCanvas(ratio)
      .then((canvas) => {
        if (active) setPreviewDataUrl(canvas.toDataURL('image/png'))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isOpen, qrDataUrl, ratio, renderCanvas])

  // Download high-resolution PNG
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await generateBlob(ratio)
      if (!blob) throw new Error('Blob generation failed')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ratioTag = ratio === '9:16' ? 'story' : 'card'
      a.download = `xuanji-fate-${divinationType}-${ratioTag}-${readingId.slice(0, 6)}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(
        isZh ? `已保存 ${POSTER_RATIOS[ratio].nameZh}！` : `Saved ${POSTER_RATIOS[ratio].nameEn}!`
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
      const blob = await generateBlob(ratio)
      if (!blob) throw new Error('Blob creation failed')

      const file = new File(
        [blob],
        `xuanji-fate-${divinationType}-${readingId.slice(0, 6)}.png`,
        { type: 'image/png' }
      )

      const success = await triggerNativeShare({
        title: isZh ? `【玄機靈籤】${info.zh}推演` : `【Xuanji Oracle】${info.en}`,
        text: `${info.motto}\n${isZh ? '古法智慧推演，洞析天時地利' : 'Ancient Metaphysics'}`,
        url: shareUrl,
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
  const handleLineShare = () => {
    const lineUrl = buildLineShareUrl({
      title: isZh ? `【玄機靈籤 · ${info.zh}】` : `【Xuanji Oracle · ${info.en}】`,
      motto: info.motto,
      url: shareUrl,
    })
    window.open(lineUrl, '_blank', 'noopener,noreferrer')
    toast.success(isZh ? '已開啟 Line 分享' : 'Opened Line share')
  }

  // Copy platform-tailored copywriting
  const handleCopyPlatformText = (platform: SocialPlatform, labelZh: string, labelEn: string) => {
    const text = generateSocialCopy(platform, {
      typeZh: info.zh,
      typeEn: info.en,
      motto: info.motto,
      summary: cleanSummary,
      subjectName,
      shareUrl,
      lang,
    })
    navigator.clipboard.writeText(text).then(() => {
      toast.success(
        isZh ? `已複製${labelZh}專屬文案與連結！` : `Copied ${labelEn} copy & link!`
      )
    })
  }

  // Copy plain share URL
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success(T(lang, '分享連結已複製', 'Share link copied'))
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="card-mystic-featured max-w-sm sm:max-w-lg w-full p-4 sm:p-6 text-center relative border border-gold/30 my-6 max-h-[92vh] flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 z-10"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>

          {/* Header */}
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70 mb-0.5">
            {isZh ? '東方命理 · 多端社交分享' : 'Oriental Fate Card & Social Share'}
          </p>
          <h3 className="font-serif text-lg sm:text-xl text-gold-light font-medium mb-3">
            {isZh ? '專屬命理靈籤分享卡' : 'Your Personal Fate Card'}
          </h3>

          {/* Ratio & Mode Selector Bar */}
          <div className="flex items-center justify-between gap-2 p-1 bg-[var(--accent-bg)] rounded-xl border border-gold/20 mb-3 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRatio('3:4')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer ${
                  ratio === '3:4'
                    ? 'bg-gold text-navy-950 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{isZh ? '3:4 經典卡片' : '3:4 Classic'}</span>
              </button>
              <button
                onClick={() => setRatio('9:16')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer ${
                  ratio === '9:16'
                    ? 'bg-gold text-navy-950 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{isZh ? '9:16 沉浸快拍' : '9:16 Story'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('poster')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'poster' ? 'bg-gold/20 text-gold font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {isZh ? '籤卡預覽' : 'Card'}
              </button>
              <button
                onClick={() => setActiveTab('platforms')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'platforms' ? 'bg-gold/20 text-gold font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {isZh ? '社交專區' : 'Platforms'}
              </button>
            </div>
          </div>

          {/* Sub-label explaining ratio fit */}
          <p className="text-[11px] text-[var(--text-muted)] mb-3 text-left px-1">
            {isZh ? POSTER_RATIOS[ratio].recommendedForZh : POSTER_RATIOS[ratio].recommendedForEn}
          </p>

          {/* Scrollable Main Content Area */}
          <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar mb-4">
            {activeTab === 'poster' ? (
              <div>
                {/* Visual Poster Preview with Live Rendered Image for Mobile Long-Press */}
                <div
                  className={`rounded-xl border border-gold/25 bg-navy-950 relative overflow-hidden shadow-inner mx-auto flex items-center justify-center ${
                    ratio === '9:16' ? 'max-w-[260px] aspect-[9/16]' : 'max-w-[320px] aspect-[3/4]'
                  }`}
                >
                  {previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewDataUrl}
                      alt="Xuanji Fate Poster"
                      className="w-full h-full object-contain rounded-xl select-none"
                    />
                  ) : (
                    <div className="p-6 text-center text-gold/60 text-xs animate-pulse">
                      {isZh ? '正在繪製靈籤...' : 'Painting oracle card...'}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[var(--text-muted)] mt-2">
                  {isZh
                    ? '手機端可直接「長按上方籤卡」保存至系統相簿'
                    : 'On mobile, long-press card to save directly to photos'}
                </p>
              </div>
            ) : (
              /* Social Platforms Quick Actions */
              <div className="flex flex-col gap-3 text-left">
                {/* 1. Line Section */}
                <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-emerald-500/25 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#06C755] flex items-center justify-center text-white font-bold text-[10px]">
                        L
                      </span>
                      <span className="text-xs font-medium text-[var(--text-primary)]">Line</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80">{isZh ? '一鍵發送' : '1-Tap Share'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {isZh ? '直接呼起 Line App，將命理籤文與連結分享給好友或群組' : 'Directly launch Line with prefilled fortune message'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLineShare}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>{isZh ? '開啟 Line 分享' : 'Share to Line'}</span>
                    </button>
                    <button
                      onClick={() => handleCopyPlatformText('line', 'Line', 'Line')}
                      className="py-1.5 px-3 rounded-lg border border-gold/20 hover:border-gold/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-all cursor-pointer inline-flex items-center justify-center"
                      title={isZh ? '複製 Line 專屬文案' : 'Copy Line Text'}
                    >
                      <ScrollIcon size={14} />
                    </button>
                  </div>
                </div>

                {/* 2. WeChat Section */}
                <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-green-500/25 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#07C160] flex items-center justify-center text-white font-bold text-[10px]">
                        微
                      </span>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{isZh ? '微信 (聊天 / 朋友圈)' : 'WeChat'}</span>
                    </div>
                    <span className="text-[10px] text-green-400/80">{isZh ? '推薦 3:4' : '3:4 Recommended'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {isZh ? '微信朋友圈推薦保存 3:4 高清海報配搭文案發布' : 'Save 3:4 poster & copy poetic caption for Moments'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setRatio('3:4')
                        handleDownload()
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-600 dark:text-green-200 text-xs font-medium transition-all text-center cursor-pointer"
                    >
                      {isZh ? '保存朋友圈海報' : 'Save Moments Card'}
                    </button>
                    <button
                      onClick={() => handleCopyPlatformText('wechat_moments', '朋友圈', 'Moments')}
                      className="py-1.5 px-2.5 rounded-lg border border-gold/20 hover:border-gold/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-all text-center cursor-pointer"
                    >
                      {isZh ? '複製朋友圈文案' : 'Copy Moments Copy'}
                    </button>
                  </div>
                </div>

                {/* 3. Instagram Section */}
                <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-pink-500/25 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-bold text-[10px]">
                        IG
                      </span>
                      <span className="text-xs font-medium text-[var(--text-primary)]">Instagram</span>
                    </div>
                    <span className="text-[10px] text-pink-400/80">{isZh ? '推薦 9:16 快拍' : '9:16 Stories'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {isZh ? '適配 9:16 沉浸長圖，可直接分享至 IG Stories 或貼文' : 'Optimized 9:16 vertical format for Stories & Reels'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setRatio('9:16')
                        handleDownload()
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-pink-600/20 border border-pink-500/30 hover:bg-pink-600/30 text-pink-600 dark:text-pink-200 text-xs font-medium transition-all text-center cursor-pointer"
                    >
                      {isZh ? '保存快拍 (9:16)' : 'Save Story (9:16)'}
                    </button>
                    <button
                      onClick={() => handleCopyPlatformText('instagram', 'Instagram', 'Instagram')}
                      className="py-1.5 px-2.5 rounded-lg border border-gold/20 hover:border-gold/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-all text-center cursor-pointer"
                    >
                      {isZh ? '複製 IG 標籤文案' : 'Copy IG Tags'}
                    </button>
                  </div>
                </div>

                {/* 4. TikTok Section */}
                <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-sky-500/25 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center text-white font-bold text-[10px]">
                        TT
                      </span>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{isZh ? 'TikTok / 抖音' : 'TikTok'}</span>
                    </div>
                    <span className="text-[10px] text-sky-400/80">{isZh ? '圖文模式' : 'Photo Mode'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {isZh ? '適用於 TikTok 圖文模式及短影音封面' : 'Suitable for TikTok Photo Mode and short video covers'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setRatio('9:16')
                        handleDownload()
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-sky-600/20 border border-sky-500/30 hover:bg-sky-600/30 text-sky-600 dark:text-sky-200 text-xs font-medium transition-all text-center cursor-pointer"
                    >
                      {isZh ? '保存圖文 (9:16)' : 'Save Photo (9:16)'}
                    </button>
                    <button
                      onClick={() => handleCopyPlatformText('tiktok', 'TikTok', 'TikTok')}
                      className="py-1.5 px-2.5 rounded-lg border border-gold/20 hover:border-gold/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-all text-center cursor-pointer"
                    >
                      # {isZh ? '複製熱門標籤' : 'Copy Trending Tags'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gold/15">
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gold text-navy-950 font-medium text-xs sm:text-sm hover:bg-gold-light transition-all shadow-md shadow-gold/10 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {downloading
                    ? isZh
                      ? '繪製中...'
                      : 'Rendering...'
                    : isZh
                    ? `下載 ${POSTER_RATIOS[ratio].nameZh}`
                    : `Download ${POSTER_RATIOS[ratio].nameEn}`}
                </span>
              </button>

              {hasNativeShare && (
                <button
                  onClick={handleNativeShare}
                  disabled={sharing}
                  className="py-2.5 px-3.5 rounded-xl bg-gold/15 border border-gold/30 hover:bg-gold/25 text-gold text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title={isZh ? '調用手機系統分享面板' : 'Trigger system share sheet'}
                >
                  <SparkleIcon size={14} className="text-gold" />
                  <span className="hidden sm:inline">{isZh ? '系統分享' : 'Share'}</span>
                </button>
              )}
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-xl border border-gold/20 hover:border-gold/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ScrollIcon size={14} className="text-gold" />
              <span>{isZh ? '複製專屬命理分享連結' : 'Copy Public Share Link'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
