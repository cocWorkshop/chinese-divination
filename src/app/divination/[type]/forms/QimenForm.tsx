'use client'

import { DivinationIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import FormSection from './fields/FormSection'

export default function QimenForm() {
  const { form, setField, lang } = useDivination()
  return (
    <FormSection title={
      <span className="flex items-center gap-1.5">
        <DivinationIcon type="qimen" className="w-4 h-4 text-gold-light" />
        <span>{T(lang, '占問', 'Inquiry')}</span>
      </span>
    }>
      <div>
        <label htmlFor="qimen-question" className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
        <textarea id="qimen-question" className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '詳述想詢問的事項...', 'Describe your situation...')} />
      </div>
      <div>
        <label htmlFor="qimen-event-time" className={labelCls}>{T(lang, '占算時間', 'Divination Time')}</label>
        <input id="qimen-event-time" type="datetime-local" className={inputCls} value={form.readingDateTime} onChange={e => setField('readingDateTime', e.target.value)} />
        <p className="text-white/40 text-xs mt-1">{T(lang,
          '默認為當下（看當前局勢）；若您要擇吉時行動，可改為計劃行動的時刻。',
          'Defaults to now (read current situation). If choosing an auspicious time to act, set it to your planned action time.'
        )}</p>
      </div>
    </FormSection>
  )
}
