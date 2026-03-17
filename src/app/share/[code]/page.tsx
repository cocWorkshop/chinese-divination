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
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bonus, setBonus] = useState(20)

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
      color: {
        dark: '#d4a853',
        light: '#0a0f1e',
      },
      errorCorrectionLevel: 'H',
    }, (err) => {
      if (err) return
      // Draw ☯ logo in center
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const size = 40
      const x = (canvas.width - size) / 2
      const y = (canvas.height - size) / 2
      // Background circle
      ctx.fillStyle = '#0a0f1e'
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2)
      ctx.fill()
      // ☯ symbol
      ctx.fillStyle = '#d4a853'
      ctx.font = `${size}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('☯', x + size / 2, y + size / 2 + 2)
    })
  }, [code, shareUrl])

  // Fetch bonus amount
  useEffect(() => {
    fetch('/api/admin/settings')
      .catch(() => {})
  }, [])

  const handleClaim = async () => {
    if (!session) {
      toast.error('请先登录 / Please login first')
      return
    }
    setClaiming(true)
    try {
      const res = await fetch('/api/share/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok) {
        setClaimed(true)
        setBonus(data.bonusReceived)
        toast.success(`🎁 获得 ${data.bonusReceived} 次额外占卜！`)
      } else {
        if (res.status === 409) setClaimed(true)
        toast.error(data.error || 'Failed')
      }
    } catch {
      toast.error('Network error')
    }
    setClaiming(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('已复制 / Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareButtons = [
    { name: 'WeChat', icon: '💬', action: () => { copyLink(); toast('已复制链接，请粘贴到微信 / Link copied, paste in WeChat') } },
    { name: 'WhatsApp', icon: '📱', action: () => window.open(`https://wa.me/?text=${encodeURIComponent('玄机 - 中国传统占卜 ' + shareUrl)}`) },
    { name: 'Telegram', icon: '✈️', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('玄机 - Chinese Divination')}`) },
    { name: 'Twitter/X', icon: '🐦', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('玄机 - 中国传统占卜 ' + shareUrl)}`) },
  ]

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Main card */}
        <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
          {/* Decorative border */}
          <div className="absolute inset-0 rounded-2xl border-2 border-gold/30 pointer-events-none" />
          <div className="absolute top-2 left-2 right-2 bottom-2 rounded-xl border border-gold/10 pointer-events-none" />

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-serif text-gold mb-1">玄机 · 分享</h1>
            <p className="text-white/50 text-sm">Share & Earn Credits</p>
          </div>

          {/* QR Code */}
          <div className="inline-block p-4 rounded-xl border border-gold/20 bg-[#0a0f1e] mb-6">
            <canvas ref={canvasRef} className="block mx-auto" />
          </div>

          {/* Share URL */}
          <div className="mb-6">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-gold/60">🔗</span>
              <code className="text-white/60 text-xs break-all">{shareUrl}</code>
            </div>
            <button
              onClick={copyLink}
              className="mt-2 px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm hover:bg-gold/20 transition-colors"
            >
              {copied ? '✓ 已复制' : '📋 复制链接 / Copy'}
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

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gold/20" />
            <span className="text-gold/50 text-xs">领取奖励 / Claim Bonus</span>
            <div className="flex-1 h-px bg-gold/20" />
          </div>

          {/* Claim button */}
          {session ? (
            claimed ? (
              <div className="py-3 px-6 bg-jade/10 border border-jade/30 rounded-xl text-jade text-sm">
                ✓ 已领取 {bonus} 次额外占卜 / Claimed {bonus} bonus readings
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {claiming ? '领取中...' : `🎁 领取 ${bonus} 次免费占卜`}
              </button>
            )
          ) : (
            <Link
              href="/login"
              className="block w-full py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors text-center"
            >
              登录后领取奖励 / Login to Claim
            </Link>
          )}

          {/* Info text */}
          <p className="text-white/30 text-xs mt-4">
            分享者和接受者各获得标准模型额外次数<br/>
            Both sharer and claimer earn bonus standard credits
          </p>
        </div>
      </div>
    </div>
  )
}
