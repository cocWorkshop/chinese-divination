'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '@/lib/i18n'

interface FatePosterModalProps {
  isOpen: boolean
  onClose: () => void
  readingId: string
  shareToken?: string | null
  divinationType: string
  subjectName?: string | null
  result?: string | null
  lang?: string
}

const typeMap: Record<string, { zh: string; en: string; motto: string }> = {
  bazi: { zh: '四柱命局', en: 'Four Pillars Chart', motto: '逢凶化吉 · 貴人照臨' },
  ziwei: { zh: '紫微斗數', en: 'Zi Wei Constellation', motto: '洞見星機 · 趨吉避凶' },
  liuyao: { zh: '六爻神課', en: 'Liu Yao Oracle', motto: '動靜相生 · 先機在握' },
  meihua: { zh: '梅花易數', en: 'Plum Blossom Numerology', motto: '萬物皆數 · 體用相合' },
  qimen: { zh: '奇門遁甲', en: 'Qi Men Strategy', motto: '急則從神 · 緩則從門' },
  fengshui: { zh: '風水宅運', en: 'Feng Shui Harmony', motto: '藏風聚氣 · 宅運亨通' },
  iching: { zh: '易經象數', en: 'I Ching Hexagram', motto: '自強不息 · 順天應人' },
}

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
  const [downloading, setDownloading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const info = typeMap[divinationType] || {
    zh: '東方命理',
    en: 'Chinese Divination',
    motto: '天道酬勤 · 順應時機',
  }

  // Derive an excerpt from result if available
  const cleanSummary = (() => {
    if (!result) return isZh ? '古法智慧推演，洞析天時地利，指引前程明路。' : 'Classical divination wisdom illuminating current pathways.'
    // Strip markdown chars and grab first 80-100 chars
    const plain = result.replace(/[#*`_\[\]()\-]/g, ' ').replace(/\s+/g, ' ').trim()
    return plain.slice(0, 88) + '...'
  })()

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${shareToken || readingId}`
    : `https://chinese-divination.com/r/${readingId}`

  useEffect(() => {
    if (!isOpen) return
    QRCode.toDataURL(shareUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#d4a853', light: '#0a0f1e' },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {})
  }, [isOpen, shareUrl])

  // Draw full-resolution 1080 x 1440 image to canvas for crisp download
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1440
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      // 1. Background
      ctx.fillStyle = '#0a0f1e'
      ctx.fillRect(0, 0, 1080, 1440)

      // Gradient radial mist in center
      const radial = ctx.createRadialGradient(540, 600, 50, 540, 600, 600)
      radial.addColorStop(0, 'rgba(212, 168, 83, 0.08)')
      radial.addColorStop(0.6, 'rgba(17, 29, 53, 0.4)')
      radial.addColorStop(1, 'rgba(10, 15, 30, 0)')
      ctx.fillStyle = radial
      ctx.fillRect(0, 0, 1080, 1440)

      // 2. Outer decorative gold borders
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.35)'
      ctx.lineWidth = 3
      ctx.strokeRect(40, 40, 1000, 1360)

      ctx.strokeStyle = 'rgba(212, 168, 83, 0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(55, 55, 970, 1330)

      // Corner ornaments (traditional cloud corners)
      const drawCorner = (x: number, y: number, rot: number) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rot)
        ctx.strokeStyle = '#d4a853'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(0, 25)
        ctx.lineTo(0, 0)
        ctx.lineTo(25, 0)
        ctx.stroke()
        ctx.restore()
      }
      drawCorner(65, 65, 0)
      drawCorner(1015, 65, Math.PI / 2)
      drawCorner(1015, 1375, Math.PI)
      drawCorner(65, 1375, -Math.PI / 2)

      // 3. Header title & year
      ctx.textAlign = 'center'
      ctx.fillStyle = '#d4a853'
      ctx.font = '32px "Noto Serif SC", serif'
      ctx.fillText(isZh ? '【 玄 機 靈 籤 】' : '【 XUANJI ORACLE 】', 540, 140)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = '22px sans-serif'
      ctx.fillText(
        isZh ? `歲次丙午 · ${info.zh}推演` : `Solar Year · ${info.en}`,
        540,
        185
      )

      if (subjectName) {
        ctx.fillStyle = 'rgba(212, 168, 83, 0.8)'
        ctx.font = '24px "Noto Serif SC", serif'
        ctx.fillText(`${isZh ? '命主：' : 'Subject: '}${subjectName}`, 540, 240)
      }

      // 4. Central Motto Box
      const boxY = 320
      ctx.fillStyle = 'rgba(17, 29, 53, 0.7)'
      ctx.fillRect(140, boxY, 800, 140)
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.45)'
      ctx.lineWidth = 2
      ctx.strokeRect(140, boxY, 800, 140)

      ctx.fillStyle = '#fce8a6'
      ctx.font = 'bold 44px "Noto Serif SC", serif'
      ctx.fillText(info.motto, 540, boxY + 85)

      // 5. Core Reading Prose
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.font = '30px "Noto Serif SC", serif'
      ctx.textAlign = 'left'

      // Wrap text in canvas
      const maxLineWidth = 800
      const startX = 140
      let cursorY = 540
      const words = cleanSummary.split('')
      let line = ''
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i]
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxLineWidth && i > 0) {
          ctx.fillText(line, startX, cursorY)
          line = words[i]
          cursorY += 52
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, startX, cursorY)

      // 6. Three Attribute Badges
      const pills = isZh
        ? ['⭐ 吉曜照臨', '🌿 宜守正待時', '⚖️ 逢生化煞']
        : ['⭐ Auspicious Timing', '🌿 Patient Cultivation', '⚖️ Harmony Achieved']
      const pillY = cursorY + 110
      ctx.textAlign = 'center'
      pills.forEach((pill, i) => {
        const px = 270 + i * 270
        ctx.fillStyle = 'rgba(212, 168, 83, 0.12)'
        ctx.fillRect(px - 110, pillY - 30, 220, 52)
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.3)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(px - 110, pillY - 30, 220, 52)
        ctx.fillStyle = '#e8c278'
        ctx.font = '24px "Noto Serif SC", serif'
        ctx.fillText(pill, px, pillY + 6)
      })

      // 7. Divider Line
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(140, 1140)
      ctx.lineTo(940, 1140)
      ctx.stroke()

      // 8. Footer Vermillion Seal (Left)
      ctx.save()
      ctx.translate(220, 1240)
      ctx.rotate(-0.06) // subtle oriental tilt
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

      // Attribution
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(212, 168, 83, 0.7)'
      ctx.font = '24px "Noto Serif SC", serif'
      ctx.fillText('玄機 · XuanJi', 320, 1230)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.font = '20px sans-serif'
      ctx.fillText(isZh ? '古法智慧 · 當代精算' : 'Ancient Metaphysics, Modern Clarity', 320, 1265)

      // 9. QR Code (Right)
      if (qrDataUrl) {
        const img = new Image()
        img.src = qrDataUrl
        await new Promise((res) => {
          img.onload = res
          img.onerror = res
        })
        ctx.drawImage(img, 820, 1180, 120, 120)
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `xuanji-fate-${divinationType}-${readingId.slice(0, 6)}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(T(lang, '命理籤卡已保存！', 'Fortune card saved!'))
      }, 'image/png')
    } catch (e) {
      console.error('Failed to generate poster:', e)
      toast.error(T(lang, '生成失敗，請重試', 'Generation failed, please retry'))
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success(T(lang, '分享連結已複製', 'Share link copied'))
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="card-mystic-featured max-w-sm sm:max-w-md w-full p-6 text-center relative border border-gold/30 my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>

          <p className="text-xs uppercase tracking-[0.2em] text-gold/70 mb-1">
            {isZh ? '東方命理 · 典藏籤卡' : 'Oriental Fate Poster'}
          </p>
          <h3 className="font-serif text-xl text-gold-light font-medium mb-4">
            {isZh ? '專屬命理箴言卡' : 'Your Personal Fate Card'}
          </h3>

          {/* Miniature Poster Preview */}
          <div className="rounded-xl border border-gold/20 bg-navy-950 p-5 text-left relative overflow-hidden shadow-inner mb-6">
            {/* Corner motifs */}
            <div className="absolute top-2.5 left-2.5 text-gold/40 text-xs">⌜</div>
            <div className="absolute top-2.5 right-2.5 text-gold/40 text-xs">⌝</div>
            <div className="absolute bottom-2.5 left-2.5 text-gold/40 text-xs">⌞</div>
            <div className="absolute bottom-2.5 right-2.5 text-gold/40 text-xs">⌟</div>

            <div className="text-center mb-3">
              <span className="text-[10px] text-gold/60 font-serif tracking-widest block">
                {isZh ? `【 ${info.zh} 】` : `【 ${info.en} 】`}
              </span>
              <p className="font-serif text-lg text-gold-light font-medium mt-1">
                {info.motto}
              </p>
            </div>

            <p className="text-xs text-white/70 font-light leading-relaxed mb-4 line-clamp-3">
              {cleanSummary}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-gold/15 text-[11px] text-white/40">
              <div className="flex items-center gap-2">
                <span className="stamp-vermillion text-[10px] py-0.5 px-1.5">
                  玄機
                </span>
                <span className="font-serif text-gold/70">玄機 · XuanJi</span>
              </div>
              <span className="text-white/30 text-[10px]">
                {isZh ? '掃碼親解' : 'Scan to decode'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 px-4 rounded-xl bg-gold text-navy-950 font-medium text-sm hover:bg-gold-light transition-all shadow-md shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{downloading ? (isZh ? '正在繪製籤卡...' : 'Generating...') : (isZh ? '💾 保存命理籤卡 (高清PNG)' : '💾 Save Poster (PNG)')}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:border-gold/30 text-white/70 hover:text-white transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>📋</span>
              <span>{isZh ? '複製專屬分享連結' : 'Copy Share Link'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
