'use client'

import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import FormSection from './fields/FormSection'

export default function MeihuaForm() {
  const { form, setField, lang } = useDivination()
  return (
    <FormSection title={`🌸 ${T(lang, '占問', 'Inquiry')}`}>
      <div>
        <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
        <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想預測的事項...', 'Describe what you want to predict...')} />
      </div>
      <div>
        <label className={labelCls}>{T(lang, '起卦時間', 'Reading Date/Time')}</label>
        <input type="datetime-local" className={inputCls} value={form.readingDateTime} onChange={e => setField('readingDateTime', e.target.value)} />
        <p className="text-white/40 text-xs mt-1">{T(lang, '默認為當前時間，梅花易數以時間起卦', 'Defaults to current time. Meihua uses time-based hexagram casting.')}</p>
      </div>
    </FormSection>
  )
}
