'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LanguageContext'
import Link from 'next/link'
import { CREDIT_PACKS, type PackId } from '@/lib/creditPacks'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

export default function SubscribePage() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null)
  const [credits, setCredits] = useState<{ divination: number; chat: number } | null>(null)
  const [shareBonus, setShareBonus] = useState<{ divination: number; chat: number }>({ divination: 1, chat: 2 })

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    fetch('/api/share/bonus').then(r => r.json()).then(data => {
      if (data.divination) setShareBonus(data)
    }).catch(() => {})
    if (session) {
      fetch('/api/credits')
        .then(r => r.json())
        .then(data => {
          if (data.divination && data.chat) {
            setCredits({ divination: data.divination.remaining, chat: data.chat.remaining })
          }
        })
        .catch(() => {})
    }
  }, [session])

  const handlePurchase = async (packId: PackId) => {
    if (!session) {
      window.location.href = '/login'
      return
    }
    setLoadingPack(packId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // ignore
    }
    setLoadingPack(null)
  }

  const packs = Object.entries(CREDIT_PACKS) as [PackId, typeof CREDIT_PACKS[PackId]][]

  return (
    <div className="flex-1 pt-24 pb-16 px-3 sm:px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif mb-3" style={{ color: 'var(--gold)' }}>
            {T(lang, '額度商店', 'Credits Store')}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {T(lang, '購買額度，探索更深層的命理奧秘', 'Purchase credits to unlock deeper divination insights')}
          </p>
        </div>

        {/* Current credits display */}
        {session && credits && (
          <div className="glass-card rounded-xl p-4 mb-8 max-w-md mx-auto text-center" style={{ border: '1px solid var(--border-gold)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              {T(lang, '當前額度', 'Current Credits')}
            </p>
            <div className="flex justify-center gap-8">
              <div>
                <span className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{credits.divination}</span>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {T(lang, '占卜額度', 'Divination')}
                </p>
              </div>
              <div>
                <span className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{credits.chat}</span>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {T(lang, '問答額度', 'Chat')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Free credits policy */}
        <div className="glass-card rounded-xl p-5 sm:p-6 mb-8 max-w-lg mx-auto" style={{ border: '1px solid var(--border-gold)' }}>
          <h3 className="text-sm font-semibold mb-3 text-center" style={{ color: 'var(--gold)' }}>
            🎁 {T(lang, '免費獲取額度', 'Earn Free Credits')}
          </h3>
          <div className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center justify-between">
              <span>{T(lang, '📝 新用戶註冊', '📝 New user registration')}</span>
              <span style={{ color: 'var(--gold)' }}>{T(lang, '占卜 3 + 問答 3', '3 divination + 3 chat')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{T(lang, '📅 每日登入', '📅 Daily login')}</span>
              <span style={{ color: 'var(--gold)' }}>{T(lang, '占卜 1 + 問答 1', '1 divination + 1 chat')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{T(lang, '🔗 分享給朋友', '🔗 Share with friends')}</span>
              <span style={{ color: 'var(--gold)' }}>{T(lang, `占卜 ${shareBonus.divination} + 問答 ${shareBonus.chat}`, `${shareBonus.divination} divination + ${shareBonus.chat} chat`)}</span>
            </div>
          </div>
        </div>

        {/* Status messages */}
        {success && (
          <div className="mb-8 p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
            {T(lang, '✨ 購買成功！額度已添加到你的帳戶。', '✨ Purchase successful! Credits have been added to your account.')}
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308' }}>
            {T(lang, '購買已取消，你可以隨時再次購買。', 'Purchase canceled. You can buy anytime.')}
          </div>
        )}

        {/* Pack cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {packs.map(([packId, pack]) => (
            <div
              key={packId}
              className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col relative transition-transform hover:scale-[1.02]"
              style={{
                border: pack.popular ? '2px solid var(--gold)' : '1px solid var(--border-gold)',
                boxShadow: pack.popular ? '0 0 30px rgba(212, 168, 83, 0.15)' : undefined,
              }}
            >
              {/* Popular badge */}
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}>
                  {T(lang, '推薦', 'POPULAR')}
                </div>
              )}

              <div className="text-center mb-6">
                <span className="text-4xl">{pack.icon}</span>
                <h2 className="text-xl font-serif mt-2" style={{ color: 'var(--gold)' }}>
                  {lang === 'en' ? pack.name.en : pack.name.zh}
                </h2>
              </div>

              <div className="text-center mb-6">
                <div className="mb-1">
                  <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                    ${(pack.originalPrice / 100).toFixed(2)}
                  </span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    {T(lang, '1折', '90% OFF')}
                  </span>
                </div>
                <span className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>
                  ${(pack.price / 100).toFixed(2)}
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--gold)' }}>✦</span>
                  {pack.divination} {T(lang, '次占卜額度', ' divination credits')}
                </li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--gold)' }}>✦</span>
                  {pack.chat} {T(lang, '次問答額度', ' chat credits')}
                </li>
              </ul>

              <div className="mt-auto">
                <button
                  onClick={() => handlePurchase(packId)}
                  disabled={loadingPack !== null}
                  className="w-full py-3 rounded-lg font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
                >
                  {loadingPack === packId
                    ? T(lang, '處理中...', 'Processing...')
                    : T(lang, '購買', 'Purchase')
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          {T(lang, '💫 額度永久有效，不會過期', '💫 Credits never expire')}
        </p>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href="/divination" className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← {T(lang, '返回占卜', 'Back to Divination')}
          </Link>
        </div>
      </div>
    </div>
  )
}
