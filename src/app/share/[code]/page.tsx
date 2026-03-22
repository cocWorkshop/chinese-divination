'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import YinYangIcon from '@/components/YinYangIcon'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import Link from 'next/link'
import { catchAndReport } from '@/lib/errorReporter'

export default function SharePage() {
  const { code } = useParams<{ code: string }>()
  const { data: session, status } = useSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [bonus1, setBonus1] = useState(20)
  const [bonusChat, setBonusChat] = useState(5)

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/share/${code}` 
    : `/share/${code}`

  useEffect(() => {
    fetch('/api/share/bonus')
      .then(r => r.json())
      .then(data => {
        if (data.divination) setBonus1(data.divination)
        if (data.chat) setBonusChat(data.chat)
      })
      .catch(catchAndReport('/api/share'))
  }, [])

  // QR code for logged-in share management view
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
      const size = 40, x = (canvas.width - size) / 2, y = (canvas.height - size) / 2
      ctx.fillStyle = '#0a0f1e'
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#d4a853'
      ctx.font = `${size}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('☯', x + size / 2, y + size / 2 + 2)
    })
  }, [code, shareUrl, session])

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('已複製 / Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareButtons = [
    { name: 'WeChat', icon: '💬', action: () => { copyLink(); toast('已複製連結，請貼到微信') } },
    { name: 'WhatsApp', icon: '📱', action: () => window.open(`https://wa.me/?text=${encodeURIComponent('玄機 - 中國傳統占卜 ' + shareUrl)}`) },
    { name: 'Telegram', icon: '✈️', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('玄機 - Chinese Divination')}`) },
    { name: 'Twitter/X', icon: '🐦', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('玄機 - 中國傳統占卜 ' + shareUrl)}`) },
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
            <h1 className="text-3xl font-serif text-gold mb-2">玄機</h1>
            <p className="text-white/60 text-sm mb-1">古法智慧，現代傳承</p>
            <p className="text-white/40 text-xs">Ancient Wisdom, Modern Heritage</p>

            <div className="my-6 h-px bg-gold/20" />

            <p className="text-white/70 text-sm leading-relaxed mb-2">
              您的朋友邀請您體驗<span className="text-gold">玄機</span> — 融合千年命理智慧與現代 AI 的占卜平台。
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Your friend invites you to try <span className="text-gold">Xuanji</span> — a divination platform combining ancient Chinese wisdom with modern AI.
            </p>
          </div>

          {/* Bonus reward card */}
          <div className="glass-card rounded-2xl p-6 text-center border border-gold/20">
            <div className="text-2xl mb-3">🎁</div>
            <h2 className="text-lg font-serif text-gold mb-3">註冊即獲永久額度</h2>
            <p className="text-white/50 text-xs mb-4">Register now and receive permanent credits</p>
            
            <div className="flex justify-center gap-4 mb-4">
              <div className="px-4 py-3 rounded-xl bg-gold/10 border border-gold/20">
                <div className="text-2xl font-bold text-gold">{bonus1}</div>
                <div className="text-white/50 text-xs mt-1">🔮 占卜額度</div>
                <div className="text-white/30 text-[10px]">Divination Credits</div>
              </div>
              <div className="px-4 py-3 rounded-xl bg-gold/10 border border-gold/20">
                <div className="text-2xl font-bold text-gold">{bonusChat}</div>
                <div className="text-white/50 text-xs mt-1">💬 聊天額度</div>
                <div className="text-white/30 text-[10px]">Chat Credits</div>
              </div>
            </div>

            <p className="text-white/30 text-xs">
              註冊後永久額度自動到帳 · Permanent credits auto-granted upon registration
            </p>
          </div>

          {/* Divination types preview */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-serif text-gold mb-3 text-center">七大占卜 · Seven Divination Arts</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: '🏛', zh: '八字', en: 'BaZi' },
                { icon: '☰', zh: '易經', en: 'I Ching' },
                { icon: '⭐', zh: '紫微', en: 'Zi Wei' },
                { icon: '🧭', zh: '奇門', en: 'Qi Men' },
                { icon: '🏠', zh: '風水', en: 'Feng Shui' },
                { icon: '🌸', zh: '梅花', en: 'Meihua' },
                { icon: '🎲', zh: '六爻', en: 'Liu Yao' },
              ].map(d => (
                <div key={d.en} className="py-2 px-1 rounded-lg bg-white/5">
                  <div className="text-lg">{d.icon}</div>
                  <div className="text-white/70 text-xs">{d.zh}</div>
                  <div className="text-white/30 text-[10px]">{d.en}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons - same as result share page */}
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-white/60 text-sm mb-4">
              ✨ 立即註冊，開啟您的命理之旅
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href={`/register?ref=${code}`}
                className="px-6 py-2.5 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors"
              >
                🎁 免費註冊
              </Link>
              <Link
                href="/divination"
                className="px-6 py-2.5 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors"
              >
                🔮 立即體驗
              </Link>
            </div>
          </div>

          {/* Footer branding */}
          <div className="text-center text-white/20 text-xs">
            <Link href="/" className="hover:text-gold/50 transition-colors">
              玄機 · Xuanji — 古法智慧，現代傳承
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
            <h1 className="text-3xl font-serif text-gold mb-1">玄機 · 分享</h1>
            <p className="text-white/50 text-sm">Share & Earn Credits</p>
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
              {copied ? '✓ 已複製' : '📋 複製連結 / Copy'}
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
            分享此連結給朋友，對方註冊後雙方自動獲得永久額度
            <br />
            <span className="text-white/40 text-xs">Share this link — both of you earn permanent credits when they register</span>
          </div>

          <div className="mt-4 py-3 px-4 rounded-lg bg-gold/5 border border-gold/10">
            <p className="text-gold/80 text-xs font-medium mb-1.5">🎁 分享永久額度</p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="text-white/60">🔮 占卜 ×{bonus1}</span>
              <span className="text-white/60">💬 聊天 ×{bonusChat}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
