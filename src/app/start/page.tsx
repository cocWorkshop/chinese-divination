'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import YinYangIcon from '@/components/YinYangIcon'
import { AlertIcon } from '@/components/DivinationIcons'
import BirthplaceInput from '@/components/BirthplaceInput'
import HelpTooltip from '@/components/HelpTooltip'
import { useLang } from '@/components/LanguageContext'
import {
  generateOnboardingSpark,
  MODULE_ROADMAP_CATEGORIES,
  type OnboardingSparkResult,
  type HeuristicInquiry,
} from '@/lib/share/../onboarding/onboardingSpark'
import { EARLY_LATE_ZI_EXPLANATION } from '@/app/divination/guidanceConfig'

const SHICHEN = [
  { value: 'zi_early', zh: '早子時 (00:00-01:00)', en: 'Early Zi (00:00-01:00)' },
  { value: 'chou', zh: '丑時 (01:00-03:00)', en: 'Chou (01:00-03:00)' },
  { value: 'yin', zh: '寅時 (03:00-05:00)', en: 'Yin (03:00-05:00)' },
  { value: 'mao', zh: '卯時 (05:00-07:00)', en: 'Mao (05:00-07:00)' },
  { value: 'chen', zh: '辰時 (07:00-09:00)', en: 'Chen (07:00-09:00)' },
  { value: 'si', zh: '巳時 (09:00-11:00)', en: 'Si (09:00-11:00)' },
  { value: 'wu', zh: '午時 (11:00-13:00)', en: 'Wu (11:00-13:00)' },
  { value: 'wei', zh: '未時 (13:00-15:00)', en: 'Wei (13:00-15:00)' },
  { value: 'shen', zh: '申時 (15:00-17:00)', en: 'Shen (15:00-17:00)' },
  { value: 'you', zh: '酉時 (17:00-19:00)', en: 'You (17:00-19:00)' },
  { value: 'xu', zh: '戌時 (19:00-21:00)', en: 'Xu (19:00-21:00)' },
  { value: 'hai', zh: '亥時 (21:00-23:00)', en: 'Hai (21:00-23:00)' },
  { value: 'zi_late', zh: '晚子時 (23:00-00:00)', en: 'Late Zi (23:00-00:00)' },
]

export default function StartPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-gold/60">載入中...</div>}>
      <StartPageInner />
    </Suspense>
  )
}

