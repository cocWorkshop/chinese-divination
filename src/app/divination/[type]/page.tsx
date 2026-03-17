'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import LoadingOracle from '@/components/LoadingOracle'
import ResultRenderer from '@/components/results/ResultRenderer'

const shichen = [
  { value: 'zi', zh: '子时 (23:00-01:00)', en: 'Zi (23:00-01:00)' },
  { value: 'chou', zh: '丑时 (01:00-03:00)', en: 'Chou (01:00-03:00)' },
  { value: 'yin', zh: '寅时 (03:00-05:00)', en: 'Yin (03:00-05:00)' },
  { value: 'mao', zh: '卯时 (05:00-07:00)', en: 'Mao (05:00-07:00)' },
  { value: 'chen', zh: '辰时 (07:00-09:00)', en: 'Chen (07:00-09:00)' },
  { value: 'si', zh: '巳时 (09:00-11:00)', en: 'Si (09:00-11:00)' },
  { value: 'wu', zh: '午时 (11:00-13:00)', en: 'Wu (11:00-13:00)' },
  { value: 'wei', zh: '未时 (13:00-15:00)', en: 'Wei (13:00-15:00)' },
  { value: 'shen', zh: '申时 (15:00-17:00)', en: 'Shen (15:00-17:00)' },
  { value: 'you', zh: '酉时 (17:00-19:00)', en: 'You (17:00-19:00)' },
  { value: 'xu', zh: '戌时 (19:00-21:00)', en: 'Xu (19:00-21:00)' },
  { value: 'hai', zh: '亥时 (21:00-23:00)', en: 'Hai (21:00-23:00)' },
]

const directions8 = ['坎/North', '艮/NE', '震/East', '巽/SE', '离/South', '坤/SW', '兑/West', '乾/NW']

const typeInfo: Record<string, { zhName: string; twName: string; enName: string; symbol: string }> = {
  bazi: { zhName: '八字命理', twName: '八字命理', enName: 'BaZi Analysis', symbol: '☰' },
  iching: { zhName: '易经占卜', twName: '易經占卜', enName: 'I Ching Oracle', symbol: '☯' },
  ziwei: { zhName: '紫微斗数', twName: '紫微斗數', enName: 'Zi Wei Dou Shu', symbol: '⭐' },
  qimen: { zhName: '奇门遁甲', twName: '奇門遁甲', enName: 'Qi Men Dun Jia', symbol: '⚡' },
  fengshui: { zhName: '风水布局', twName: '風水佈局', enName: 'Feng Shui Analysis', symbol: '🏯' },
  other: { zhName: '梅花六壬', twName: '梅花六壬', enName: 'Plum Blossom & Liu Ren', symbol: '🌸' },
}

// Helper for bilingual text
const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

