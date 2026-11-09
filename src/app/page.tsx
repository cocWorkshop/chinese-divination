'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import StarField from '@/components/StarField'
import YinYangIcon from '@/components/YinYangIcon'
import { DivinationIcon, SunMoonIcon, CheckSealIcon, CloseIcon } from '@/components/DivinationIcons'
import { getDailyAlmanac } from '@/lib/dailyAlmanac'
import { REALM_TIERS } from '@/lib/growth/growthSystem'
import { T } from '@/lib/i18n'

export default function HomePage() {
  const { lang } = useLang()
  const { data: session } = useSession()
  const [userRealm, setUserRealm] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user) {
      setUserRealm(null)
      return
    }
    fetch('/api/user/growth')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.currentRealm?.name) {
          setUserRealm(
            T(
              lang,
              data.currentRealm.name['zh-TW'] || data.currentRealm.name.zh,
              data.currentRealm.name.en
            )
          )
        }
      })
      .catch(() => {})
  }, [session, lang])

  // Daily Almanac data
  const almanac = useMemo(() => getDailyAlmanac(), [])

  // Core 6 divination portals
  const divinationPortals = [
    {
      id: 'bazi',
      name: T(lang, '四柱八字', 'BaZi Destiny'),
      tag: T(lang, '本命格局 · 十年大運', 'Natal Chart & Decades'),
      desc: T(
        lang,
        '依年月日時排定四柱干支，洞悉先天格局、喜用五行、十年大運流轉與流年吉凶。',
        'Four Pillars of Destiny charting your five elements, decade fate cycles, and annual fortunes.'
      ),
      highlights: T(
        lang,
        ['四柱排盤', '胎命身三垣', '十年大運', '流年精批'],
        ['Four Pillars', 'Three Palaces', '10-Yr Da Yun', 'Annual Fortunes']
      ),
      href: '/divination/bazi',
      btnText: T(lang, '起盤推演', 'Chart Destiny'),
    },
    {
      id: 'ziwei',
      name: T(lang, '紫微斗數', 'Zi Wei Dou Shu'),
      tag: T(lang, '帝王之術 · 十二宮盤', 'Imperial Astrology'),
      desc: T(
        lang,
        '以紫微星群佈列命身十二宮，詳參十四主星、四化飛星與大限流年氣運吉凶。',
        'Map your 12 life palaces, 14 major celestial stars, and four transformations with pinpoint precision.'
      ),
      highlights: T(
        lang,
        ['命身十二宮', '十四主星', '四化飛星', '大限流年'],
        ['12 Palaces', 'Major Stars', 'Four Transformations', 'Life Periods']
      ),
      href: '/divination/ziwei',
      btnText: T(lang, '探索命盤', 'Explore Stars'),
    },
    {
      id: 'liuyao',
      name: T(lang, '六爻神課', 'Liu Yao Oracle'),
      tag: T(lang, '一事一占 · 當下決疑', 'Immediate Resolution'),
      desc: T(
        lang,
        '漢代京房易納甲之法，銅錢六搖成卦。針對事業晉升、求財投資、婚戀取捨等具體疑難。',
        'Classical King Fang coin casting oracle. Instant, precise situational guidance for critical dilemmas.'
      ),
      highlights: T(
        lang,
        ['銅錢搖卦', '世應生克', '六親六神', '精準應期'],
        ['Coin Oracle', 'Host & Guest', 'Six Relatives', 'Exact Timing']
      ),
      href: '/divination/liuyao',
      btnText: T(lang, '即刻起卦', 'Cast Oracle'),
    },
    {
      id: 'qimen',
      name: T(lang, '奇門遁甲', 'Qi Men Dun Jia'),
      tag: T(lang, '時空運籌 · 出行擇吉', 'Spatial Strategy'),
      desc: T(
        lang,
        '三奇六儀、八門九星排盤演局。用於商務談判、出行出差、方位擇吉與空間制勝。',
        'Ancient spatial strategy system mapping celestial gates and stars to choose optimal timing and direction.'
      ),
      highlights: T(
        lang,
        ['九星八門', '三奇六儀', '方位吉凶', '出行擇吉'],
        ['Nine Stars', 'Eight Gates', 'Directions', 'Timing Selection']
      ),
      href: '/divination/qimen',
      btnText: T(lang, '演局擇吉', 'Plan Strategy'),
    },
    {
      id: 'meihua',
      name: T(lang, '梅花易數', 'Mei Hua Yi Shu'),
      tag: T(lang, '觸機起卦 · 心易自通', 'Synchronicity Oracle'),
      desc: T(
        lang,
        '宋代邵康節先生所創，觀物聽聲、靈機觸動即成一卦，體用生克直斷事態成敗。',
        'Shao Yong’s intuitive synchronicity divination. Transform any real-world sign into instant clarity.'
      ),
      highlights: T(
        lang,
        ['物象起卦', '體用生克', '事應吉凶', '靈動敏捷'],
        ['Sign Triggered', 'Body & Use', 'Outcome Insight', 'Nimble Oracle']
      ),
      href: '/divination/meihua',
      btnText: T(lang, '感應起卦', 'Trigger Oracle'),
    },
    {
      id: 'fengshui',
      name: T(lang, '環境風水', 'Feng Shui Harmony'),
      tag: T(lang, '藏風聚氣 · 宅運調和', 'Environmental Flow'),
      desc: T(
        lang,
        '巒頭形勢與九宮飛星理氣合參，診斷住宅辦公氣場吉凶，佈局旺財旺運安康格局。',
        'Analyze environmental Qi, Nine Flying Stars, and spatial layouts to harmonize wealth and well-being.'
      ),
      highlights: T(
        lang,
        ['巒頭形勢', '九宮飛星', '煞氣化解', '財位佈局'],
        ['Landform Qi', 'Flying Stars', 'Remedies', 'Wealth Positions']
      ),
      href: '/divination/fengshui',
      btnText: T(lang, '佈局宅運', 'Harmonize Space'),
    },
  ]

  // Master quick inquiry topics
  const masterInquiryPrompts = [
    { textZh: '大師，如何看待命中定數與行事策略？', textEn: 'Master, how should one balance destiny and effort?' },
    { textZh: '今年逢犯太歲/刑衝，有何避凶指引？', textEn: 'Facing clashes this year, how to mitigate risks?' },
    { textZh: '事業面臨十字路口，該守成還是主動破局？', textEn: 'At career crossroads: preserve or pioneer?' },
  ]

  return (
    <div className="flex-1 bg-background text-foreground selection:bg-gold/20 selection:text-gold-light relative overflow-x-hidden">
      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[58vh] sm:min-h-[64vh] flex flex-col items-center justify-center overflow-hidden px-4 pt-16 pb-8 sm:pt-20 sm:pb-10">
        <StarField />

        {/* Dynamic Concentric Armillary Sphere Orbits */}
        <div
          className="celestial-orbit w-[340px] h-[340px] sm:w-[540px] sm:h-[540px]"
          aria-hidden="true"
        />
        <div
          className="celestial-orbit w-[500px] h-[500px] sm:w-[780px] sm:h-[780px] opacity-40"
          style={{ animationDirection: 'reverse', animationDuration: '240s' }}
          aria-hidden="true"
        />

        <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
          {/* Authenticated user welcoming greeting badge with Realm */}
          {session?.user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full text-xs text-gold/80 border border-gold/25 bg-gold/5 backdrop-blur-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span>
                {T(
                  lang,
                  `歡迎，${session.user.name || '道友'}`,
                  `Welcome, ${session.user.name || 'Friend'}`
                )}
              </span>
              <span className="text-gold/50">·</span>
              <span className="text-gold font-serif">{userRealm || T(lang, '初探玄門', 'Novice Seeker')}</span>
              <Link href="/divination" className="text-gold underline ml-1 hover:text-gold-light font-serif">
                {T(lang, '開始占卜 →', 'Start Divination →')}
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
              className="text-6xl sm:text-7xl md:text-8xl font-serif text-gold tracking-wider mb-3 select-none"
              style={{
                textShadow: '0 0 45px rgba(212,168,83,0.3)',
              }}
            >
              玄機
            </h1>
            <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-gold/70 mb-3 font-sans font-light">
              XuanJi
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-foreground/90 font-serif font-light mb-2">
              {T(lang, '古法智慧 · 當代精算', 'Ancient Wisdom, Contemporary Calculation')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Daily Almanac & Hexagram Section (今日黃曆與天機卦) ─── */}
      <section className="py-8 px-4 max-w-5xl mx-auto relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="oriental-sanctuary-card rounded-2xl p-5 sm:p-7 border border-gold/25 relative overflow-hidden shadow-2xl backdrop-blur-xl"
        >
          {/* Subtle gold ribbon top edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left: Date, Lunar & Five Elements (4 cols) */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-gold/15 pb-4 md:pb-0 md:pr-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gold font-serif text-xs font-bold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  {T(lang, '今日黃曆', 'Daily Almanac')}
                </span>
                <span className="text-xs text-foreground/60 font-mono">{almanac.solarDate}</span>
              </div>
              <div className="text-lg sm:text-xl font-serif text-gold font-medium">
                {almanac.ganZhi}
              </div>
              <div className="text-xs text-foreground/60 flex items-center gap-1.5 font-serif">
                <SunMoonIcon size={13} className="text-gold/80" />
                <span>農曆 {almanac.lunarDate}</span>
                {almanac.solarTerm && (
                  <span className="px-1.5 py-0.2 rounded bg-foreground/10 text-gold text-[10px]">
                    {almanac.solarTerm}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1 font-serif">
                <span className="text-xs text-foreground/50">{T(lang, '值日五行', 'Element')}:</span>
                <span className="text-xs font-bold text-amber-200 px-2 py-0.5 rounded bg-foreground/5 border border-line/10">
                  {almanac.dominantElement}
                </span>
                <span className="text-xs text-foreground/50 ml-2">{T(lang, '氣數指數', 'Index')}:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{almanac.luckScore}%</span>
              </div>
            </div>

            {/* Center: Daily Hexagram (5 cols) */}
            <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-gold/15 pb-4 md:pb-0 md:pr-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gold/80 font-serif flex items-center gap-1.5">
                  <span>☰</span>
                  <span>{T(lang, '今日天機卦', "Today's Oracle Hexagram")}</span>
                </div>
                <span className="text-[11px] text-foreground/40 font-serif">{almanac.dailyHexagram.energy}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl text-gold font-serif leading-none select-none">
                  {almanac.dailyHexagram.symbol}
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold text-foreground">
                    {almanac.dailyHexagram.name}
                  </h3>
                  <p className="text-xs text-gold/90 font-serif line-clamp-1 mt-0.5">
                    {almanac.dailyHexagram.judgment}
                  </p>
                </div>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed font-light font-serif">
                {almanac.dailyHexagram.meaning}
              </p>
            </div>

            {/* Right: Yi & Ji (3 cols) */}
            <div className="md:col-span-3 space-y-3">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold mb-1 flex items-center gap-1 font-serif">
                  <CheckSealIcon size={12} color="#2d8a6e" />
                  <span>{T(lang, '今日所宜', 'Auspicious (Yi)')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {almanac.yi.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-serif"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-rose-400 font-bold mb-1 flex items-center gap-1 font-serif">
                  <CloseIcon size={12} color="#c0392b" />
                  <span>{T(lang, '今日所忌', 'Avoid (Ji)')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {almanac.ji.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-300 font-serif"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href="/divination/iching"
                className="block w-full py-1.5 rounded-lg bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold text-xs text-center font-medium transition-colors"
              >
                {T(lang, '叩求今日專屬卦辭 →', 'Cast Personal Hexagram →')}
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Six Core Metaphysical Arts Portal Grid (六大古法術數現代化專區) ─── */}
      <section className="py-8 sm:py-12 px-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {divinationPortals.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="oriental-sanctuary-card p-6 flex flex-col justify-between group hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="transition-transform group-hover:scale-110">
                    <DivinationIcon type={p.id} size={36} className="text-gold" />
                  </span>
                  <span className="stamp-gold text-[10px] py-0.5 px-2.5 font-serif select-none">
                    {p.tag}
                  </span>
                </div>

                <h3 className="text-xl font-serif font-medium text-foreground group-hover:text-gold-light transition-colors mb-2">
                  {p.name}
                </h3>

                <p className="text-xs text-foreground/60 leading-relaxed font-light mb-4 min-h-[2.5rem]">
                  {p.desc}
                </p>

                {/* Feature Chips */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {p.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-[10px] bg-foreground/[0.04] border border-gold/15 text-foreground/70 font-serif"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href={p.href}
                className="w-full py-2.5 px-4 rounded-xl bg-gold/15 hover:bg-gold hover:text-navy-950 text-gold-light hover:text-navy-950 font-serif font-medium text-xs text-center border border-gold/30 hover:border-gold transition-all flex items-center justify-center gap-1.5 group-hover:gap-2.5 shadow-sm"
              >
                <span>{p.btnText}</span>
                <span className="transition-transform duration-300">→</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Xuanji Master Teahouse Consultation Section ─── */}
      <section className="py-8 sm:py-12 px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="card-mystic-featured p-8 sm:p-12 relative overflow-hidden"
        >
          {/* Delicate vermillion corner seal */}
          <div className="absolute top-6 right-6 select-none opacity-80" aria-hidden="true">
            <span className="stamp-vermillion text-xs">玄機天算</span>
          </div>

          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-serif text-gold-light mb-4">
              {T(lang, '玄機大師 · 深度陪伴', 'Master Xuanji · Deep Companionship')}
            </h2>

            {/* Quick Consultation Starters */}
            <div className="space-y-1.5 mb-6">
              <p className="text-[11px] text-gold/80 font-serif">{T(lang, '常問天機示例：', 'Common Inquiries:')}</p>
              {masterInquiryPrompts.map((prompt, i) => (
                <Link
                  key={i}
                  href={session ? '/divination' : `/login?next=${encodeURIComponent('/divination')}`}
                  className="px-3 py-1.5 rounded-lg bg-foreground/[0.04] border border-gold/15 text-xs text-foreground/70 hover:border-gold/40 hover:text-gold-light transition-colors flex items-center gap-2 cursor-pointer font-serif block"
                >
                  <span className="text-gold/70 text-[10px]">✧</span>
                  <span>{T(lang, prompt.textZh, prompt.textEn)}</span>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href={session ? '/divination' : `/login?next=${encodeURIComponent('/divination')}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold text-navy-950 text-sm font-medium hover:bg-gold-light transition-all shadow-md shadow-gold/10 font-serif"
              >
                <span>{T(lang, '開始與大師品茗對話', 'Converse with Master')}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Cultivation & Nine Realms Banner (玄機九層) ─── */}
      <section className="py-8 sm:py-12 px-4 max-w-4xl mx-auto">
        <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 border border-gold/25 text-center relative overflow-hidden">
          <div className="mb-3 flex items-center justify-center">
            <YinYangIcon size={32} className="text-gold" />
          </div>
          <h3 className="text-lg sm:text-xl font-serif text-gold mb-2">
            {T(lang, '玄機九層 · 術數修為體系', 'The Nine Tiers of XuanJi · Metaphysical Cultivation')}
          </h3>
          <p className="text-xs sm:text-sm text-foreground/60 max-w-md mx-auto mb-6 font-light font-serif">
            {T(
              lang,
              '每一次排盤推演、大師請益與深究解惑，皆增益道行修為，自「初探玄門」漸入「天人合一」之化境。',
              'Every reading, master consultation, and in-depth inquiry cultivates your wisdom across nine metaphysical tiers.'
            )}
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 sm:gap-2 text-center mb-6">
            {REALM_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="p-2 rounded-xl bg-foreground/5 border border-line/10 hover:border-gold/30 transition-all flex flex-col items-center"
              >
                <div className="text-base mb-1">{tier.badge}</div>
                <div className="text-[10px] font-serif text-foreground/80 line-clamp-1">{T(lang, tier.name['zh-TW'] || tier.name.zh, tier.name.en)}</div>
              </div>
            ))}
          </div>

          <Link
            href={session ? '/profile?tab=growth' : `/login?next=${encodeURIComponent('/profile?tab=growth')}`}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-xl border border-gold/40 text-gold text-xs font-serif hover:bg-gold/10 hover:border-gold transition-colors"
          >
            <span>{T(lang, '探索玄機九層修為指南', 'Explore Nine Tiers Cultivation Guide')}</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ─── Footer & Serene Cultural Disclaimer ─── */}
      <footer className="py-12 px-4 border-t border-line/5 text-center text-xs text-foreground/40 font-light">
        <div className="flex items-center justify-center gap-2 mb-3">
          <YinYangIcon size={18} />
          <span className="font-serif text-sm text-gold/80">玄機 · XuanJi</span>
        </div>
        <p className="mb-2">玄機 XuanJi · {T(lang, '古法智慧，當代精算', 'Ancient Wisdom, Contemporary Calculation')}</p>
        <p className="text-foreground/30 max-w-lg mx-auto leading-relaxed">
          {T(
            lang,
            '本網站內容融合傳統易學源流與現代數理演算法，僅供文化研習與個人心性修養參照，不構成任何醫療、法律、財務或投資決策建議。',
            'Blends classical I Ching wisdom with modern algorithmic calculation for cultural inquiry and mindfulness reference only.'
          )}
        </p>
      </footer>
    </div>
  )
}
