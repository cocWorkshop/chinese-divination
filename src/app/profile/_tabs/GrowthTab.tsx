'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import { T } from '@/lib/i18n'
import type { UserGrowthProfile, RealmTierInfo, Achievement } from '@/lib/growth/types'
import { DivinationIcon, MasterSageIcon, SparkleIcon, SunMoonIcon, CheckSealIcon } from '@/components/DivinationIcons'

export default function GrowthTab() {
  const { lang } = useLang()
  const [profile, setProfile] = useState<UserGrowthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRealm, setSelectedRealm] = useState<RealmTierInfo | null>(null)

  useEffect(() => {
    fetch('/api/user/growth')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch growth profile')
        return res.json()
      })
      .then((data: UserGrowthProfile) => {
        setProfile(data)
        setSelectedRealm(data.currentRealm)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError(err.message || 'Error loading growth data')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-white/60 font-serif text-sm">
          {T(lang, '正在推演道行修為...', 'Calculating metaphysical cultivation...')}
        </p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center text-white/70">
        <p>{T(lang, '修為數據載入失敗，請稍後重試。', 'Failed to load cultivation data. Please try again.')}</p>
      </div>
    )
  }

  const current = profile.currentRealm
  const langKey = lang === 'en' ? 'en' : 'zh-TW'
  const activeRealmInfo = selectedRealm || current

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Cultivation Realm Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="oriental-sanctuary-card rounded-2xl p-6 sm:p-8 relative overflow-hidden text-center border border-gold/35"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(212,168,83,0.12) 0%, rgba(10,17,40,0.85) 70%)',
        }}
      >
        {/* Glow ambient background element */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: current.color }}
        />

        {/* Badge Avatar */}
        <div className="relative inline-block mb-4">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-lg transition-transform duration-500 hover:scale-105"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0.08), rgba(0,0,0,0.6))`,
              border: `2px solid ${current.color}`,
              boxShadow: `0 0 25px ${current.color}40`,
            }}
          >
            {current.badge}
          </div>
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide shadow-md whitespace-nowrap"
            style={{ backgroundColor: current.color, color: '#0a1128' }}
          >
            {current.title[langKey]}
          </span>
        </div>

        {/* Realm Title & Lore */}
        <h2 className="text-2xl sm:text-3xl font-serif text-gold tracking-wide mt-2">
          {current.name[langKey]}
        </h2>

        <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto mt-2 leading-relaxed font-sans">
          {current.description[langKey]}
        </p>

        <p className="text-gold/70 text-xs sm:text-sm italic font-serif mt-2 tracking-wide">
          {current.quote[langKey]}
        </p>

        {/* Experience Progress Bar */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="flex justify-between items-center text-xs text-white/70 mb-1.5">
            <span className="font-serif">
              {T(lang, '道行積累', 'Dao Hang (XP)')}: <strong className="text-gold font-bold">{profile.xp}</strong>
            </span>
            <span>
              {profile.nextRealm
                ? `${T(lang, '距下一階還需', 'Needed for next tier')}: ${profile.xpToNextLevel}`
                : T(lang, '已達極致境界', 'Pinnacle Reached')}
            </span>
          </div>

          <div className="w-full bg-navy-950/80 rounded-full h-3 p-0.5 border border-gold/30 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${profile.levelProgressPercent}%`,
                background: `linear-gradient(90deg, #d4a853, ${current.color})`,
                boxShadow: `0 0 10px ${current.color}80`,
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-white/40 mt-1">
            <span>{current.minXp} XP</span>
            <span>{profile.levelProgressPercent}%</span>
            <span>{profile.nextRealm ? `${profile.nextRealm.minXp} XP` : '∞'}</span>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Experience Source Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="oriental-sanctuary-card rounded-xl p-4 text-center border border-gold/20 hover:border-gold/40 transition-colors">
          <DivinationIcon type="iching" size={26} className="mx-auto mb-1.5 text-gold" />
          <div className="text-sm font-serif text-white/90">{T(lang, '占卜解卦', 'Divinations')}</div>
          <div className="text-xs text-white/50 mt-0.5">{profile.breakdown.divination.count} {T(lang, '次', 'times')}</div>
          <div className="text-gold text-sm font-semibold mt-1">
            +{profile.breakdown.divination.xp} {T(lang, '道行', 'XP')}
          </div>
          <span className="inline-block mt-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
            50 XP / {T(lang, '次', 'run')}
          </span>
        </div>

        <div className="oriental-sanctuary-card rounded-xl p-4 text-center border border-gold/20 hover:border-gold/40 transition-colors">
          <MasterSageIcon size={26} className="mx-auto mb-1.5 text-gold" />
          <div className="text-sm font-serif text-white/90">{T(lang, '大師請益', 'Master Consults')}</div>
          <div className="text-xs text-white/50 mt-0.5">{profile.breakdown.master.count} {T(lang, '輪', 'turns')}</div>
          <div className="text-gold text-sm font-semibold mt-1">
            +{profile.breakdown.master.xp} {T(lang, '道行', 'XP')}
          </div>
          <span className="inline-block mt-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
            20 XP / {T(lang, '輪', 'turn')}
          </span>
        </div>

        <div className="oriental-sanctuary-card rounded-xl p-4 text-center border border-gold/20 hover:border-gold/40 transition-colors">
          <SunMoonIcon size={26} className="mx-auto mb-1.5 text-gold" />
          <div className="text-sm font-serif text-white/90">{T(lang, '卦意深究', 'Deep Q&A')}</div>
          <div className="text-xs text-white/50 mt-0.5">{profile.breakdown.chat.count} {T(lang, '次', 'rounds')}</div>
          <div className="text-gold text-sm font-semibold mt-1">
            +{profile.breakdown.chat.xp} {T(lang, '道行', 'XP')}
          </div>
          <span className="inline-block mt-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
            10 XP / {T(lang, '次', 'round')}
          </span>
        </div>
      </div>

      {/* ── 3. Master Xuanji Realm Greeting ── */}
      <div
        className="oriental-sanctuary-card rounded-2xl p-5 border border-gold/30 relative flex items-start gap-4"
        style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.08), rgba(10,17,40,0.7))' }}
      >
        <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
          <MasterSageIcon size={24} />
        </div>
        <div className="flex-1">
          <div className="text-xs font-serif text-gold tracking-wide">
            {T(lang, '玄機大師 · 應修為寄語', 'Master Xuanji · Realm Reflection')}
          </div>
          <p className="text-sm text-white/85 mt-1 font-serif leading-relaxed italic">
            「{profile.masterGreeting[langKey]}」
          </p>
        </div>
      </div>

      {/* ── 4. The Nine Metaphysical Realms Roadmap (易道九階) ── */}
      <div className="oriental-sanctuary-card rounded-2xl p-6 border border-gold/25">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gold/15">
          <div className="flex items-center gap-2">
            <DivinationIcon type="iching" size={20} className="text-gold" />
            <h3 className="font-serif text-lg text-gold">{T(lang, '易道九階圖譜', 'Nine Realms of Metaphysics')}</h3>
          </div>
          <span className="text-xs text-white/40 font-serif">
            {T(lang, '點擊查看各階真義', 'Tap to view realm details')}
          </span>
        </div>

        {/* Horizontal / Grid Stepper for 9 Tiers */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          {profile.realms.map((realm) => {
            const isCurrent = realm.tier === profile.tier
            const isUnlocked = profile.xp >= realm.minXp
            const isSelected = activeRealmInfo.tier === realm.tier

            return (
              <button
                key={realm.tier}
                onClick={() => setSelectedRealm(realm)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-300 relative group ${
                  isSelected
                    ? 'border-gold bg-gold/20 shadow-md shadow-gold/10'
                    : isCurrent
                    ? 'border-gold/60 bg-gold/10'
                    : isUnlocked
                    ? 'border-white/20 bg-white/5 hover:border-white/40'
                    : 'border-white/5 bg-navy-950/40 opacity-40 hover:opacity-70'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-1.5 px-1 py-0.2 text-[9px] bg-gold text-navy-950 rounded-full font-bold">
                    NOW
                  </span>
                )}
                <span className="text-xl mb-1">{realm.badge}</span>
                <span className="text-[11px] font-serif text-white/90 text-center leading-tight">
                  {realm.name[langKey]}
                </span>
                <span className="text-[9px] text-white/40 mt-1">
                  {realm.minXp} XP
                </span>
              </button>
            )
          })}
        </div>

        {/* Selected Realm Detail Card */}
        {activeRealmInfo && (
          <motion.div
            key={activeRealmInfo.tier}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-navy-900/60 border border-gold/20 text-xs sm:text-sm space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-gold flex items-center gap-1.5">
                <span>{activeRealmInfo.badge}</span>
                <span>{activeRealmInfo.title[langKey]}</span>
              </span>
              <span className="text-white/50 text-[11px]">
                {T(lang, '解鎖要求', 'Requirement')}: {activeRealmInfo.minXp} XP
              </span>
            </div>
            <p className="text-white/70 leading-relaxed">
              {activeRealmInfo.description[langKey]}
            </p>
            <p className="text-gold/60 italic font-serif text-[11px]">
              {activeRealmInfo.quote[langKey]}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── 5. Metaphysical Achievements Wall (術數修為印記) ── */}
      <div className="oriental-sanctuary-card rounded-2xl p-6 border border-gold/25">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gold/15">
          <div className="flex items-center gap-2">
            <SparkleIcon size={20} className="text-gold" />
            <h3 className="font-serif text-lg text-gold">{T(lang, '術數修為印記', 'Achievements & Seals')}</h3>
          </div>
          <span className="text-xs text-white/50 font-serif">
            {profile.achievements.filter(a => a.unlocked).length} / {profile.achievements.length} {T(lang, '已點亮', 'Unlocked')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.achievements.map((item: Achievement) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                item.unlocked
                  ? 'border-gold/40 bg-gold/10 shadow-sm'
                  : 'border-white/10 bg-navy-950/40 opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                  item.unlocked
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'bg-white/5 text-white/30 border border-white/10'
                }`}
              >
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-sm font-medium text-white truncate">
                    {item.name[langKey]}
                  </h4>
                  {item.unlocked ? (
                    <span className="text-[10px] text-gold font-bold px-1.5 py-0.5 rounded bg-gold/15 border border-gold/30 inline-flex items-center gap-1 font-serif">
                      <CheckSealIcon size={12} color="#d4a853" />
                      <span>{T(lang, '已得', 'Unlocked')}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/40 font-mono">
                      {item.currentVal} / {item.targetVal}
                    </span>
                  )}
                </div>

                <p className="text-xs text-white/60 mt-1 leading-snug">
                  {item.description[langKey]}
                </p>

                {!item.unlocked && (
                  <div className="w-full bg-navy-950 rounded-full h-1.5 mt-2 overflow-hidden border border-white/10">
                    <div
                      className="bg-gold/50 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
