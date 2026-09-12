'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import StarField from '@/components/StarField'

export default function HomePage() {
  const { lang } = useLang()
  const { data: session } = useSession()
  const [showOtherSystems, setShowOtherSystems] = useState(false)
  const isZh = lang !== 'en'

  const secondaryServices = [
    {
      id: 'qimen',
      symbol: '🧭',
      name: isZh ? '奇門遁甲' : 'Qi Men Dun Jia',
      desc: isZh ? '空間方位，排盤擇吉' : 'Directional spatial strategy & timing',
      href: '/divination/qimen',
    },
    {
      id: 'fengshui',
      symbol: '🏯',
      name: isZh ? '風水佈局' : 'Feng Shui Harmony',
      desc: isZh ? '藏風聚氣，調和宅運' : 'Environmental energy & spatial balance',
      href: '/divination/fengshui',
    },
    {
      id: 'iching',
      symbol: '📖',
      name: isZh ? '易經六十四卦' : 'I Ching Classic',
      desc: isZh ? '周易象數，卦辭直解' : 'Classical hexagram wisdom & guidance',
      href: '/divination/iching',
    },
  ]

  return (
    <div className="flex-1 bg-navy-950 text-white selection:bg-gold/20 selection:text-gold-light relative overflow-x-hidden">
      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[85vh] sm:min-h-[88vh] flex flex-col items-center justify-center overflow-hidden px-4 py-16 sm:py-24">
        <StarField />

        {/* Subtle Celestial Orbit Rings (Traditional Armillary Sphere motif) */}
        <div
          className="celestial-orbit w-[340px] h-[340px] sm:w-[540px] sm:h-[540px]"
          aria-hidden="true"
        />
        <div
          className="celestial-orbit w-[500px] h-[500px] sm:w-[780px] sm:h-[780px] opacity-40"
          style={{ animationDirection: 'reverse', animationDuration: '240s' }}
          aria-hidden="true"
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Authenticated user welcoming greeting badge */}
          {session?.user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full text-xs text-gold/80 border border-gold/25 bg-gold/5 backdrop-blur-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span>
                {isZh
                  ? `歡迎歸位，${session.user.name || '道友'}`
                  : `Welcome back, ${session.user.name || 'Friend'}`}
              </span>
              <Link href="/divination" className="text-gold underline ml-1 hover:text-gold-light">
                {isZh ? '進入命盤簿 →' : 'My Readings →'}
              </Link>
            </motion.div>
          )}

          {/* Core Brand Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="text-6xl sm:text-7xl md:text-8xl font-serif text-gold tracking-wider mb-4 select-none"
              style={{
                textShadow: '0 0 45px rgba(212,168,83,0.3)',
              }}
            >
              玄機
            </h1>
            <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-gold/60 mb-4 font-sans font-light">
              XuanJi · Modern Metaphysics
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/80 font-serif font-light mb-4">
              {isZh ? '古法智慧 · 當代精算' : 'Ancient Wisdom, Contemporary Calculation'}
            </p>
            <p className="text-sm sm:text-base text-white/50 max-w-xl mx-auto leading-relaxed font-light mb-10">
              {isZh
                ? '「不論是一生大運起伏，還是當下一事之惑，皆有數可循。」'
                : '“Whether charting the arc of a lifetime or resolving an immediate crossroad, every fate has its number.”'}
            </p>
          </motion.div>

          {/* ─── Dual-Scenario Core Navigation Cards (Minimalist & Intuitive) ─── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 text-left max-w-3xl mx-auto"
          >
            {/* Scenario 1: Who am I? (BaZi / Zi Wei) */}
            <div className="card-mystic-l1 p-6 sm:p-7 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-2xl" aria-hidden="true">🏛️</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-gold/30 text-gold-light bg-gold/10 font-serif">
                    {isZh ? '本命推演' : 'Life Blueprint'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-gold-light font-medium mb-2 group-hover:text-gold transition-colors">
                  {isZh ? '觀照自性 · 終生大運' : 'Discover Your Blueprint'}
                </h2>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light mb-6">
                  {isZh
                    ? '探尋本命格局順逆、十年大運流轉與內在性格長板。面對人生轉折或生涯迷茫時的定盤羅盤。'
                    : 'Analyze four pillars, life palace, and decade cycles. Your guiding compass when navigating major life transitions.'}
                </p>

                {/* Sub-system quick chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Link
                    href="/divination/bazi"
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-gold/15 hover:text-gold border border-white/10 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>🏛️</span>
                    <span>{isZh ? '四柱八字' : 'BaZi'}</span>
                  </Link>
                  <Link
                    href="/divination/ziwei"
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-gold/15 hover:text-gold border border-white/10 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>⭐</span>
                    <span>{isZh ? '紫微斗數' : 'Zi Wei'}</span>
                  </Link>
                </div>
              </div>

              <Link
                href="/divination/bazi"
                className="w-full py-3 px-5 rounded-xl bg-gold text-navy-950 font-medium text-sm text-center hover:bg-gold-light transition-all shadow-md shadow-gold/10 flex items-center justify-center gap-1.5 group-hover:gap-2.5"
              >
                <span>{isZh ? '探索本命星盤' : 'Explore Your Chart'}</span>
                <span className="transition-transform duration-300">→</span>
              </Link>
            </div>

            {/* Scenario 2: What should I do now? (Liu Yao / Mei Hua) */}
            <div className="card-mystic-l1 p-6 sm:p-7 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-2xl" aria-hidden="true">🪙</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-sky-400/30 text-sky-200 bg-sky-500/10 font-serif">
                    {isZh ? '一事一占' : 'Decision Oracle'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-sky-200 font-medium mb-2 group-hover:text-white transition-colors">
                  {isZh ? '凝神問事 · 當下決疑' : 'Resolve Immediate Doubts'}
                </h2>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light mb-6">
                  {isZh
                    ? '事業跳槽、投資吉凶、求財求謀，銅錢搖卦。陷於是非取捨、進退兩難之際，叩問天機應期。'
                    : 'Career moves, partnership investments, and critical dilemmas. Ask the oracle for precise situational timing.'}
                </p>

                {/* Sub-system quick chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Link
                    href="/divination/liuyao"
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-sky-500/15 hover:text-sky-200 border border-white/10 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>🪙</span>
                    <span>{isZh ? '六爻神卦' : 'Liu Yao'}</span>
                  </Link>
                  <Link
                    href="/divination/meihua"
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-sky-500/15 hover:text-sky-200 border border-white/10 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>🌸</span>
                    <span>{isZh ? '梅花易數' : 'Mei Hua'}</span>
                  </Link>
                </div>
              </div>

              <Link
                href="/divination/liuyao"
                className="w-full py-3 px-5 rounded-xl border border-sky-400/50 text-sky-100 font-medium text-sm text-center hover:bg-sky-400/15 transition-all flex items-center justify-center gap-1.5 group-hover:gap-2.5"
              >
                <span>{isZh ? '即刻起卦決疑' : 'Cast an Oracle'}</span>
                <span className="transition-transform duration-300">→</span>
              </Link>
            </div>
          </motion.div>

          {/* Secondary Traditional Arts Collapsible Drawer */}
          <div className="mt-8">
            <button
              onClick={() => setShowOtherSystems(!showOtherSystems)}
              className="text-xs text-white/40 hover:text-gold/80 transition-colors inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-white/5 hover:border-gold/20"
            >
              <span>{isZh ? '探尋更多古法術數（奇門遁甲、風水、易經）' : 'Explore traditional arts (Qi Men, Feng Shui, I Ching)'}</span>
              <span className={`transition-transform duration-300 ${showOtherSystems ? 'rotate-180' : ''}`}>↓</span>
            </button>

            <AnimatePresence>
              {showOtherSystems && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-3xl mx-auto pt-2">
                    {secondaryServices.map((s) => (
                      <Link
                        key={s.id}
                        href={s.href}
                        className="p-3.5 rounded-xl bg-navy-900/60 border border-white/10 hover:border-gold/30 transition-all group"
                      >
                        <div className="text-xl mb-1">{s.symbol}</div>
                        <p className="text-xs font-serif text-gold-light group-hover:text-gold font-medium">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5 line-clamp-1">
                          {s.desc}
                        </p>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ─── Xuanji Master Teahouse Consultation Section ─── */}
      <section className="py-14 sm:py-20 px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="card-mystic-featured p-8 sm:p-12 relative overflow-hidden"
        >
          {/* Delicate corner seal */}
          <div className="absolute top-6 right-6 select-none opacity-80" aria-hidden="true">
            <span className="stamp-vermillion text-xs">玄機天算</span>
          </div>

          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/70 font-sans mb-2">
              {isZh ? '名師對坐 · 知無不言' : 'Personal Master Consultation'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif text-gold-light mb-4">
              {isZh ? '玄機大師 · 深度陪伴' : 'Master Xuanji'}
            </h2>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed font-light mb-6">
              {isZh
                ? '不只是靜態的排盤紙。大師以古籍源流為本、結合現代推演，能調取您的本命星盤、逐段深入解讀、追溯節氣流年，為您解答心中的連環之惑。'
                : 'Far beyond a static chart. Master Xuanji recalls your previous readings, traces seasonal rhythms, and answers your follow-up questions like sitting with a true sage.'}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href={session ? '/divination' : `/login?next=${encodeURIComponent('/divination')}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold text-navy-950 text-sm font-medium hover:bg-gold-light transition-all shadow-md shadow-gold/10"
              >
                <span>{isZh ? '開始與大師品茗對話' : 'Converse with Master'}</span>
                <span>→</span>
              </Link>
              <span className="text-xs text-white/40">
                {isZh ? '隨時在排盤結果中直接追問' : 'Available on any reading result'}
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Minimalist Footer & Serene Disclaimer ─── */}
      <footer className="py-12 px-4 border-t border-white/5 text-center text-xs text-white/40 font-light">
        <p className="mb-2">玄機 XuanJi · 古法智慧，當代傳承</p>
        <p className="text-white/30 max-w-lg mx-auto">
          {isZh
            ? '本網站內容僅供傳統文化愛好與個人心性修養參照，不構成任何醫療、法律、財務或投資決策建議。'
            : 'For traditional cultural appreciation and personal mindfulness reference only. Not financial, medical, or legal advice.'}
        </p>
      </footer>
    </div>
  )
}
