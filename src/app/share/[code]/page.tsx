'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import Link from 'next/link'

export default function SharePage() {
  const { code } = useParams<{ code: string }>()
  const { data: session } = useSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [bonus1, setBonus1] = useState(20)
  const [bonus2, setBonus2] = useState(0)

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/share/${code}` 
    : `/share/${code}`

  // Generate styled QR code
  useEffect(() => {
    if (!canvasRef.current || !code) return
    const canvas = canvasRef.current
    
    QRCode.toCanvas(canvas, shareUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#d4a853', light: '#0a0f1e' },
      errorCorrectionLevel: 'H',
    }, (err) => {
      if (err) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const size = 40
      const x = (canvas.width - size) / 2
      const y = (canvas.height - size) / 2
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
  }, [code, shareUrl])

  useEffect(() => {
    fetch('/api/share/bonus')
      .then(r => r.json())
      .then(data => {
        if (data.model1) setBonus1(data.model1)
        if (data.model2) setBonus2(data.model2)
      })
      .catch(() => {})
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('已複製 / Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareButtons = [
    { name: 'WeChat', icon: '💬', action: () => { copyLink(); toast('已複製連結，請貼到微信 / Link copied, paste in WeChat') } },
    { name: 'WhatsApp', icon: '📱', action: () => window.open(`https://wa.me/?text=${encodeURIComponent('玄機 - 中國傳統占卜 ' + shareUrl)}`) },
    { name: 'Telegram', icon: '✈️', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('玄機 - Chinese Divination')}`) },
    { name: 'Twitter/X', icon: '🐦', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('玄機 - 中國傳統占卜 ' + shareUrl)}`) },
  ]

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
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

          {/* Share buttons */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {shareButtons.map(btn => (
              <button
                key={btn.name}
                onClick={btn.action}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-xl">{btn.icon}</span>
                <span className="text-white/40 text-[10px]">{btn.name}</span>
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gold/20" />
            <span className="text-gold/50 text-xs">✨</span>
            <div className="flex-1 h-px bg-gold/20" />
          </div>

          {session ? (
            <div className="space-y-3">
              <div className="py-3 px-6 bg-gold/5 border border-gold/20 rounded-xl text-white/60 text-sm">
                分享此連結給朋友，對方註冊後雙方自動獲得獎勵
                <br />
                <span className="text-white/40 text-xs">Share this link — both of you earn bonus credits when they register</span>
              </div>
              <Link
                href="/divination"
                className="block w-full py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors text-center"
              >
                🔮 開始占卜 / Start Divination
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href={`/register?ref=${code}`}
                className="block w-full py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors text-center"
              >
                🎁 註冊領取獎勵 / Register & Get Bonus
              </Link>
              <Link
                href="/login"
                className="block w-full py-2 border border-gold/30 text-gold rounded-xl text-sm hover:bg-gold/10 transition-colors text-center"
              >
                已有帳號？登入 / Already have an account?
              </Link>
            </div>
          )}

          {/* Bonus info */}
          <div className="mt-4 py-3 px-4 rounded-lg bg-gold/5 border border-gold/10">
            <p className="text-gold/80 text-xs font-medium mb-1.5">🎁 分享獎勵 / Share Rewards</p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="text-white/60">⚡ 標準模型 ×{bonus1}</span>
              {bonus2 > 0 && <span className="text-white/60">🌟 高級模型 ×{bonus2}</span>}
            </div>
            <p className="text-white/30 text-[10px] mt-1.5">
              註冊即自動到帳，雙方各得獎勵 / Auto-credited on registration, both parties rewarded
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
