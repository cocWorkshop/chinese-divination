'use client'

import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls, directions8 } from '../constants'
import FormSection from './fields/FormSection'

export default function FengshuiForm() {
  const { form, setField, lang } = useDivination()
  return (
    <FormSection title={`🏯 ${T(lang, '居所資訊', 'Property Details')}`}>
      <div>
        <label className={labelCls}>{T(lang, '房屋朝向', 'House Facing Direction')}</label>
        <select className={inputCls} value={form.direction} onChange={e => setField('direction', e.target.value)} required>
          <option value="">{T(lang, '請選擇', 'Select')}</option>
          {directions8.map(d => <option key={d.value} value={d.value}>{T(lang, d.zh, d.en)}</option>)}
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
    </FormSection>
  )
}
