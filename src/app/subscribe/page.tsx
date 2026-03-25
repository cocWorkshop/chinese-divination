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
  const [credits, setCredits] = useState<number | null>(null)
  const [costs, setCosts] = useState<Record<string, number> | null>(null)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    if (session) {
      fetch('/api/credits')
        .then(r => r.json())
        .then(data => {
          if (data.credits !== undefined) setCredits(data.credits)
          if (data.costs) setCosts(data.costs)
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
        {session && credits !== null && (
          <div className="glass-card rounded-xl p-4 mb-8 max-w-md mx-auto text-center" style={{ border: '1px solid var(--border-gold)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              {T(lang, '當前額度', 'Current Credits')}
            </p>
            <span className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>{credits}</span>
            <span className="text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>{T(lang, '點', 'pts')}</span>
          </div>
        )}

        {/* Pricing info */}
        {costs && (
          <div className="glass-card rounded-xl p-4 mb-8 max-w-lg mx-auto" style={{ border: '1px solid var(--border-gold)' }}>
            <p className="text-sm font-medium mb-3 text-center" style={{ color: 'var(--gold)' }}>
              {T(lang, '各功能消耗額度', 'Credit Costs per Feature')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div>☰ {T(lang, '八字命理', 'BaZi')}: <span style={{ color: 'var(--gold)' }}>{costs.bazi}</span> {T(lang, '點', 'pts')}</div>
              <div>⭐ {T(lang, '紫微斗數', 'Zi Wei')}: <span style={{ color: 'var(--gold)' }}>{costs.ziwei}</span> {T(lang, '點', 'pts')}</div>
              <div>⚡ {T(lang, '奇門遁甲', 'Qi Men')}: <span style={{ color: 'var(--gold)' }}>{costs.qimen}</span> {T(lang, '點', 'pts')}</div>
              <div>🌸 {T(lang, '梅花易數', 'Mei Hua')}: <span style={{ color: 'var(--gold)' }}>{costs.meihua}</span> {T(lang, '點', 'pts')}</div>
              <div>☯ {T(lang, '六爻占卜', 'Liu Yao')}: <span style={{ color: 'var(--gold)' }}>{costs.liuyao}</span> {T(lang, '點', 'pts')}</div>
              <div>💬 {T(lang, '問答聊天', 'Chat')}: <span style={{ color: 'var(--gold)' }}>{costs.chat}</span> {T(lang, '點', 'pts')}</div>
            </div>
          </div>
        )}

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
                {pack.discount && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                    {T(lang, `額外${pack.discount}`, `Extra ${pack.discount} off`)}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--gold)' }}>✦</span>
                  {pack.credits} {T(lang, '點額度', ' credit points')}
                </li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--gold)' }}>✦</span>
                  {T(lang, '所有功能通用', 'Works for all features')}
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
