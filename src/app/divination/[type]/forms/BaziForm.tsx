'use client'

import BirthplaceInput from '@/components/BirthplaceInput'
import { DivinationIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import CalendarToggle from './fields/CalendarToggle'
import TimeModeInput from './fields/TimeModeInput'
import FormSection from './fields/FormSection'
import DualCalendarPreview from './fields/DualCalendarPreview'

export default function BaziForm() {
  const { form, setField, setBirthLat, setBirthLng, setIsSouthernHemisphere, lang } = useDivination()
  return (
    <>
      {/* ── Section: Birth Date & Calendar ── */}
      <FormSection title={
        <span className="flex items-center gap-1.5">
          <DivinationIcon type="bazi" className="w-4 h-4 text-gold-light" />
          <span>{T(lang, '生辰資訊', 'Birth Information')}</span>
        </span>
      }>

        {/* Calendar Toggle + Date on same row (desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CalendarToggle layoutId="calendarToggle" />
          <div>
            <label htmlFor="bazi-birth-date" className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
            <input id="bazi-birth-date" type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
          </div>
        </div>
        <DualCalendarPreview birthDate={form.birthDate} lunarToggle={form.lunarToggle} lang={lang} />

        {/* Time Mode Toggle + Time Input */}
        <TimeModeInput layoutId="timeModeToggle" showHints />

        {/* Gender + Birthplace side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bazi-gender" className={labelCls}>{T(lang, '性別', 'Gender')}</label>
            <select id="bazi-gender" className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
              <option value="">{T(lang, '請選擇', 'Select')}</option>
              <option value="male">{T(lang, '男', 'Male')}</option>
              <option value="female">{T(lang, '女', 'Female')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="bazi-birth-place" className={labelCls}>
              {T(lang, '出生地', 'Birthplace')}
              {form.timeMode === 'precise' && <span className="text-gold ml-1">*</span>}
              {form.timeMode === 'fuzzy' && <span className="text-foreground/40 ml-1">{T(lang, '（可選）', '(optional)')}</span>}
            </label>
            <BirthplaceInput
              inputId="bazi-birth-place"
              value={form.birthPlace}
              onChange={v => setField('birthPlace', v)}
              onLatLngChange={(lat, lng) => { setBirthLat(lat); setBirthLng(lng) }}
              onSouthernHemisphere={setIsSouthernHemisphere}
              className={inputCls}
              placeholder={T(lang, '搜尋城市...', 'Search city...')}
            />
          </div>
        </div>

        {/* Birth environment */}
        <div>
          <label htmlFor="bazi-birth-env" className={labelCls}>{T(lang, '出生地環境（可選）', 'Birth Environment (optional)')}</label>
          <input
            id="bazi-birth-env"
            type="text"
            className={inputCls}
            value={form.birthEnvironment}
            onChange={e => setField('birthEnvironment', e.target.value)}
            placeholder={T(lang, '例：農村、城市、山區...', 'e.g. rural, urban, mountainous...')}
          />
        </div>
      </FormSection>
    </>
  )
}
