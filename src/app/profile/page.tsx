'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useLang } from '@/components/LanguageContext'
import MysticalLoader from '@/components/MysticalLoader'

const shichen = [
  { value: 'zi',   label: '子時  23:00 – 01:00' },
  { value: 'chou', label: '丑時  01:00 – 03:00' },
  { value: 'yin',  label: '寅時  03:00 – 05:00' },
  { value: 'mao',  label: '卯時  05:00 – 07:00' },
  { value: 'chen', label: '辰時  07:00 – 09:00' },
  { value: 'si',   label: '巳時  09:00 – 11:00' },
  { value: 'wu',   label: '午時  11:00 – 13:00' },
  { value: 'wei',  label: '未時  13:00 – 15:00' },
  { value: 'shen', label: '申時  15:00 – 17:00' },
  { value: 'you',  label: '酉時  17:00 – 19:00' },
  { value: 'xu',   label: '戌時  19:00 – 21:00' },
  { value: 'hai',  label: '亥時  21:00 – 23:00' },
]

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { lang, setLang } = useLang()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '', language: 'zh-TW',
    newPassword: '', currentPassword: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (session?.user?.name) setForm(f => ({ ...f, name: session.user?.name || '' }))
  }, [status, session, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(T(lang, '儲存成功', 'Saved'))
      if (form.language === 'zh-TW' || form.language === 'en') setLang(form.language as 'zh-TW' | 'en')
    } else {
      const d = await res.json()
      toast.error(d.error || 'Error')
    }
  }

  const inputCls = "w-full px-4 py-3 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/60 transition-colors"
  const labelCls = "block text-white/70 text-sm mb-1"

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <MysticalLoader lang={lang} variant="page" />
    </div>
  )

  return (
    <div className="min-h-screen py-12 px-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-serif text-gold mb-8">{T(lang, '個人資料', 'Profile')}</h1>

      <form onSubmit={handleSave} className="glass-card rounded-2xl p-8 space-y-5">
        <div>
          <label className={labelCls}>{T(lang, '姓名', 'Name')}</label>
          <input type="text" className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
          <input type="date" className={inputCls} value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '出生時辰', 'Birth Time')}</label>
          <select className={inputCls} value={form.birthTime} onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))}>
            <option value="">{T(lang, '請選擇', 'Select')}</option>
            {shichen.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{T(lang, '出生地', 'Birthplace')}</label>
          <input type="text" className={inputCls} value={form.birthPlace} onChange={e => setForm(f => ({ ...f, birthPlace: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '性別', 'Gender')}</label>
          <select className={inputCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">{T(lang, '請選擇', 'Select')}</option>
            <option value="male">{T(lang, '男', 'Male')}</option>
            <option value="female">{T(lang, '女', 'Female')}</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{T(lang, '介面語言', 'Language')}</label>
          <select className={inputCls} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <hr className="border-gold/20" />
        <p className="text-white/50 text-sm">{T(lang, '修改密碼（留空則不更改）', 'Change password (leave blank to keep)')}</p>
        <div>
          <label className={labelCls}>{T(lang, '當前密碼', 'Current Password')}</label>
          <input type="password" className={inputCls} value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>{T(lang, '新密碼', 'New Password')}</label>
          <input type="password" className={inputCls} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? T(lang, '儲存中...', 'Saving...') : T(lang, '儲存', 'Save')}
        </button>
      </form>
    </div>
  )
}
