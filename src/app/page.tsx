'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import StarField from '@/components/StarField'
import YinYangIcon from '@/components/YinYangIcon'
import { DivinationIcon, SunMoonIcon, CheckSealIcon, CloseIcon } from '@/components/DivinationIcons'
import { getDailyAlmanac } from '@/lib/dailyAlmanac'
import { REALM_TIERS } from '@/lib/growth/growthSystem'

export default function HomePage() {
  const { lang } = useLang()
  const { data: session } = useSession()
  const isZh = lang !== 'en'

  // Daily Almanac data
  const almanac = useMemo(() => getDailyAlmanac(), [])

  // Core 6 divination portals
  const divinationPortals = [
    {
      id: 'bazi',
      name: isZh ? '四柱八字' : 'BaZi Destiny',
      tag: isZh ? '本命格局 · 十年大運' : 'Natal Chart & Decades',
      desc: isZh
        ? '依年月日時排定四柱干支，洞悉先天格局、喜用五行、十年大運流轉與流年吉凶。'
        : 'Four Pillars of Destiny charting your five elements, decade fate cycles, and annual fortunes.',
      highlights: isZh
        ? ['四柱排盤', '胎命身三垣', '十年大運', '流年精批']
        : ['Four Pillars', 'Three Palaces', '10-Yr Da Yun', 'Annual Fortunes'],
      href: '/divination/bazi',
      btnText: isZh ? '起盤推演' : 'Chart Destiny',
    },
    {
      id: 'ziwei',
      name: isZh ? '紫微斗數' : 'Zi Wei Dou Shu',
      tag: isZh ? '帝王之術 · 十二宮盤' : 'Imperial Astrology',
      desc: isZh
        ? '以紫微星群佈列命身十二宮，詳參十四主星、四化飛星與大限流年氣運吉凶。'
        : 'Map your 12 life palaces, 14 major celestial stars, and four transformations with pinpoint precision.',
      highlights: isZh
        ? ['命身十二宮', '十四主星', '四化飛星', '大限流年']
        : ['12 Palaces', 'Major Stars', 'Four Transformations', 'Life Periods'],
      href: '/divination/ziwei',
      btnText: isZh ? '探索命盤' : 'Explore Stars',
    },
    {
      id: 'liuyao',
      name: isZh ? '六爻神課' : 'Liu Yao Oracle',
      tag: isZh ? '一事一占 · 當下決疑' : 'Immediate Resolution',
      desc: isZh
        ? '漢代京房易納甲之法，銅錢六搖成卦。針對事業晉升、求財投資、婚戀取捨等具體疑難。'
        : 'Classical King Fang coin casting oracle. Instant, precise situational guidance for critical dilemmas.',
      highlights: isZh
        ? ['銅錢搖卦', '世應生克', '六親六神', '精準應期']
        : ['Coin Oracle', 'Host & Guest', 'Six Relatives', 'Exact Timing'],
      href: '/divination/liuyao',
      btnText: isZh ? '即刻起卦' : 'Cast Oracle',
    },
    {
      id: 'qimen',
      name: isZh ? '奇門遁甲' : 'Qi Men Dun Jia',
      tag: isZh ? '時空運籌 · 出行擇吉' : 'Spatial Strategy',
      desc: isZh
        ? '三奇六儀、八門九星排盤演局。用於商務談判、出行出差、方位擇吉與空間制勝。'
        : 'Ancient spatial strategy system mapping celestial gates and stars to choose optimal timing and direction.',
      highlights: isZh
        ? ['九星八門', '三奇六儀', '方位吉凶', '出行擇吉']
        : ['Nine Stars', 'Eight Gates', 'Directions', 'Timing Selection'],
      href: '/divination/qimen',
      btnText: isZh ? '演局擇吉' : 'Plan Strategy',
    },
    {
      id: 'meihua',
      name: isZh ? '梅花易數' : 'Mei Hua Yi Shu',
      tag: isZh ? '觸機起卦 · 心易自通' : 'Synchronicity Oracle',
      desc: isZh
        ? '宋代邵康節先生所創，觀物聽聲、靈機觸動即成一卦，體用生克直斷事態成敗。'
        : 'Shao Yong’s intuitive synchronicity divination. Transform any real-world sign into instant clarity.',
      highlights: isZh
        ? ['物象起卦', '體用生克', '事應吉凶', '靈動敏捷']
        : ['Sign Triggered', 'Body & Use', 'Outcome Insight', 'Nimble Oracle'],
      href: '/divination/meihua',
      btnText: isZh ? '感應起卦' : 'Trigger Oracle',
    },
    {
      id: 'fengshui',
      name: isZh ? '環境風水' : 'Feng Shui Harmony',
      tag: isZh ? '藏風聚氣 · 宅運調和' : 'Environmental Flow',
      desc: isZh
        ? '巒頭形勢與九宮飛星理氣合參，診斷住宅辦公氣場吉凶，佈局旺財旺運安康格局。'
        : 'Analyze environmental Qi, Nine Flying Stars, and spatial layouts to harmonize wealth and well-being.',
      highlights: isZh
        ? ['巒頭形勢', '九宮飛星', '煞氣化解', '財位佈局']
        : ['Landform Qi', 'Flying Stars', 'Remedies', 'Wealth Positions'],
      href: '/divination/fengshui',
      btnText: isZh ? '佈局宅運' : 'Harmonize Space',
    },
  ]

  // Master quick inquiry topics
  const masterInquiryPrompts = [
    { textZh: '大師，如何看待命中定數與行事策略？', textEn: 'Master, how should one balance destiny and effort?' },
    { textZh: '今年逢犯太歲/刑衝，有何避凶指引？', textEn: 'Facing clashes this year, how to mitigate risks?' },
    { textZh: '事業面臨十字路口，該守成還是主動破局？', textEn: 'At career crossroads: preserve or pioneer?' },
  ]

  return (
    <div className="flex-1 bg-navy-950 text-white selection:bg-gold/20 selection:text-gold-light relative overflow-x-hidden">
      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[85vh] sm:min-h-[88vh] flex flex-col items-center justify-center overflow-hidden px-4 pt-16 pb-12 sm:pt-20 sm:pb-16">
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
                {isZh
                  ? `歡迎歸位，${session.user.name || '道友'}`
                  : `Welcome back, ${session.user.name || 'Friend'}`}
              </span>
              <span className="text-gold/50">·</span>
              <span className="text-gold font-serif">{isZh ? '玄門修行中' : 'Cultivating'}</span>
              <Link href="/divination" className="text-gold underline ml-1 hover:text-gold-light">
                {isZh ? '我的命盤簿 →' : 'Readings →'}
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
              XuanJi · Modern Metaphysics
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 font-serif font-light mb-3">
              {isZh ? '古法智慧 · 當代精算' : 'Ancient Wisdom, Contemporary Calculation'}
            </p>
            <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto leading-relaxed font-light mb-8">
              {isZh
                ? '「不論是一生大運起伏，還是當下一事之惑，皆有數可循。」'
                : '“Whether charting the arc of a lifetime or resolving an immediate crossroad, every fate has its number.”'}
            </p>
          </motion.div>

          {/* Quick Oracle Inquiries (叩問天機引導條) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="glass-card rounded-2xl p-4 sm:p-5 border border-gold/25 max-w-2xl mx-auto mb-10 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center justify-between text-xs text-gold/80 mb-3 px-1">
              <span className="flex items-center gap-1.5 font-serif">
                <span className="text-gold">✧</span>
                <span>{isZh ? '今日心有所惑？叩問天機' : 'Have a question? Inquire the Oracle'}</span>
              </span>
              <span className="text-[11px] text-white/40 font-serif">
                {isZh ? '點選意向直達專屬術數' : 'Select intent for direct divination'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link
                href="/divination/bazi"
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-gold/[0.1] border border-gold/15 hover:border-gold/40 text-center transition-all group"
              >
                <div className="mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                  <DivinationIcon type="bazi" size={26} className="text-gold" />
                </div>
                <div className="text-xs font-serif font-medium text-gold-light">{isZh ? '觀命定盤' : 'Life Blueprint'}</div>
                <div className="text-[10px] text-white/40 mt-0.5 font-serif">{isZh ? '終生大運流年' : 'BaZi Chart'}</div>
              </Link>
              <Link
                href="/divination/liuyao"
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-gold/[0.1] border border-gold/15 hover:border-gold/40 text-center transition-all group"
              >
                <div className="mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                  <DivinationIcon type="liuyao" size={26} className="text-gold" />
                </div>
                <div className="text-xs font-serif font-medium text-gold-light">{isZh ? '當下決疑' : 'Immediate Doubt'}</div>
                <div className="text-[10px] text-white/40 mt-0.5 font-serif">{isZh ? '搖卦斷吉凶' : 'Liu Yao Oracle'}</div>
              </Link>
              <Link
                href="/divination/ziwei"
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-gold/[0.1] border border-gold/15 hover:border-gold/40 text-center transition-all group"
              >
                <div className="mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                  <DivinationIcon type="ziwei" size={26} className="text-gold" />
                </div>
                <div className="text-xs font-serif font-medium text-gold-light">{isZh ? '星曜行度' : 'Star Palaces'}</div>
                <div className="text-[10px] text-white/40 mt-0.5 font-serif">{isZh ? '十二宮主星' : 'Zi Wei Astrology'}</div>
              </Link>
              <Link
                href="/divination/qimen"
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-gold/[0.1] border border-gold/15 hover:border-gold/40 text-center transition-all group"
              >
                <div className="mb-1.5 group-hover:scale-110 transition-transform flex items-center justify-center">
                  <DivinationIcon type="qimen" size={26} className="text-gold" />
                </div>
                <div className="text-xs font-serif font-medium text-gold-light">{isZh ? '時空擇吉' : 'Timing & Place'}</div>
                <div className="text-[10px] text-white/40 mt-0.5 font-serif">{isZh ? '出行商務奇門' : 'Qi Men Strategy'}</div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Daily Almanac & Hexagram Section (今日黃曆與天機卦) ─── */}
      <section className="py-8 px-4 max-w-5xl mx-auto -mt-6 sm:-mt-8 relative z-20">
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
                  {isZh ? '今日黃曆' : 'Daily Almanac'}
                </span>
                <span className="text-xs text-white/60 font-mono">{almanac.solarDate}</span>
              </div>
              <div className="text-lg sm:text-xl font-serif text-gold font-medium">
                {almanac.ganZhi}
              </div>
              <div className="text-xs text-white/60 flex items-center gap-1.5 font-serif">
                <SunMoonIcon size={13} className="text-gold/80" />
                <span>農曆 {almanac.lunarDate}</span>
                {almanac.solarTerm && (
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-gold text-[10px]">
                    {almanac.solarTerm}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1 font-serif">
                <span className="text-xs text-white/50">{isZh ? '值日五行' : 'Element'}:</span>
                <span className="text-xs font-bold text-amber-200 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {almanac.dominantElement}
                </span>
                <span className="text-xs text-white/50 ml-2">{isZh ? '氣數指數' : 'Index'}:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{almanac.luckScore}%</span>
              </div>
            </div>

            {/* Center: Daily Hexagram (5 cols) */}
            <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-gold/15 pb-4 md:pb-0 md:pr-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gold/80 font-serif flex items-center gap-1.5">
                  <span>☰</span>
                  <span>{isZh ? '今日天機卦' : "Today's Oracle Hexagram"}</span>
                </div>
                <span className="text-[11px] text-white/40 font-serif">{almanac.dailyHexagram.energy}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl text-gold font-serif leading-none select-none">
                  {almanac.dailyHexagram.symbol}
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold text-white">
                    {almanac.dailyHexagram.name}
                  </h3>
                  <p className="text-xs text-gold/90 font-serif line-clamp-1 mt-0.5">
                    {almanac.dailyHexagram.judgment}
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/60 leading-relaxed font-light font-serif">
                {almanac.dailyHexagram.meaning}
              </p>
            </div>

            {/* Right: Yi & Ji (3 cols) */}
            <div className="md:col-span-3 space-y-3">
              <div>
                <div className="text-[10px] text-emerald-400 font-bold mb-1 flex items-center gap-1 font-serif">
                  <CheckSealIcon size={12} color="#2d8a6e" />
                  <span>{isZh ? '今日所宜' : 'Auspicious (Yi)'}</span>
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
                  <span>{isZh ? '今日所忌' : 'Avoid (Ji)'}</span>
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
                {isZh ? '叩求今日專屬卦辭 →' : 'Cast Personal Hexagram →'}
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Six Core Metaphysical Arts Portal Grid (六大古法術數現代化專區) ─── */}
      <section className="py-12 sm:py-16 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-gold/70 font-sans mb-1">
            {isZh ? '六派源流 · 現代演繹' : 'Six Classical Systems'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif text-gold-light font-medium">
            {isZh ? '六大正統術數門戶' : 'The Six Divination Portals'}
          </h2>
          <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mt-2 font-light">
            {isZh
              ? '依據不同時空維度與問事焦點，自由切換最契合的古法推演體系。'
              : 'Switch seamlessly between classical systems tailored to destiny, immediate choices, or spatial flow.'}
          </p>
        </div>

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

                <h3 className="text-xl font-serif font-medium text-white group-hover:text-gold-light transition-colors mb-2">
                  {p.name}
                </h3>

                <p className="text-xs text-white/60 leading-relaxed font-light mb-4 min-h-[2.5rem]">
                  {p.desc}
                </p>

                {/* Feature Chips */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {p.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-gold/15 text-white/70 font-serif"
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
      <section className="py-10 sm:py-16 px-4 max-w-4xl mx-auto">
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
            <p className="text-xs uppercase tracking-[0.25em] text-gold/70 font-sans mb-2">
              {isZh ? '名師對坐 · 知無不言' : 'Personal Master Consultation'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif text-gold-light mb-3">
              {isZh ? '玄機大師 · 深度陪伴' : 'Master Xuanji'}
            </h2>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed font-light mb-5">
              {isZh
                ? '不只是靜態的排盤紙。大師以古籍源流為本、結合現代推演，能調取您的本命星盤、逐段深入解讀、追溯節氣流年，為您解答心中的連環之惑。'
                : 'Far beyond a static chart. Master Xuanji recalls your previous readings, traces seasonal rhythms, and answers your follow-up questions like sitting with a true sage.'}
            </p>

            {/* Quick Consultation Starters */}
            <div className="space-y-1.5 mb-6">
              <p className="text-[11px] text-gold/80 font-serif">{isZh ? '常問天機示例：' : 'Common Inquiries:'}</p>
              {masterInquiryPrompts.map((prompt, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-gold/15 text-xs text-white/70 hover:border-gold/40 hover:text-gold-light transition-colors flex items-center gap-2 cursor-pointer font-serif"
                >
                  <span className="text-gold/70 text-[10px]">✧</span>
                  <span>{isZh ? prompt.textZh : prompt.textEn}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href={session ? '/divination' : `/login?next=${encodeURIComponent('/divination')}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold text-navy-950 text-sm font-medium hover:bg-gold-light transition-all shadow-md shadow-gold/10 font-serif"
              >
                <span>{isZh ? '開始與大師品茗對話' : 'Converse with Master'}</span>
                <span>→</span>
              </Link>
              <span className="text-xs text-white/40 font-serif">
                {isZh ? '隨時在排盤結果中直接追問' : 'Available on any reading result'}
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Cultivation & Nine Realms Banner (玄門九境) ─── */}
      <section className="py-10 px-4 max-w-4xl mx-auto">
        <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 border border-gold/25 text-center relative overflow-hidden">
          <div className="mb-3 flex items-center justify-center">
            <YinYangIcon size={32} className="text-gold" />
          </div>
          <h3 className="text-lg sm:text-xl font-serif text-gold mb-2">
            {isZh ? '玄門九境 · 術數修為體系' : 'The Nine Metaphysical Realms'}
          </h3>
          <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto mb-6 font-light font-serif">
            {isZh
              ? '每一次排盤推演、大師請益與深究解惑，皆增益道行修為，自「初探玄門」漸入「天人合一」之化境。'
              : 'Every reading, master consultation, and in-depth inquiry cultivates your wisdom across nine metaphysical tiers.'}
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 sm:gap-2 text-center mb-6">
            {REALM_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-gold/30 transition-all flex flex-col items-center"
              >
                <div className="text-base mb-1">{tier.badge}</div>
                <div className="text-[10px] font-serif text-white/80 line-clamp-1">{tier.name[lang as 'zh' | 'zh-TW' | 'en'] || tier.name.zh}</div>
              </div>
            ))}
          </div>

          <Link
            href="/start"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-xl border border-gold/40 text-gold text-xs font-serif hover:bg-gold/10 hover:border-gold transition-colors"
          >
            <span>{isZh ? '探索玄門九境修為指南' : 'Explore Cultivation Guide'}</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ─── Footer & Serene Cultural Disclaimer ─── */}
      <footer className="py-12 px-4 border-t border-white/5 text-center text-xs text-white/40 font-light">
        <div className="flex items-center justify-center gap-2 mb-3">
          <YinYangIcon size={18} />
          <span className="font-serif text-sm text-gold/80">玄機 · XuanJi</span>
        </div>
        <p className="mb-2">玄機 XuanJi · 古法智慧，當代傳承</p>
        <p className="text-white/30 max-w-lg mx-auto leading-relaxed">
          {isZh
            ? '本網站內容融合傳統易學源流與現代數理演算法，僅供文化研習與個人心性修養參照，不構成任何醫療、法律、財務或投資決策建議。'
            : 'Blends classical I Ching wisdom with modern algorithmic calculation for cultural inquiry and mindfulness reference only.'}
        </p>
      </footer>
    </div>
  )
}
