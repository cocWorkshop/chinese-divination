'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LanguageContext'
import { motion } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CREDIT_PACKS, type PackId } from '@/lib/creditPacks'
import { T } from '@/lib/i18n'
import BackButton from '@/components/BackButton'
import { DivinationIcon } from '@/components/DivinationIcons'
import MysticalLoader from '@/components/MysticalLoader'

function PackEmblem({ id }: { id: string }) {
  if (id === 'pack10') {
    return (
      <svg width={48} height={48} viewBox="0 0 100 100" className="inline-block text-gold">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.3" />
        <path d="M58 24 A 28 28 0 1 0 74 68 A 34 34 0 0 1 58 24 Z" fill="#d4a853" opacity="0.9" />
        <circle cx="68" cy="30" r="2.5" fill="#e8c278" />
      </svg>
    )
  }
  if (id === 'pack100') {
    return (
      <svg width={48} height={48} viewBox="0 0 100 100" className="inline-block text-gold">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.4" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#d4a853" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
        <polygon points="50,16 56,36 78,36 60,48 67,68 50,56 33,68 40,48 22,36 44,36" fill="#d4a853" />
        <circle cx="50" cy="50" r="5" fill="#e8c278" />
      </svg>
    )
  }
  return (
    <svg width={48} height={48} viewBox="0 0 100 100" className="inline-block text-gold">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#d4a853" strokeWidth="1" opacity="0.3" />
      <polygon points="50,14 55,34 76,34 59,46 65,66 50,54 35,66 41,46 24,34 45,34" fill="#d4a853" opacity="0.9" />
      <circle cx="28" cy="74" r="3" fill="#e8c278" />
      <circle cx="72" cy="74" r="3" fill="#e8c278" />
      <line x1="28" y1="74" x2="50" y2="54" stroke="#d4a853" strokeWidth="1" opacity="0.5" />
      <line x1="72" y1="74" x2="50" y2="54" stroke="#d4a853" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

function SubscribeContent() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [costs, setCosts] = useState<Record<string, number> | null>(null)
  const [visibility, setVisibility] = useState<Record<string, boolean> | null>(null)
  const [loaded, setLoaded] = useState(false)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const returnUrl = searchParams.get('returnUrl')

  useEffect(() => {
    if (session) {
      fetch('/api/credits')
        .then(r => r.json())
        .then(data => {
          if (data.credits !== undefined) setCredits(data.credits)
          if (data.costs) setCosts(data.costs)
          if (data.visibility) setVisibility(data.visibility)
          setLoaded(true)
        })
        .catch(() => { setLoaded(true) })
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
        return
      }
      toast.error(data.error || T(lang, '無法開啟付款頁面，請稍後再試。', 'Could not open the payment page. Please try again later.'))
    } catch {
      toast.error(T(lang, '無法連接付款服務，請檢查網路後再試。', 'Could not reach the payment service. Please check your connection and try again.'))
    }
    setLoadingPack(null)
  }

  const packs = Object.entries(CREDIT_PACKS) as [PackId, typeof CREDIT_PACKS[PackId]][]

  return (
    <div className="flex-1 pt-20 sm:pt-24 pb-28 sm:pb-16 px-3 sm:px-4 bg-navy-950">
      <div className="max-w-5xl mx-auto">
        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[rgba(212,168,83,0.16)]">
          <div className="flex items-center gap-3">
            <BackButton
              href={returnUrl || undefined}
              fallbackHref="/divination"
              label={returnUrl ? (lang === 'en' ? 'Back' : '返回原處') : undefined}
            />
            <nav className="flex items-center gap-1.5 text-xs text-white/50 font-serif" aria-label="Breadcrumb">
              <Link href="/divination" className="hover:text-gold transition-colors">
                {T(lang, '占卜大廳', 'Divination')}
              </Link>
              <span>/</span>
              <span className="text-gold">{T(lang, '結緣功德簿', 'Karma Patronage')}</span>
            </nav>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/divination"
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all border border-gold/25 hover:border-gold/50 text-white/70 hover:text-gold bg-gold/5"
            >
              <DivinationIcon type="bazi" size={14} color="currentColor" />
              <span>{T(lang, '前往占卜大廳', 'Divination Sanctuary')}</span>
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-gold/70 font-sans mb-1">
            {T(lang, '機緣積累 · 護持研經', 'Karma Sanctuary · Metaphysical Patronage')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif mb-2 text-gold-light">
            {T(lang, '結緣功德簿', 'Karma Patronage')}
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto font-light leading-relaxed">
            {T(lang, '隨喜結緣，支持玄機推演算力運轉，探索更深層的命脈玄奧。', 'Support continuous metaphysical calculation and unlock deep destiny readings.')}
          </p>
        </div>

        {/* Combined: Current credits + cost table with animation */}
        {session && loaded && (credits !== null || costs) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="oriental-sanctuary-card p-4 sm:p-5 mb-8 max-w-2xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {credits !== null && (
                <div className="text-center sm:border-r sm:pr-6 flex-shrink-0 border-gold/15">
                  <p className="text-xs text-white/50 font-serif">{T(lang, '現存機緣', 'Current Karma')}</p>
                  <span className="text-3xl font-bold font-serif text-gold">{credits}</span>
                  <span className="text-xs ml-1 text-white/50">{T(lang, '點', 'pts')}</span>
                </div>
              )}
              {costs && (
                <div className="flex-1 text-xs text-white/70">
                  <table className="w-full text-left font-serif">
                    <tbody>
                      <tr><td colSpan={2} className="pb-1 font-medium text-gold/70">{T(lang, '占卜演局', 'Divination')}</td></tr>
                      <tr>
                        <td className="py-0.5 text-white/60">{T(lang, '八字 / 紫微 / 奇門', 'BaZi / ZiWei / QiMen')}</td>
                        <td className="text-right font-medium text-gold">{costs.bazi} {T(lang, '點', 'pts')}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-white/60">{T(lang, '梅花 / 六爻 / 易經 / 風水', 'MeiHua / LiuYao / IChing / FengShui')}</td>
                        <td className="text-right font-medium text-gold">{costs.meihua} {T(lang, '點', 'pts')}</td>
                      </tr>
                      <tr><td colSpan={2} className="pt-2 pb-1 font-medium text-gold/70">{T(lang, '宗師請益', 'Master Inquiry')}</td></tr>
                      <tr>
                        <td className="py-0.5 text-white/60">{T(lang, '玄機問答', 'Follow-up Q&A')}</td>
                        <td className="text-right font-medium text-gold">{costs.chat} {T(lang, '點', 'pts')}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-white/60">{T(lang, '玄機大師品茗', 'Master Consultation')}</td>
                        <td className="text-right font-medium text-gold">{costs.master} {T(lang, '點/輪', 'pt/turn')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Status messages */}
        {success && (
          <div className="mb-8 p-4 rounded-xl text-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-serif text-sm">
            {T(lang, '✧ 功德圓滿！機緣已悉數注入道友帳戶。', '✧ Purchase successful! Karma has been added to your account.')}
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 rounded-xl text-center bg-gold/10 border border-gold/30 text-gold-light font-serif text-sm">
            {T(lang, '結緣已取消，道友可隨時再返法席。', 'Purchase canceled. You can return anytime.')}
          </div>
        )}

        {/* Pack cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs.map(([packId, pack]) => (
            <div
              key={packId}
              className={`rounded-2xl p-6 flex flex-col relative transition-all ${
                pack.popular
                  ? 'oriental-sanctuary-card border-gold shadow-lg shadow-gold/10 scale-[1.02]'
                  : 'oriental-sanctuary-card border-gold/20 hover:border-gold/40'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-serif font-semibold tracking-wider uppercase stamp-vermillion shadow-sm">
                  {T(lang, '靈修首選', 'Popular')}
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <div className="mb-3">
                  <PackEmblem id={packId} />
                </div>
                <h3 className="text-xl font-serif text-gold-light mb-1">
                  {T(lang, pack.name.zh, pack.name.en)}
                </h3>
                <p className="text-xs text-white/50 font-serif">
                  {T(lang, pack.desc.zh, pack.desc.en)}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="mb-1">
                  <span className="text-xs line-through text-white/40">
                    ${(pack.originalPrice / 100).toFixed(2)}
                  </span>
                  <span className="ml-2 text-[10px] px-2 py-0.2 rounded-full font-serif border border-rose-500/30 bg-rose-500/10 text-rose-300">
                    {T(lang, '特惠結緣', '90% OFF')}
                  </span>
                </div>
                <span className="text-3xl font-serif font-bold text-gold">
                  ${(pack.price / 100).toFixed(2)}
                </span>
                {pack.discount && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-serif border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {T(lang, `額外${pack.discount.zh}`, `Extra ${pack.discount.en}`)}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-xs text-white/80 font-serif">
                  <span className="text-gold">✧</span>
                  <span>{pack.credits} {T(lang, '點機緣', ' Karma')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-white/80 font-serif">
                  <span className="text-gold">✧</span>
                  <span>{T(lang, '全站術數與宗師對話通用', 'Works for all features')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-white/40 font-serif">
                  <span className="text-gold/60">≈</span>
                  <span>{T(lang,
                    `${Math.floor(pack.credits / 5)} 次八字/紫微 或 ${Math.floor(pack.credits / 3)} 次六爻/梅花`,
                    `${Math.floor(pack.credits / 5)} BaZi/ZiWei or ${Math.floor(pack.credits / 3)} LiuYao readings`
                  )}</span>
                </li>
              </ul>

              <div className="mt-auto">
                <button
                  onClick={() => handlePurchase(packId)}
                  disabled={loadingPack !== null}
                  className="w-full py-3 rounded-xl font-serif font-semibold text-xs sm:text-sm transition-all bg-gradient-to-r from-amber-600 via-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-navy-950 shadow-md shadow-gold/15 hover:shadow-gold/30 active:scale-[0.99] disabled:opacity-50 cursor-pointer min-h-[44px] flex items-center justify-center tracking-wider"
                >
                  {loadingPack === packId
                    ? T(lang, '連接天機...', 'Processing...')
                    : T(lang, '隨喜結緣', 'Purchase')
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center mt-8 text-xs text-white/50 font-serif">
          {T(lang, '✧ 機緣永久留存，無過期之虞', '✧ Karma never expires')}
        </p>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href={returnUrl || '/divination'} className="text-xs text-gold/70 hover:text-gold transition-colors font-serif inline-flex items-center gap-1 min-h-[36px]">
            <span>←</span>
            <span>{returnUrl ? T(lang, '返回前次測算', 'Return to Reading') : T(lang, '返回占卜門戶', 'Back to Divination')}</span>
          </Link>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar — Thumb Zone */}
      <aside
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080c17]/95 backdrop-blur-md border-t border-[rgba(212,168,83,0.25)] p-3 px-4 shadow-2xl"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label={T(lang, '快捷導航', 'Quick navigation')}
      >
        <div className="flex items-center gap-2.5 max-w-lg mx-auto">
          <Link
            href={returnUrl || '/divination'}
            className="flex-1 min-h-[48px] rounded-xl text-xs font-serif font-medium flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] border border-gold/30 bg-gold/10 text-gold"
          >
            <span>←</span>
            <span>{returnUrl ? T(lang, '返回前次測算', 'Return to Reading') : T(lang, '返回占卜大廳', 'Back to Divination')}</span>
          </Link>
        </div>
      </aside>
    </div>
  )
}

export default function SubscribePage() {
  const { lang } = useLang()
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-24 bg-navy-950">
          <MysticalLoader lang={lang} />
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  )
}
