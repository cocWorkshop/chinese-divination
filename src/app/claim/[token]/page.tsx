'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import YinYangIcon from '@/components/YinYangIcon'
import MysticalLoader from '@/components/MysticalLoader'
import { useParams } from 'next/navigation'
import { GiftVesselIcon, SparkleIcon, CheckSealIcon, AlertIcon, CloseIcon, SunMoonIcon } from '@/components/DivinationIcons'

type Status = 'loading' | 'ready' | 'claiming' | 'claimed' | 'expired' | 'invalid' | 'not_sent' | 'no_account' | 'error'

interface CompData {
  credits: number
  reason: string
  email: string
}

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<CompData | null>(null)
  const [claimed, setClaimed] = useState<CompData | null>(null)

  useEffect(() => {
    fetch(`/api/claim/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'ready') {
          setData({ ...d, credits: (d.divinationCredits || 0) + (d.chatCredits || 0) })
          setStatus('ready')
        } else if (d.status === 'claimed') {
          setStatus('claimed')
        } else if (d.status === 'expired') {
          setStatus('expired')
        } else if (d.status === 'not_sent') {
          setStatus('not_sent')
        } else {
          setStatus('invalid')
        }
      })
      .catch(() => setStatus('error'))
  }, [token])

  const handleClaim = async () => {
    setStatus('claiming')
    try {
      const res = await fetch(`/api/claim/${token}`, { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        setClaimed({ credits: (d.divinationCredits || 0) + (d.chatCredits || 0), reason: '', email: '' })
        setStatus('claimed')
      } else if (d.error === 'no_account') {
        setStatus('no_account')
      } else {
        setStatus(d.error || 'error')
      }
    } catch {
      setStatus('error')
    }
  }

  // Hide nav on public page
  useEffect(() => {
    const nav = document.querySelector('nav')
    const chat = document.getElementById('chat-widget')
    if (nav) nav.style.display = 'none'
    if (chat) chat.style.display = 'none'
    return () => {
      if (nav) nav.style.display = ''
      if (chat) chat.style.display = ''
    }
  }, [])

  const CreditItem = ({ label, value }: { label: string; value: number }) => {
    if (value <= 0) return null
    return (
      <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-gold/10 border border-gold/20">
        <span className="text-foreground/70 text-sm flex items-center gap-1.5 font-serif">
          <SparkleIcon size={16} className="text-gold" />
          <span>{label}</span>
        </span>
        <span className="text-gold font-serif text-lg font-bold">+{value}</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-screen bg-background">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-3"><YinYangIcon size={48} /></div>
          <h1 className="text-gold font-serif text-2xl">玄機</h1>
          <p className="text-foreground/40 text-xs mt-1 font-serif">Ancient Wisdom, Modern Heritage</p>
        </div>

        <div className="oriental-sanctuary-card rounded-2xl border border-gold/30 overflow-hidden shadow-2xl">

          {/* Loading */}
          {status === 'loading' && (
            <div className="p-12 text-center">
              <MysticalLoader size="md" message="正在載入..." />
            </div>
          )}

          {/* Ready to claim */}
          {status === 'ready' && data && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3">
                  <GiftVesselIcon size={28} className="text-gold animate-bounce" />
                </div>
                <h2 className="text-foreground/90 text-lg font-serif mb-1">補償機緣</h2>
                <p className="text-foreground/50 text-sm font-serif">以下機緣已為您準備：</p>
              </div>

              <div className="space-y-2.5 mb-6">
                <CreditItem label="機緣" value={data.credits} />
              </div>

              {data.reason && (
                <p className="text-foreground/40 text-xs text-center mb-6 italic font-serif">
                  原因：{data.reason}
                </p>
              )}

              <button
                onClick={handleClaim}
                className="w-full min-h-[48px] py-3.5 rounded-xl font-serif font-bold text-sm tracking-wide transition-all bg-gold hover:bg-gold-light text-navy-950 shadow-md inline-flex items-center justify-center gap-2"
              >
                <GiftVesselIcon size={18} />
                <span>立即領取</span>
              </button>

              <p className="text-foreground/30 text-[11px] text-center mt-4">
                機緣將立即發放至您的帳戶（{data.email}）
              </p>
            </div>
          )}

          {/* Claiming */}
          {status === 'claiming' && (
            <div className="p-12 text-center">
              <MysticalLoader size="md" message="正在領取..." />
            </div>
          )}

          {/* Claimed success */}
          {status === 'claimed' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                <CheckSealIcon size={32} />
              </div>
              <h2 className="text-emerald-400 text-lg font-serif mb-2">領取成功！</h2>
              <p className="text-foreground/50 text-sm mb-4 font-serif">補償機緣已發放至您的帳戶</p>
              {claimed && (
                <div className="space-y-2 mb-6">
                  <CreditItem label="機緣" value={claimed.credits} />
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/divination"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-gold hover:bg-gold-light text-navy-950 font-serif font-bold transition-colors shadow-md"
                >
                  開始占卜 →
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-serif text-foreground/60 hover:text-foreground border border-line/10 hover:bg-foreground/5 transition-colors"
                >
                  返回首頁
                </Link>
              </div>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-foreground/5 border border-line/20 flex items-center justify-center mx-auto mb-3 text-foreground/50">
                <SunMoonIcon size={28} />
              </div>
              <h2 className="text-foreground/70 text-lg font-serif mb-2">補償已過期</h2>
              <p className="text-foreground/40 text-sm font-serif mb-6">此補償連結已超過有效期限，請聯繫管理員。</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/divination"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-gold/30 text-gold hover:bg-gold/10 transition-colors font-serif"
                >
                  前往占卜大廳 →
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-serif text-foreground/60 hover:text-foreground border border-line/10 hover:bg-foreground/5 transition-colors"
                >
                  返回首頁
                </Link>
              </div>
            </div>
          )}

          {/* Invalid */}
          {(status === 'invalid' || status === 'not_sent') && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
                <CloseIcon size={28} />
              </div>
              <h2 className="text-foreground/70 text-lg font-serif mb-2">連結無效</h2>
              <p className="text-foreground/40 text-sm font-serif mb-6">此補償連結無效或尚未啟用。</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/divination"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-gold/30 text-gold hover:bg-gold/10 transition-colors font-serif"
                >
                  前往占卜大廳 →
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-serif text-foreground/60 hover:text-foreground border border-line/10 hover:bg-foreground/5 transition-colors"
                >
                  返回首頁
                </Link>
              </div>
            </div>
          )}

          {/* No account */}
          {status === 'no_account' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3 text-gold">
                <SunMoonIcon size={28} />
              </div>
              <h2 className="text-foreground/70 text-lg font-serif mb-2">尚未註冊</h2>
              <p className="text-foreground/40 text-sm mb-6 font-serif">找不到此電郵對應的帳戶，請先註冊後再領取。</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-gold hover:bg-gold-light text-navy-950 font-serif font-bold transition-colors shadow-md"
                >
                  前往註冊
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-serif text-foreground/60 hover:text-foreground border border-line/10 hover:bg-foreground/5 transition-colors"
                >
                  返回首頁
                </Link>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
                <AlertIcon size={28} />
              </div>
              <h2 className="text-foreground/70 text-lg font-serif mb-2">發生錯誤</h2>
              <p className="text-foreground/40 text-sm font-serif mb-6">請稍後再試或聯繫管理員。</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/divination"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-gold/30 text-gold hover:bg-gold/10 transition-colors font-serif"
                >
                  前往占卜大廳 →
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-serif text-foreground/60 hover:text-foreground border border-line/10 hover:bg-foreground/5 transition-colors"
                >
                  返回首頁
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