export default function DivinationFormPage() {
  const { type } = useParams<{ type: string }>()
  const { data: session } = useSession()
  const { lang } = useLang()
  const router = useRouter()

  const [form, setForm] = useState<Record<string, string>>({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: '',
    question: '',
    hexagram: '',
    direction: '',
    yearBuilt: '',
    ownerInfo: '',
    readingDateTime: new Date().toISOString().slice(0, 16),
    subType: 'meihua',
    lunarToggle: 'solar',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<string>('')
  const [saveProfile, setSaveProfile] = useState(true)
  const [saveHistory, setSaveHistory] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [modelTier, setModelTier] = useState('model1')
  const [credits, setCredits] = useState<Record<string, {remaining: number, dailyLimit: number}> | null>(null)

  const info = typeInfo[type] || { zhName: '占卜', enName: 'Divination', symbol: '☯' }

  // Auto-fill from saved profile (bazi & ziwei only)
  useEffect(() => {
    if (!session || profileLoaded) return
    if (!['bazi', 'ziwei'].includes(type)) return
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setForm(f => ({
          ...f,
          birthDate:  data.birthDate  || f.birthDate,
          birthTime:  data.birthTime  || f.birthTime,
          birthPlace: data.birthPlace || f.birthPlace,
          gender:     data.gender     || f.gender,
        }))
        setProfileLoaded(true)
        if (data.birthDate || data.birthTime) {
          toast.success(T(lang, '已從檔案自動填充生辰資訊', 'Profile info auto-filled'), { icon: '📋' })
        }
      })
      .catch(() => {})
  }, [session, type, profileLoaded, lang])

  // Fetch credits
  useEffect(() => {
    if (!session) return
    fetch('/api/credits').then(r => r.json()).then(setCredits).catch(() => {})
  }, [session])

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const castHexagram = () => {
    const n = Math.floor(Math.random() * 64) + 1
    setField('hexagram', String(n))
    toast.success(T(lang, `得卦：第${n}卦`, `Hexagram #${n}`))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      toast.error(T(lang, '請先登入', 'Please sign in first'))
      router.push('/login')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const hasProfileData = ['bazi', 'ziwei'].includes(type)
      const fetchController = new AbortController()
      const fetchTimeout = setTimeout(() => fetchController.abort(), 120000)
      const res = await fetch('/api/divination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          inputData: form,
          language: lang,
          question: form.question,
          saveProfile: hasProfileData ? saveProfile : false,
          saveHistory,
          modelTier,
        }),
        signal: fetchController.signal,
      })
      clearTimeout(fetchTimeout)
      const data = await res.json()
      if (res.ok) {
        setResult(data.reading.result)
        setResultType(type)
        // Refresh credits
        fetch('/api/credits').then(r => r.json()).then(setCredits).catch(() => {})
      } else {
        toast.error(data.error || 'Error')
      }
    } catch {
      toast.error('Network error')
    }
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
  const labelCls = "block text-white/70 text-sm mb-1"

  return (
    <div className="min-h-screen py-12 px-4 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="text-5xl mb-3">{info.symbol}</div>
        <h1 className="text-3xl font-serif text-gold">{lang === 'en' ? info.enName : info.twName}</h1>
      </motion.div>

      {!result && !loading && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-8 space-y-5"
        >
          {/* BaZi */}
          {type === 'bazi' && <>
            <div>
              <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
              <input type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生時辰', 'Birth Hour')}</label>
              <select className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
              <input type="text" className={inputCls} value={form.birthPlace} onChange={e => setField('birthPlace', e.target.value)} placeholder={T(lang, '省市', 'City, Province')} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
              <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                <option value="male">{T(lang, '男', 'Male')}</option>
                <option value="female">{T(lang, '女', 'Female')}</option>
              </select>
            </div>
          </>}

          {/* I Ching */}
          {type === 'iching' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '請詳述您想詢問的事情...', 'Describe your question in detail...')} />
            </div>
            <div className="text-center">
              <button type="button" onClick={castHexagram} className="px-6 py-3 border border-gold/50 text-gold rounded-xl hover:border-gold hover:bg-gold/10 transition-all">
                {T(lang, '🎲 起卦', '🎲 Cast Hexagram')}
              </button>
              {form.hexagram && <p className="text-gold mt-3 text-xl font-serif">
                {T(lang, `第 ${form.hexagram} 卦`, `Hexagram #${form.hexagram}`)}
              </p>}
            </div>
          </>}

          {/* Zi Wei */}
          {type === 'ziwei' && <>
            <div>
              <label className={labelCls}>{T(lang, '曆法', 'Calendar')}</label>
              <select className={inputCls} value={form.lunarToggle} onChange={e => setField('lunarToggle', e.target.value)}>
                <option value="solar">{T(lang, '公曆', 'Solar')}</option>
                <option value="lunar">{T(lang, '農曆', 'Lunar')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
              <input type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '出生時辰', 'Birth Hour')}</label>
              <select className={inputCls} value={form.birthTime} onChange={e => setField('birthTime', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
              <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                <option value="male">{T(lang, '男', 'Male')}</option>
                <option value="female">{T(lang, '女', 'Female')}</option>
              </select>
            </div>
          </>}

          {/* Qi Men */}
          {type === 'qimen' && <>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想詢問的事項...', 'Describe your situation...')} />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '起盤時間', 'Reading Date/Time')}</label>
              <input type="datetime-local" className={inputCls} value={form.readingDateTime} onChange={e => setField('readingDateTime', e.target.value)} />
            </div>
          </>}

          {/* Feng Shui */}
          {type === 'fengshui' && <>
            <div>
              <label className={labelCls}>{T(lang, '房屋朝向', 'House Facing Direction')}</label>
              <select className={inputCls} value={form.direction} onChange={e => setField('direction', e.target.value)} required>
                <option value="">{T(lang, '請選擇', 'Select')}</option>
                {directions8.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '建造年份', 'Year Built')}</label>
              <input type="number" className={inputCls} value={form.yearBuilt} onChange={e => setField('yearBuilt', e.target.value)} placeholder="e.g. 2005" />
            </div>
            <div>
              <label className={labelCls}>{T(lang, '屋主簡介', 'Owner Info')}</label>
              <textarea className={inputCls + ' h-20 resize-none'} value={form.ownerInfo} onChange={e => setField('ownerInfo', e.target.value)} placeholder={T(lang, '性別、出生年份、主要居住者情況等', 'Gender, birth year, who lives there...')} />
            </div>
          </>}

          {/* Other */}
          {type === 'other' && <>
            <div>
              <label className={labelCls}>{T(lang, '占卜類型', 'Sub-type')}</label>
              <select className={inputCls} value={form.subType} onChange={e => setField('subType', e.target.value)}>
                <option value="meihua">{T(lang, '梅花易數', 'Mei Hua Yi Shu')}</option>
                <option value="liuren">{T(lang, '六壬神課', 'Liu Ren')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
              <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想預測的事項...', 'Describe what you want to predict...')} />
            </div>
          </>}

          {/* Common optional question for non-question-first types */}
          {(type === 'bazi' || type === 'ziwei') && (
            <div>
              <label className={labelCls}>{T(lang, '想了解的方面（可選）', 'Focus Area (optional)')}</label>
              <input type="text" className={inputCls} value={form.question} onChange={e => setField('question', e.target.value)} placeholder={T(lang, '例：事業運、婚姻、財運...', 'e.g. career, marriage, wealth...')} />
            </div>
          )}

          {/* Model Selection */}
          {session && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                {T(lang, '🤖 選擇模型', '🤖 Select Model')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { tier: 'model1', zhLabel: '标准模型', enLabel: 'Standard', icon: '⚡' },
                  { tier: 'model2', zhLabel: '高级模型', enLabel: 'Premium', icon: '🌟' },
                ].map(m => (
                  <button
                    key={m.tier}
                    type="button"
                    onClick={() => setModelTier(m.tier)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      modelTier === m.tier
                        ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{m.icon}</span>
                      <span className="text-white/80 text-sm font-medium">
                        {lang === 'en' ? m.enLabel : m.zhLabel}
                      </span>
                    </div>
                    {credits && credits[m.tier] && (
                      <p className="text-white/40 text-xs">
                        {(() => {
                          const c = credits[m.tier]
                          const rem = c.remaining === -1 ? '∞' : c.remaining
                          const lim = c.dailyLimit === -1 ? '∞' : c.dailyLimit
                          return lang === 'en'
                            ? `${rem} / ${lim} remaining today`
                            : `今日剩餘 ${rem} / ${lim} 次`
                        })()}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Controls */}
          {session && (
            <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-3">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                {T(lang, '🔒 隱私設置', '🔒 Privacy Settings')}
              </p>

              {/* Save to History */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={saveHistory}
                    onChange={e => setSaveHistory(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      saveHistory ? 'bg-gold border-gold' : 'bg-transparent border-white/30 group-hover:border-gold/50'
                    }`}
                  >
                    {saveHistory && <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium leading-tight">
                    {T(lang, '儲存到歷史記錄', 'Save to reading history')}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {T(lang, '允許儲存本次解卦結果，可在「歷史」中查看', 'Store this reading in your history for future reference')}
                  </p>
                </div>
              </label>

              {/* Save profile info — only for types with personal birth data */}
              {['bazi', 'ziwei'].includes(type) && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={saveProfile}
                      onChange={e => setSaveProfile(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        saveProfile ? 'bg-gold border-gold' : 'bg-transparent border-white/30 group-hover:border-gold/50'
                      }`}
                    >
                      {saveProfile && <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium leading-tight">
                      {T(lang, '儲存生辰資訊到我的資料', 'Save birth info to my profile')}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {T(lang, '將出生日期、時辰、出生地、性別儲存至個人資料，下次自動填充', 'Store birth date, hour, place & gender in your profile for auto-fill next time')}
                    </p>
                  </div>
                </label>
              )}

              {(!saveHistory && !saveProfile) && (
                <p className="text-amber-400/70 text-xs flex items-center gap-1">
                  <span>⚠️</span>
                  {T(lang, '本次占卜結果不會被儲存，請自行記錄', 'This reading will not be stored anywhere. Please note it down if needed.')}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-gold text-navy-950 rounded-xl font-semibold text-lg hover:bg-gold-light transition-colors"
          >
            {T(lang, '解卦 →', 'Consult Oracle →')}
          </button>

          {!session && (
            <p className="text-center text-white/50 text-sm">
              {T(lang, '需要登入才能儲存歷史記錄', 'Sign in to save your readings')}
            </p>
          )}
        </motion.form>
      )}

      {loading && <LoadingOracle />}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-gold">
              {T(lang, '解卦結果', 'Oracle Reading')}
            </h2>
            <button
              onClick={() => setResult(null)}
              className="text-white/50 hover:text-gold text-sm"
            >
              {T(lang, '重新占卜', 'New Reading')}
            </button>
          </div>
          <ResultRenderer result={result} type={resultType || type} />
        </motion.div>
      )}
    </div>
  )
}