function StartPageInner() {
  const { lang } = useLang()
  const isZh = lang !== 'en'
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialStep = (searchParams.get('step') as 'profile' | 'spark' | 'roadmap') || 'profile'
  const [step, setStep] = useState<'profile' | 'spark' | 'roadmap'>(initialStep)

  // Form State
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [birthDate, setBirthDate] = useState('')
  const [timeMode, setTimeMode] = useState<'fuzzy' | 'precise'>('fuzzy')
  const [birthTime, setBirthTime] = useState('wu')
  const [exactTime, setExactTime] = useState('12:00')
  const [birthPlace, setBirthPlace] = useState('')
  const [birthLat, setBirthLat] = useState<number | null>(null)
  const [birthLng, setBirthLng] = useState<number | null>(null)
  const [consent, setConsent] = useState(true)

  // Spark & UI State
  const [spark, setSpark] = useState<OnboardingSparkResult | null>(null)
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Restore draft or pre-seed from existing profile on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('xj_onboarding_birth')
      if (stored) {
        const d = JSON.parse(stored)
        if (d.name) setName(d.name)
        if (d.gender) setGender(d.gender)
        if (d.calendarType) setCalendarType(d.calendarType)
        if (d.birthDate) setBirthDate(d.birthDate)
        if (d.birthTime) setBirthTime(d.birthTime)
        if (d.timeMode) setTimeMode(d.timeMode)
        if (d.exactTime) setExactTime(d.exactTime)
        if (d.birthPlace) setBirthPlace(d.birthPlace)
      }
    } catch { /* ignore */ }
  }, [])

  // Sync step changes to URL
  const changeStep = (newStep: 'profile' | 'spark' | 'roadmap') => {
    setStep(newStep)
    router.replace(`/start?step=${newStep}`)
  }

  // Handle Form Submission -> Generate Spark
  const handleGenerateSpark = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!consent) {
      toast.error(isZh ? '請先閱讀並同意隱私政策與用戶協議' : 'Please agree to Privacy Policy & Terms')
      return
    }

    if (!birthDate) {
      toast.error(isZh ? '請輸入出生日期' : 'Please enter birth date')
      return
    }

    setSaving(true)
    const inputData = {
      name: name.trim() || null,
      gender,
      calendarType,
      birthDate,
      birthTime,
      timeMode,
      exactTime: timeMode === 'precise' ? exactTime : undefined,
      birthPlace: birthPlace || undefined,
    }

    // Cache locally for seamless prefill across all divination forms
    try {
      localStorage.setItem('xj_onboarding_birth', JSON.stringify({ ...inputData, birthLat, birthLng }))
      localStorage.setItem(
        'xj_user_birth_info',
        JSON.stringify({
          birthDate,
          birthTime: timeMode === 'precise' ? undefined : birthTime,
          exactTime: timeMode === 'precise' ? exactTime : undefined,
          gender,
          birthPlace,
          name,
        })
      )
    } catch { /* ignore */ }

    // Silently sync to logged-in user profile if session exists
    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim() || undefined,
        birthDate,
        birthTime: timeMode === 'precise' ? undefined : birthTime,
        exactTime: timeMode === 'precise' ? exactTime : undefined,
        gender,
        calendarType,
        timeMode,
        birthPlace: birthPlace || undefined,
        birthLat: birthLat ?? undefined,
        birthLng: birthLng ?? undefined,
      }),
    }).catch(() => {})

    // Generate instant personality spark
    const res = generateOnboardingSpark(inputData)
    setSpark(res)
    setSaving(false)
    changeStep('spark')
    toast.success(isZh ? '命盤已起，性格特質已解鎖！' : 'Natal spark generated!')
  }

  // Handle Skip Action with Confirmation
  const handleConfirmSkip = () => {
    setShowSkipModal(false)
    changeStep('roadmap')
    toast(
      isZh
        ? '您已跳過生辰填寫，可自由探索六爻、梅花、風水等無需生辰的占卜模組'
        : 'Skipped birth info. You can still explore I Ching, Liu Yao, Plum Blossom and Feng Shui.',
      { duration: 4500 }
    )
  }

  // Navigate directly with prefilled inquiry & birth context
  const handleSelectInquiry = (inquiry: HeuristicInquiry) => {
    const q = isZh ? inquiry.questionZh : inquiry.questionEn
    const params = new URLSearchParams()
    params.set('question', q)
    if (birthDate) params.set('birthDate', birthDate)
    if (birthTime) params.set('birthTime', birthTime)
    if (gender) params.set('gender', gender)
    if (birthPlace) params.set('birthPlace', birthPlace)
    if (timeMode) params.set('timeMode', timeMode)
    if (timeMode === 'precise' && exactTime) params.set('exactTime', exactTime)

    router.push(`/divination/${inquiry.recommendedType}?${params.toString()}`)
  }

  return (
    <main className="relative flex-1 flex flex-col items-center justify-start px-3 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto w-full">
      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <YinYangIcon size={28} />
          <span className="font-serif text-xl sm:text-2xl text-gold tracking-wider">玄機 · XuanJi</span>
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
          {isZh ? '東方命理新用戶導引 · 本命啟蒙' : 'Oriental Metaphysics Onboarding & Natal Spark'}
        </p>
      </div>

      {/* Main Content Card with Smooth Transitions */}
      <AnimatePresence mode="wait">
        {step === 'profile' && (
          <motion.div
            key="step-profile"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-lg glass-card rounded-2xl p-5 sm:p-8 border border-gold/30 shadow-2xl relative"
          >
            <div className="text-center mb-6">
              <h1 className="font-serif text-xl sm:text-2xl text-gold-light mb-1.5 font-medium">
                {isZh ? '填寫生辰，開啟本命星盤' : 'Enter Birth Details to Awaken Your Chart'}
              </h1>
              <p className="text-xs text-white/60 leading-relaxed">
                {isZh
                  ? '如 CoStar 般即刻推演您的日主特質、五行氣場與專屬靈犀心問'
                  : 'Instant personality spark, elemental balance, and tailored metaphysical inquiries.'}
              </p>
            </div>

            <form onSubmit={handleGenerateSpark} className="space-y-4 text-left">
              {/* Name & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    {isZh ? '姓名 / 尊稱 (可選)' : 'Name (optional)'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isZh ? '如：雲風' : 'e.g. Alex'}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900/80 border border-gold/25 text-white text-xs sm:text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    {isZh ? '性別' : 'Gender'}
                  </label>
                  <div className="grid grid-cols-2 rounded-xl border border-gold/25 bg-navy-900/80 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`py-1.5 rounded-lg transition-all ${
                        gender === 'male' ? 'bg-gold text-navy-950 font-medium shadow-sm' : 'text-white/60'
                      }`}
                    >
                      {isZh ? '乾造 (男)' : 'Male'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`py-1.5 rounded-lg transition-all ${
                        gender === 'female' ? 'bg-gold text-navy-950 font-medium shadow-sm' : 'text-white/60'
                      }`}
                    >
                      {isZh ? '坤造 (女)' : 'Female'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Type & Birth Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    {isZh ? '曆法選擇' : 'Calendar'}
                  </label>
                  <div className="grid grid-cols-2 rounded-xl border border-gold/25 bg-navy-900/80 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setCalendarType('solar')}
                      className={`py-1.5 rounded-lg transition-all ${
                        calendarType === 'solar' ? 'bg-gold text-navy-950 font-medium' : 'text-white/60'
                      }`}
                    >
                      {isZh ? '公曆 (陽曆)' : 'Solar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarType('lunar')}
                      className={`py-1.5 rounded-lg transition-all ${
                        calendarType === 'lunar' ? 'bg-gold text-navy-950 font-medium' : 'text-white/60'
                      }`}
                    >
                      {isZh ? '農曆 (陰曆)' : 'Lunar'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    {isZh ? '出生日期' : 'Birth Date'} <span className="text-gold">*</span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-navy-900/80 border border-gold/25 text-white text-xs sm:text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Time Mode Toggle & Time Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-white/70">
                      {isZh ? '出生時間 / 時辰' : 'Birth Time'}
                    </label>
                    <HelpTooltip
                      content={isZh ? EARLY_LATE_ZI_EXPLANATION.tooltip.zh : EARLY_LATE_ZI_EXPLANATION.tooltip.en}
                      title={isZh ? EARLY_LATE_ZI_EXPLANATION.label.zh : EARLY_LATE_ZI_EXPLANATION.label.en}
                    />
                  </div>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTimeMode('fuzzy')}
                      className={`px-2 py-0.5 rounded ${
                        timeMode === 'fuzzy' ? 'text-gold bg-gold/15' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {isZh ? '時辰' : 'Shichen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('precise')}
                      className={`px-2 py-0.5 rounded ${
                        timeMode === 'precise' ? 'text-gold bg-gold/15' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {isZh ? '精確時分' : 'Exact Time'}
                    </button>
                  </div>
                </div>

                {timeMode === 'fuzzy' ? (
                  <select
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900/80 border border-gold/25 text-white text-xs sm:text-sm focus:outline-none focus:border-gold"
                  >
                    {SHICHEN.map((s) => (
                      <option key={s.value} value={s.value}>
                        {isZh ? s.zh : s.en}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="time"
                    value={exactTime}
                    onChange={(e) => setExactTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-900/80 border border-gold/25 text-white text-xs sm:text-sm focus:outline-none focus:border-gold"
                  />
                )}
              </div>

              {/* Birthplace */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  {isZh ? '出生城市 (校正真太陽時)' : 'Birth City (True Solar Time)'}
                </label>
                <BirthplaceInput
                  inputId="start-birthplace"
                  value={birthPlace}
                  onChange={(v) => setBirthPlace(v)}
                  onLatLngChange={(lat, lng) => {
                    setBirthLat(lat)
                    setBirthLng(lng)
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900/80 border border-gold/25 text-white text-xs sm:text-sm focus:outline-none focus:border-gold"
                  placeholder={isZh ? '輸入城市名稱 (如：北京、上海、臺北、紐約...)' : 'Search city...'}
                />
              </div>

              {/* Privacy Consent Agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-2 text-[11px] text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-gold w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
                  />
                  <span>
                    {isZh ? (
                      <>
                        我已閱讀並同意{' '}
                        <Link href="/privacy" target="_blank" className="text-gold underline hover:text-gold-light">
                          隱私政策
                        </Link>{' '}
                        與{' '}
                        <Link href="/terms" target="_blank" className="text-gold underline hover:text-gold-light">
                          用戶協議
                        </Link>
                        ，生辰資料僅用於命理計算。
                      </>
                    ) : (
                      <>
                        I have read and agree to the{' '}
                        <Link href="/privacy" target="_blank" className="text-gold underline hover:text-gold-light">
                          Privacy Policy
                        </Link>{' '}
                        and{' '}
                        <Link href="/terms" target="_blank" className="text-gold underline hover:text-gold-light">
                          Terms
                        </Link>
                        .
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-gold text-navy-950 font-semibold text-sm hover:bg-gold-light transition-all shadow-md shadow-gold/15 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{saving ? (isZh ? '排盤演算中...' : 'Calculating...') : (isZh ? '生成專屬命盤與性格火花' : 'Generate Natal Spark')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSkipModal(true)}
                  className="w-full py-2.5 rounded-xl border border-white/10 hover:border-gold/30 text-white/60 hover:text-white transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{isZh ? '暫不填寫，直接體驗 (跳過) →' : 'Skip for now →'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'spark' && spark && (
          <motion.div
            key="step-spark"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-2xl flex flex-col gap-6"
          >
            {/* Spark Hero Card */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-gold/40 shadow-2xl relative overflow-hidden text-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <span className="px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-serif uppercase tracking-widest inline-block mb-3">
                {isZh ? '本命靈犀 · 日主格局' : 'Day Master Natal Blueprint'}
              </span>

              <h2 className="text-2xl sm:text-3xl font-serif text-gold-light font-medium mb-2">
                {spark.dayMaster.elementNameZh}
              </h2>

              <p className="text-xs sm:text-sm text-white/80 max-w-lg mx-auto leading-relaxed mb-6 font-light">
                {isZh ? spark.dayMaster.natureZh : spark.dayMaster.natureEn}
              </p>

              {/* Personality Tags Cloud */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {spark.personalityTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-lg bg-navy-900/90 border border-gold/25 text-xs text-gold font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 3 Core Personality Trait Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
                {spark.traits.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-navy-900/60 border border-white/10 hover:border-gold/30 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{t.icon}</span>
                      <span className="font-serif text-xs font-medium text-gold">{t.title}</span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">{t.desc}</p>
                  </div>
                ))}
              </div>

              {/* Five Elements Energy Proportions */}
              <div className="p-3 rounded-xl bg-navy-900/50 border border-gold/15 text-left">
                <span className="text-[11px] font-medium text-white/60 block mb-2">
                  {isZh ? '五行氣場分佈' : 'Five Elements Distribution'}
                </span>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                    <span className="text-[10px] block text-white/50">{isZh ? '金' : 'Metal'}</span>
                    <span className="font-mono font-medium">{spark.fiveElements.metal}%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="text-[10px] block text-white/50">{isZh ? '木' : 'Wood'}</span>
                    <span className="font-mono font-medium">{spark.fiveElements.wood}%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    <span className="text-[10px] block text-white/50">{isZh ? '水' : 'Water'}</span>
                    <span className="font-mono font-medium">{spark.fiveElements.water}%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <span className="text-[10px] block text-white/50">{isZh ? '火' : 'Fire'}</span>
                    <span className="font-mono font-medium">{spark.fiveElements.fire}%</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-600/10 border border-amber-600/20 text-amber-300">
                    <span className="text-[10px] block text-white/50">{isZh ? '土' : 'Earth'}</span>
                    <span className="font-mono font-medium">{spark.fiveElements.earth}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Heuristic Inquiry Cards (CoStar Style Question Pickers) */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-gold/30">
              <div className="text-left mb-4">
                <span className="text-[11px] uppercase tracking-widest text-gold/70 block">
                  {isZh ? '啟發式靈犀心問 · 點選即解' : 'Heuristic Inquiries · Click to Decode'}
                </span>
                <h3 className="font-serif text-lg text-gold-light font-medium">
                  {isZh ? '此時此刻，您最關心什麼？' : 'What is your paramount inquiry right now?'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {spark.suggestedInquiries.map((inq) => (
                  <button
                    key={inq.id}
                    onClick={() => handleSelectInquiry(inq)}
                    className="p-4 rounded-xl bg-navy-900/70 border border-gold/20 hover:border-gold hover:bg-gold/10 transition-all text-left group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{inq.icon}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/25 font-serif">
                          {isZh ? inq.titleZh : inq.titleEn}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 group-hover:text-white transition-colors leading-relaxed">
                        {isZh ? inq.questionZh : inq.questionEn}
                      </p>
                    </div>
                    <span className="text-[11px] text-gold/60 group-hover:text-gold mt-3 flex items-center gap-1">
                      {isZh ? '一鍵帶入解盤 →' : 'Decode now →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => changeStep('roadmap')}
                className="py-3 px-6 rounded-xl bg-gold text-navy-950 font-medium text-sm hover:bg-gold-light transition-all shadow-md cursor-pointer text-center"
              >
                {isZh ? '瀏覽全站三大術數攻略指南 →' : 'Explore Module Strategy Guide →'}
              </button>
              <button
                onClick={() => changeStep('profile')}
                className="py-3 px-6 rounded-xl border border-white/15 text-white/60 hover:text-white text-sm transition-all cursor-pointer text-center"
              >
                {isZh ? '← 修改出生信息' : '← Edit Birth Info'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'roadmap' && (
          <motion.div
            key="step-roadmap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-3xl flex flex-col gap-6 text-left"
          >
            <div className="text-center mb-2">
              <span className="px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-serif uppercase tracking-widest inline-block mb-2">
                {isZh ? '玄機三道 · 術數通關攻略' : 'The Three Pillars of Xuanji'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-gold-light font-medium mb-2">
                {isZh ? '遊戲攻略式模組導覽' : 'Module Strategy & Mastery Roadmap'}
              </h2>
              <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
                {isZh
                  ? '將東方先賢傳承之七大經典術數歸為三大流派，知命、卜事、理宅，各有其用。'
                  : 'Seven classical Chinese metaphysical systems organized into three functional pillars.'}
              </p>
            </div>

            {/* 3 Major Pillar Cards */}
            <div className="space-y-4">
              {MODULE_ROADMAP_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className="glass-card rounded-2xl p-5 sm:p-6 border border-gold/25 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-gold/15 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-serif text-base sm:text-lg text-gold font-medium">
                          {isZh ? cat.titleZh : cat.titleEn}
                        </h3>
                        <p className="text-xs text-white/60">{isZh ? cat.subtitleZh : cat.subtitleEn}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-serif flex-shrink-0">
                      {isZh ? cat.badgeZh : cat.badgeEn}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {cat.modules.map((mod) => (
                      <div
                        key={mod.type}
                        className="p-3.5 rounded-xl bg-navy-900/60 border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-serif text-sm font-medium text-white flex items-center gap-1.5">
                              <span>{mod.symbol}</span>
                              <span>{isZh ? mod.nameZh : mod.nameEn}</span>
                            </span>
                            <span className="text-[10px] text-gold/70">{isZh ? mod.tagZh : mod.tagEn}</span>
                          </div>
                          <p className="text-[11px] text-white/60 mb-2 leading-relaxed">
                            {isZh ? mod.descZh : mod.descEn}
                          </p>
                          <p className="text-[10px] text-gold/60 mb-3 bg-gold/5 p-1.5 rounded-lg">
                            {isZh ? mod.recommendedForZh : mod.recommendedForEn}
                          </p>
                        </div>

                        <Link
                          href={mod.route}
                          className="w-full py-1.5 px-3 rounded-lg bg-gold/15 border border-gold/30 hover:bg-gold hover:text-navy-950 text-gold text-xs font-medium transition-all text-center"
                        >
                          {isZh ? '立即體驗 →' : 'Divine Now →'}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/divination"
                className="py-3 px-8 rounded-xl bg-gold text-navy-950 font-medium text-sm hover:bg-gold-light transition-all shadow-md text-center"
              >
                {isZh ? '進入占卜大廳 / 儀表盤' : 'Enter Divination Hall'}
              </Link>
              <button
                onClick={() => changeStep('profile')}
                className="py-3 px-6 rounded-xl border border-white/15 text-white/60 hover:text-white text-sm transition-all cursor-pointer text-center"
              >
                {isZh ? '← 返回重新排盤' : '← Back to Natal Profile'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Warning Confirmation Modal */}
      <AnimatePresence>
        {showSkipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full border border-amber-500/30 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-300 shadow-md">
                <AlertIcon className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg text-amber-300 mb-2 font-medium">
                {isZh ? '跳過出生生辰提示' : 'Skip Birth Details?'}
              </h4>
              <p className="text-xs text-white/70 leading-relaxed mb-5">
                {isZh
                  ? '若跳過出生信息，您將無法直接使用基於個人八字生辰的「玄機大師」深度對談與專屬命盤推演。您確認現在跳過嗎？（後續可在個人資料中隨時補全）'
                  : 'Skipping birth info means personalized Master Xuanji chat and natal chart analysis will be unavailable until added in your profile. Continue?'}
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowSkipModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-white/20 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  {isZh ? '返回填寫' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmSkip}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  {isZh ? '確認跳過' : 'Yes, Skip'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
