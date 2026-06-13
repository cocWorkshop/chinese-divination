'use client'

import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import FormSection from './fields/FormSection'

// Hidden — kept for legacy/liuren.
export default function OtherForm() {
  const { form, setField, lang } = useDivination()
  return (
    <FormSection title={`📖 ${T(lang, '占問', 'Inquiry')}`}>
      <div>
        <label htmlFor="other-sub-type" className={labelCls}>{T(lang, '占卜類型', 'Sub-type')}</label>
        <select id="other-sub-type" className={inputCls} value={form.subType} onChange={e => setField('subType', e.target.value)}>
          <option value="meihua">{T(lang, '梅花易數', 'Mei Hua Yi Shu')}</option>
          <option value="liuren">{T(lang, '六壬神課', 'Liu Ren')}</option>
        </select>
      </div>
      <div>
        <label htmlFor="other-question" className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
        <textarea id="other-question" className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想預測的事項...', 'Describe what you want to predict...')} />
      </div>
    </FormSection>
  )
}
