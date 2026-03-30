'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLang } from '@/components/LanguageContext'
import YinYangIcon from '@/components/YinYangIcon'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import Link from 'next/link'
import { catchAndReport } from '@/lib/errorReporter'

function T(lang: string, zh: React.ReactNode, en: React.ReactNode): React.ReactNode {
  return lang === 'en' ? en : zh
}
const Ts = (lang: string, zh: string, en: string): string => lang === 'en' ? en : zh

export default function SharePage() {
  const { code } = useParams<{ code: string }>()
  const { data: session, status } = useSession()
  const { lang } = useLang()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [bonusCredits, setBonusCredits] = useState(3)
  const [visibleTypes, setVisibleTypes] = useState<string[]>([])

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/share/${code}` 
    : `/share/${code}`

  useEffect(() => {
    fetch('/api/share/bonus')
      .then(r => r.json())
      .then(data => {
        setBonusCredits(data.shareBonus || (data.divination || 0) + (data.chat || 0))
      })
      .catch(catchAndReport('/api/share'))
    fetch('/api/divination/visibility')
      .then(r => r.json())
      .then((data: {type: string, visible: boolean}[]) => setVisibleTypes(data.filter(d => d.visible).map(d => d.type)))
      .catch(catchAndReport('/api/divination/visibility'))
  }, [])

  // QR code with website logo in center
  useEffect(() => {
    if (!canvasRef.current || !code || !session) return
    const canvas = canvasRef.current
    QRCode.toCanvas(canvas, shareUrl, {
      width: 256, margin: 2,
      color: { dark: '#d4a853', light: '#0a0f1e' },
      errorCorrectionLevel: 'H',
    }, (err) => {
      if (err) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // Draw website logo (favicon.svg) in center
      const logoSize = 48
      const x = (canvas.width - logoSize) / 2
      const y = (canvas.height - logoSize) / 2
      // Clear center area with background
      ctx.fillStyle = '#0a0f1e'
      ctx.beginPath()
      ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2)
      ctx.fill()
      // Load and draw the SVG logo
      const img = new Image()
      img.onload = () => {
        ctx.save()
        ctx.beginPath()
        ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, x, y, logoSize, logoSize)
        ctx.restore()
      }
      img.src = '/favicon.svg'
    })
  }, [code, shareUrl, session])

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success(Ts(lang, '已複製連結！', 'Link copied!'))
    setTimeout(() => setCopied(false), 2000)
  }

  const shareButtons = [
    { name: 'WeChat', icon: '💬', action: () => { copyLink(); toast(Ts(lang, '已複製連結，請貼到微信', 'Link copied, paste to WeChat')) } },
    { name: 'WhatsApp', icon: '📱', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(Ts(lang, '玄機 - 中國傳統占卜 ', 'Xuanji - Chinese Divination ') + shareUrl)}`) },
    { name: 'Telegram', icon: '✈️', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(Ts(lang, '玄機 - 中國傳統占卜', 'Xuanji - Chinese Divination'))}`) },
    { name: 'Twitter/X', icon: '🐦', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(Ts(lang, '玄機 - 中國傳統占卜 ', 'Xuanji - Chinese Divination ') + shareUrl)}`) },
  ]

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse"><YinYangIcon size={30} /></div>
      </div>
    )
  }

  // ========== WELCOME LANDING PAGE (not logged in) ==========
  if (!session) {
    return (
      <div className="flex-1 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          {/* Hero */}
          <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl border-2 border-gold/30 pointer-events-none" />
            <div className="absolute top-2 left-2 right-2 bottom-2 rounded-xl border border-gold/10 pointer-events-none" />
            
            <div className="mb-4"><YinYangIcon size={48} /></div>
            <h1 className="text-3xl font-serif text-gold mb-2">
              {T(lang, '玄機', 'Xuanji')}
            </h1>
            <p className="text-white/60 text-sm mb-1">
              {T(lang, '古法智慧，現代傳承', 'Ancient Wisdom, Modern Heritage')}
            </p>

            <div className="my-6 h-px bg-gold/20" />

            <p className="text-white/70 text-sm leading-relaxed mb-2">
              {T(lang,
                <>您的朋友邀請您體驗<span className="text-gold">玄機</span> — 融合千年命理智慧與現代 AI 的占卜平台。</>,
                <>Your friend invites you to try <span className="text-gold">Xuanji</span> — a divination platform that blends thousand-year-old Chinese metaphysical wisdom with modern AI.</>
              )}
            </p>
          </div>

          {/* Bonus reward card */}
          <div className="glass-card rounded-2xl p-6 text-center border border-gold/20">
            <div className="text-2xl mb-3">🎁</div>
            <h2 className="text-lg font-serif text-gold mb-3">
              {T(lang, '註冊即獲永久機緣', 'Register & Get Free Karma')}
            </h2>
            
            <div className="flex justify-center mb-4">
              <div className="px-6 py-3 rounded-xl bg-gold/10 border border-gold/20">
                <div className="text-2xl font-bold text-gold">{bonusCredits}</div>
                <div className="text-white/50 text-xs mt-1">
                  {T(lang, '✨ 機緣點數', '✨ Karma Points')}
                </div>
              </div>
            </div>

            <p className="text-white/30 text-xs">
              {T(lang,
                '註冊後永久機緣自動到帳',
                'Permanent Karma auto-granted upon registration'
              )}
            </p>
          </div>

          {/* Divination types preview */}
          {visibleTypes.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-serif text-gold mb-3 text-center">
              {T(lang,
                visibleTypes.length === 1 ? '占卜' : `${visibleTypes.length}大占卜`,
                visibleTypes.length === 1 ? 'Divination' : `${visibleTypes.length} Divination Arts`
              )}
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { key: 'bazi', icon: '🏛', zh: '八字', en: 'BaZi' },
                { key: 'iching', icon: '☰', zh: '易經', en: 'I Ching' },
                { key: 'ziwei', icon: '⭐', zh: '紫微', en: 'Zi Wei' },
                { key: 'qimen', icon: '🧭', zh: '奇門', en: 'Qi Men' },
                { key: 'fengshui', icon: '🏠', zh: '風水', en: 'Feng Shui' },
                { key: 'meihua', icon: '🌸', zh: '梅花', en: 'Meihua' },
                { key: 'liuyao', icon: '🎲', zh: '六爻', en: 'Liu Yao' },
              ].filter(d => visibleTypes.includes(d.key)).map(d => (
                <div key={d.en} className="py-2 px-1 rounded-lg bg-white/5">
                  <div className="text-lg">{d.icon}</div>
                  <div className="text-white/70 text-xs">{T(lang, d.zh, d.en)}</div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* CTA buttons */}
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-white/60 text-sm mb-4">
              {T(lang,
                '✨ 立即註冊，開啟您的命理之旅',
                '✨ Sign up now and begin your divination journey'
              )}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href={`/register?ref=${code}`}
                className="px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors"
              >
                {T(lang, '🎁 免費註冊', '🎁 Sign Up Free')}
              </Link>
              <Link
                href="/divination"
                className="px-6 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors"
              >
                {T(lang, '🔮 立即體驗', '🔮 Try Now')}
              </Link>
            </div>
          </div>

          {/* Footer branding */}
          <div className="text-center text-white/20 text-xs">
            <Link href="/" className="hover:text-gold/50 transition-colors">
              {T(lang, '玄機 · Xuanji — 古法智慧，現代傳承', 'Xuanji — Ancient Wisdom, Modern Heritage')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ========== SHARE MANAGEMENT PAGE (logged in) ==========
  return (
    <div className="flex-1 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl border-2 border-gold/30 pointer-events-none" />
          <div className="absolute top-2 left-2 right-2 bottom-2 rounded-xl border border-gold/10 pointer-events-none" />

          <div className="mb-6">
            <h1 className="text-3xl font-serif text-gold mb-1">
              {T(lang, '玄機 · 分享', 'Xuanji · Share')}
            </h1>
            <p className="text-white/50 text-sm">
              {T(lang, '分享好運，共得機緣', 'Share & Earn Karma')}
            </p>
          </div>

          <div className="inline-block p-4 rounded-xl border border-gold/20 bg-[#0a0f1e] mb-6">
            <canvas ref={canvasRef} className="block mx-auto" />
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-gold/60">🔗</span>
              <code className="text-white/60 text-xs break-all">{shareUrl}</code>
            </div>
            <button
              onClick={copyLink}
              className="mt-2 px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm hover:bg-gold/20 transition-colors"
            >
              {copied
                ? T(lang, '✓ 已複製', '✓ Copied')
                : T(lang, '📋 複製連結', '📋 Copy Link')
              }
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {shareButtons.map(btn => (
              <button key={btn.name} onClick={btn.action}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-xl">{btn.icon}</span>
                <span className="text-white/40 text-[10px]">{btn.name}</span>
              </button>
            ))}
          </div>

          <div className="py-3 px-6 bg-gold/5 border border-gold/20 rounded-xl text-white/60 text-sm">
            {T(lang,
              '分享此連結給朋友，對方註冊後雙方自動獲得永久機緣',
              'Share this link with friends — both of you earn permanent Karma when they register'
            )}
          </div>

          <div className="mt-4 py-3 px-4 rounded-lg bg-gold/5 border border-gold/10">
            <p className="text-gold/80 text-xs font-medium mb-1.5">
              {T(lang, '🎁 分享永久機緣', '🎁 Referral Karma Bonus')}
            </p>
            <div className="flex justify-center text-xs">
              <span className="text-white/60">
                {T(lang, `✨ 機緣 ×${bonusCredits}`, `✨ Karma ×${bonusCredits}`)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
