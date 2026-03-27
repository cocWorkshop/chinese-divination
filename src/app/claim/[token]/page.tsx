'use client'

import { useEffect, useState } from 'react'
import YinYangIcon from '@/components/YinYangIcon'
import { useParams } from 'next/navigation'

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

  const CreditItem = ({ label, value, icon }: { label: string; value: number; icon: string }) => {
    if (value <= 0) return null
    return (
      <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-[rgba(212,168,83,0.06)] border border-[rgba(212,168,83,0.15)]">
        <span className="text-[rgba(255,255,255,0.7)] text-sm">{icon} {label}</span>
        <span className="text-[#d4a853] font-serif text-lg font-bold">+{value}</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #111827 100%)' }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-3"><YinYangIcon size={48} /></div>
          <h1 className="text-[#d4a853] font-serif text-2xl">玄機</h1>
          <p className="text-[rgba(255,255,255,0.3)] text-xs mt-1">Ancient Wisdom, Modern Heritage</p>
        </div>

        <div className="rounded-2xl border border-[rgba(212,168,83,0.2)] overflow-hidden" style={{ background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(20px)' }}>

          {/* Loading */}
          {status === 'loading' && (
            <div className="p-12 text-center">
              <div className="animate-pulse mb-3"><YinYangIcon size={30} /></div>
              <p className="text-[rgba(255,255,255,0.5)] text-sm">正在載入...</p>
            </div>
          )}

          {/* Ready to claim */}
          {status === 'ready' && data && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎁</div>
                <h2 className="text-[rgba(255,255,255,0.9)] text-lg font-serif mb-1">補償額度</h2>
                <p className="text-[rgba(255,255,255,0.4)] text-sm">以下額度已為您準備：</p>
              </div>

              <div className="space-y-2.5 mb-6">
                <CreditItem label="額度" value={data.credits} icon="💰" />
              </div>

              {data.reason && (
                <p className="text-[rgba(255,255,255,0.3)] text-xs text-center mb-6 italic">
                  原因：{data.reason}
                </p>
              )}

              <button
                onClick={handleClaim}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all"
                style={{ background: 'linear-gradient(135deg, #d4a853, #b8912e)', color: '#0a0f1e' }}
              >
                🎁 立即領取
              </button>

              <p className="text-[rgba(255,255,255,0.25)] text-[11px] text-center mt-4">
                額度將立即發放至您的帳戶（{data.email}）
              </p>
            </div>
          )}

          {/* Claiming */}
          {status === 'claiming' && (
            <div className="p-12 text-center">
              <div className="animate-spin mb-3"><YinYangIcon size={30} /></div>
              <p className="text-[rgba(255,255,255,0.5)] text-sm">正在領取...</p>
            </div>
          )}

          {/* Claimed success */}
          {status === 'claimed' && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-[#2d8a6e] text-lg font-serif mb-2">領取成功！</h2>
              <p className="text-[rgba(255,255,255,0.5)] text-sm mb-4">補償額度已發放至您的帳戶</p>
              {claimed && (
                <div className="space-y-2 mb-6">
                  <CreditItem label="額度" value={claimed.credits} icon="💰" />
                </div>
              )}
              <a
                href="/divination"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium border border-[rgba(212,168,83,0.3)] text-[#d4a853] hover:bg-[rgba(212,168,83,0.1)] transition-colors"
              >
                開始占卜 →
              </a>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">⏰</div>
              <h2 className="text-[rgba(255,255,255,0.7)] text-lg font-serif mb-2">補償已過期</h2>
              <p className="text-[rgba(255,255,255,0.4)] text-sm">此補償連結已超過有效期限，請聯繫管理員。</p>
            </div>
          )}

          {/* Invalid */}
          {(status === 'invalid' || status === 'not_sent') && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-[rgba(255,255,255,0.7)] text-lg font-serif mb-2">連結無效</h2>
              <p className="text-[rgba(255,255,255,0.4)] text-sm">此補償連結無效或尚未啟用。</p>
            </div>
          )}

          {/* No account */}
          {status === 'no_account' && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">👤</div>
              <h2 className="text-[rgba(255,255,255,0.7)] text-lg font-serif mb-2">尚未註冊</h2>
              <p className="text-[rgba(255,255,255,0.4)] text-sm mb-4">找不到此電郵對應的帳戶，請先註冊後再領取。</p>
              <a
                href="/register"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium text-[#0a0f1e] font-bold"
                style={{ background: 'linear-gradient(135deg, #d4a853, #b8912e)' }}
              >
                前往註冊
              </a>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-[rgba(255,255,255,0.7)] text-lg font-serif mb-2">發生錯誤</h2>
              <p className="text-[rgba(255,255,255,0.4)] text-sm">請稍後再試或聯繫管理員。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
