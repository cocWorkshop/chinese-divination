'use client'

import BirthplaceInput from '@/components/BirthplaceInput'
import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import CalendarToggle from './fields/CalendarToggle'
import TimeModeInput from './fields/TimeModeInput'
import FormSection from './fields/FormSection'

export default function ZiweiForm() {
  const { form, setField, setBirthLat, setBirthLng, setIsSouthernHemisphere, lang } = useDivination()
  return (
    <>
      <FormSection title={`📅 ${T(lang, '生辰信息', 'Birth Information')}`}>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CalendarToggle layoutId="ziweiCalendarToggle" />
          <div>
            <label htmlFor="ziwei-birth-date" className={labelCls}>{T(lang, '出生日期', 'Birth Date')}</label>
            <input id="ziwei-birth-date" type="date" className={inputCls} value={form.birthDate} onChange={e => setField('birthDate', e.target.value)} required />
          </div>
        </div>

        {/* Time Mode Toggle + Time Input */}
        <TimeModeInput layoutId="ziweiTimeModeToggle" />

        {/* Gender + Birthplace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ziwei-gender" className={labelCls}>{T(lang, '性別', 'Gender')}</label>
            <select id="ziwei-gender" className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)} required>
              <option value="">{T(lang, '請選擇', 'Select')}</option>
              <option value="male">{T(lang, '男', 'Male')}</option>
              <option value="female">{T(lang, '女', 'Female')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="ziwei-birth-place" className={labelCls}>{T(lang, '出生地（可選）', 'Birthplace (optional)')}</label>
            <BirthplaceInput
              inputId="ziwei-birth-place"
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
          <label htmlFor="ziwei-birth-env" className={labelCls}>{T(lang, '出生地環境（可選）', 'Birth Environment (optional)')}</label>
          <input
            id="ziwei-birth-env"
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
