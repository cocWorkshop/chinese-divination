'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LanguageContext'
import Link from 'next/link'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

export default function SubscribePage() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const handleSubscribe = async () => {
    if (!session) {
      window.location.href = '/login'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }

  const handleManage = async () => {
    const res = await fetch('/api/stripe/portal')
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-serif mb-3" style={{ color: 'var(--gold)' }}>
            {T(lang, '選擇你的命途', 'Choose Your Path')}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {T(lang, '解鎖更深層的命理洞察', 'Unlock deeper divination insights')}
          </p>
        </div>

        {/* Status messages */}
        {success && (
          <div className="mb-8 p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
            {T(lang, '✨ 訂閱成功！歡迎進入「知命」之境。', '✨ Subscription activated! Welcome to the Ethereal tier.')}
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308' }}>
            {T(lang, '訂閱已取消，你可以隨時重新訂閱。', 'Subscription canceled. You can subscribe anytime.')}
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Tier 1: Arcane */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col" style={{ border: '1px solid var(--border-gold)' }}>
            <div className="mb-6">
              <h2 className="text-xl font-serif mb-1" style={{ color: 'var(--gold)' }}>
                {T(lang, '問命：啟示', 'Arcane: Revelation')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {T(lang, '免費方案', 'Free Plan')}
              </p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$0</span>
              <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                /{T(lang, '月', 'mo')}
              </span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }}>✦</span>
                {T(lang,
                  '2次/每日 高級模型預測（八字命理+六爻占卜）',
                  '2/day premium model predictions (BaZi + Liuyao)'
                )}
              </li>
              <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }}>✦</span>
                {T(lang,
                  '2次/每日 玄機破問答（適用於八字命理和紫微斗數）',
                  '2/day Q&A sessions (BaZi & Ziwei)'
                )}
              </li>
            </ul>
            <div className="mt-auto">
              <div className="py-3 text-center rounded-lg text-sm" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-gold)' }}>
                {T(lang, '當前方案', 'Current Plan')}
              </div>
            </div>
          </div>

          {/* Tier 2: Ethereal (Featured) */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col relative" style={{ border: '2px solid var(--gold)', boxShadow: '0 0 30px rgba(212, 168, 83, 0.15)' }}>
            {/* Featured badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}>
              {T(lang, '推薦', 'RECOMMENDED')}
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-serif mb-1" style={{ color: 'var(--gold)' }}>
                {T(lang, '知命：洞察', 'Ethereal: Insight')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {T(lang, '月度訂閱', 'Monthly Subscription')}
              </p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$19.99</span>
              <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                /{T(lang, '月', 'mo')}
              </span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }}>✦</span>
                {T(lang,
                  '5次/每日 高級模型預測（八字命理+六爻占卜+紫微斗數+更多開放中）',
                  '5/day premium model predictions (BaZi + Liuyao + Ziwei + more)'
                )}
              </li>
              <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }}>✦</span>
                {T(lang,
                  '10次/每日 玄機破問答（適用於八字命理和紫微斗數）',
                  '10/day Q&A sessions (BaZi & Ziwei)'
                )}
              </li>
              <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }}>✦</span>
                {T(lang,
                  '50輪/永久 玄機破問答',
                  '50 bonus Q&A rounds (permanent)'
                )}
              </li>
            </ul>
            <div className="mt-auto">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--gold)', color: '#0a0f1e' }}
              >
                {loading
                  ? T(lang, '處理中...', 'Processing...')
                  : T(lang, '立即訂閱', 'Subscribe Now')
                }
              </button>
              {session && (
                <button
                  onClick={handleManage}
                  className="w-full mt-2 py-2 text-center text-xs transition-colors hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {T(lang, '管理現有訂閱', 'Manage existing subscription')}
                </button>
              )}
            </div>
          </div>

          {/* Tier 3: Prestige */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col opacity-70" style={{ border: '1px solid var(--border-gold)' }}>
            <div className="mb-6">
              <h2 className="text-xl font-serif mb-1" style={{ color: 'var(--gold)' }}>
                {T(lang, '掌命：大師', 'Prestige: Master')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {T(lang, '即將開放', 'Coming Soon')}
              </p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>???</span>
              <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                /{T(lang, '月', 'mo')}
              </span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }}>✦</span>
                {T(lang, '更多功能即將揭曉...', 'More features coming soon...')}
              </li>
            </ul>
            <div className="mt-auto">
              <div className="py-3 text-center rounded-lg text-sm" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-gold)' }}>
                {T(lang, '即將開放', 'Coming Soon')}
              </div>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-10">
          <Link href="/divination" className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← {T(lang, '返回占卜', 'Back to Divination')}
          </Link>
        </div>
      </div>
    </div>
  )
}
