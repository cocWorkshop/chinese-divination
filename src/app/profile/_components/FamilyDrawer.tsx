'use client'

/**
 * Slide-out drawer for adding / editing a family member.
 * Mobile: full-screen overlay. Desktop: 400px right panel.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/components/LanguageContext'
import BirthplaceInput from '@/components/BirthplaceInput'

const T = (lang: string, zh: string, en: string) => lang === 'en' ? en : zh

const relationPresets = [
  { value: 'spouse', zh: '配偶', en: 'Spouse' },
  { value: 'father', zh: '父親', en: 'Father' },
  { value: 'mother', zh: '母親', en: 'Mother' },
  { value: 'son', zh: '兒子', en: 'Son' },
  { value: 'daughter', zh: '女兒', en: 'Daughter' },
  { value: 'brother', zh: '兄弟', en: 'Brother' },
  { value: 'sister', zh: '姐妹', en: 'Sister' },
  { value: 'friend', zh: '朋友', en: 'Friend' },
  { value: 'other', zh: '其他', en: 'Other' },
]

const shichen = [
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

export interface FamilyMemberData {
  id?: string
  relation: string
  relationDetail: string | null
  name: string | null
  birthDate: string | null
  birthTime: string | null
  birthPlace: string | null
  gender: string | null
  calendarType: string | null
  timeMode: string | null
  exactTime: string | null
  birthLat: number | null
  birthLng: number | null
  birthEnvironment: string | null
}

const emptyMember: FamilyMemberData = {
  relation: '', relationDetail: null, name: null,
  birthDate: null, birthTime: null, birthPlace: null, gender: null,
  calendarType: 'lunar', timeMode: 'fuzzy', exactTime: null,
  birthLat: null, birthLng: null, birthEnvironment: null,
}

interface Props {
  open: boolean
  member: FamilyMemberData | null  // null = adding, non-null = editing
  onClose: () => void
  onSave: (data: FamilyMemberData) => Promise<void>
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1"
const inputStyle = { backgroundColor: 'var(--bg-input, #0d1526)', border: '1px solid var(--border-gold, rgba(212,175,55,0.2))', color: 'var(--text-primary)' }

export default function FamilyDrawer({ open, member, onClose, onSave }: Props) {
  const { lang } = useLang()
  const isEdit = !!member?.id
  const [form, setForm] = useState<FamilyMemberData>(emptyMember)
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(member ? { ...member } : { ...emptyMember })
      setShowAdvanced(false)
    }
  }, [open, member])

  const update = (patch: Partial<FamilyMemberData>) => setForm(f => ({ ...f, ...patch }))

  const handleSubmit = async () => {
    if (!form.relation) return
    if (form.relation === 'other' && !form.relationDetail?.trim()) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] overflow-y-auto"
            style={{ background: 'var(--bg-surface, #0d1526)', borderLeft: '1px solid var(--border-gold)' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 backdrop-blur-md" style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="font-serif text-base" style={{ color: 'var(--gold)' }}>
                {isEdit
                  ? T(lang, `編輯${form.name || '家人'}`, `Edit ${form.name || 'Member'}`)
                  : T(lang, '新增家庭成員', 'Add Family Member')}
              </h2>
              <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Relation — required */}
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>{T(lang, '關係 *', 'Relation *')}</label>
                <select value={form.relation} onChange={e => update({ relation: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="">{T(lang, '請選擇', 'Select')}</option>
                  {relationPresets.map(r => (
                    <option key={r.value} value={r.value}>{lang === 'en' ? r.en : r.zh}</option>
                  ))}
                </select>
              </div>

              {form.relation === 'other' && (
                <div>
                  <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>{T(lang, '具體關係 *', 'Specific Relation *')}</label>
                  <input value={form.relationDetail || ''} onChange={e => update({ relationDetail: e.target.value })} placeholder={T(lang, '如：岳父、同事', 'e.g. father-in-law')} className={inputCls} style={inputStyle} />
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>{T(lang, '姓名', 'Name')}</label>
                <input value={form.name || ''} onChange={e => update({ name: e.target.value || null })} placeholder={T(lang, '選填', 'Optional')} className={inputCls} style={inputStyle} />
              </div>

              {/* Birth Info — optional section */}
              <div className="pt-2">
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  {T(lang, '📅 生辰信息（可選）', '📅 Birth Info (optional)')}
                </p>

                <div className="space-y-3">
                  {/* Calendar + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{T(lang, '曆法', 'Calendar')}</label>
                      <div className="flex rounded-full border overflow-hidden text-xs" style={{ borderColor: 'var(--border-gold)' }}>
                        <button type="button" onClick={() => update({ calendarType: 'solar' })} className={`flex-1 py-1.5 transition-colors ${form.calendarType === 'solar' ? 'bg-gold text-navy-950' : ''}`} style={form.calendarType !== 'solar' ? { color: 'var(--text-muted)' } : {}}>
                          {T(lang, '公曆', 'Solar')}
                        </button>
                        <button type="button" onClick={() => update({ calendarType: 'lunar' })} className={`flex-1 py-1.5 transition-colors ${form.calendarType === 'lunar' || !form.calendarType ? 'bg-gold text-navy-950' : ''}`} style={form.calendarType !== 'lunar' && form.calendarType ? { color: 'var(--text-muted)' } : {}}>
                          {T(lang, '農曆', 'Lunar')}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{T(lang, '出生日期', 'Birth Date')}</label>
                      <input type="date" value={form.birthDate || ''} onChange={e => update({ birthDate: e.target.value || null })} className={inputCls + ' text-xs'} style={inputStyle} />
                    </div>
                  </div>

                  {/* Time mode + Time */}
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{T(lang, '出生時間', 'Birth Time')}</label>
                    <div className="flex rounded-full border overflow-hidden text-xs mb-2" style={{ borderColor: 'var(--border-gold)' }}>
                      <button type="button" onClick={() => update({ timeMode: 'fuzzy' })} className={`flex-1 py-1.5 transition-colors ${form.timeMode !== 'precise' ? 'bg-gold text-navy-950' : ''}`} style={form.timeMode === 'precise' ? { color: 'var(--text-muted)' } : {}}>
                        {T(lang, '時辰', 'Shichen')}
                      </button>
                      <button type="button" onClick={() => update({ timeMode: 'precise' })} className={`flex-1 py-1.5 transition-colors ${form.timeMode === 'precise' ? 'bg-gold text-navy-950' : ''}`} style={form.timeMode !== 'precise' ? { color: 'var(--text-muted)' } : {}}>
                        {T(lang, '精確', 'Exact')}
                      </button>
                    </div>
                    {form.timeMode === 'precise' ? (
                      <input type="time" value={form.exactTime || ''} onChange={e => update({ exactTime: e.target.value || null })} className={inputCls + ' text-xs'} style={inputStyle} />
                    ) : (
                      <select value={form.birthTime || ''} onChange={e => update({ birthTime: e.target.value || null })} className={inputCls + ' text-xs'} style={inputStyle}>
                        <option value="">{T(lang, '請選擇', 'Select')}</option>
                        {shichen.map(s => <option key={s.value} value={s.value}>{lang === 'en' ? s.en : s.zh}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{T(lang, '性別', 'Gender')}</label>
                    <select value={form.gender || ''} onChange={e => update({ gender: e.target.value || null })} className={inputCls + ' text-xs'} style={inputStyle}>
                      <option value="">{T(lang, '請選擇', 'Select')}</option>
                      <option value="male">{T(lang, '男', 'Male')}</option>
                      <option value="female">{T(lang, '女', 'Female')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced — collapsed */}
              <details open={showAdvanced} onToggle={e => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
                <summary className="text-xs cursor-pointer py-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {T(lang, '▸ 更多（出生地、環境）', '▸ More (birthplace, environment)')}
                </summary>
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{T(lang, '出生地', 'Birthplace')}</label>
                    <BirthplaceInput
                      value={form.birthPlace || ''}
                      onChange={(place: string) => update({ birthPlace: place })}
                      onLatLngChange={(lat, lng) => update({ birthLat: lat, birthLng: lng })}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{T(lang, '出生環境', 'Birth Environment')}</label>
                    <input value={form.birthEnvironment || ''} onChange={e => update({ birthEnvironment: e.target.value || null })} placeholder={T(lang, '農村、城市、山區...', 'Rural, urban, mountain...')} className={inputCls + ' text-xs'} style={inputStyle} />
                  </div>
                </div>
              </details>

              {/* Save button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !form.relation || (form.relation === 'other' && !form.relationDetail?.trim())}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
                style={{ background: 'var(--gold)', color: '#0a0f1e' }}
              >
                {saving ? '...' : isEdit ? T(lang, '💾 儲存', '💾 Save') : T(lang, '➕ 新增', '➕ Add')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
