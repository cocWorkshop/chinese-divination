'use client'

import { DivinationIcon, NoticeIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls, directions8 } from '../constants'
import { FENGSHUI_DEMO_EXAMPLE } from '../../guidanceConfig'
import FormSection from './fields/FormSection'

export default function FengshuiForm() {
  const { form, setField, lang } = useDivination()
  return (
    <FormSection title={
      <span className="flex items-center gap-1.5">
        <DivinationIcon type="fengshui" className="w-4 h-4 text-gold-light" />
        <span>{T(lang, '居所資訊', 'Property Details')}</span>
      </span>
    }>
      <div>
        <label htmlFor="fengshui-direction" className={labelCls}>{T(lang, '房屋朝向', 'House Facing Direction')}</label>
        <select id="fengshui-direction" className={inputCls} value={form.direction} onChange={e => setField('direction', e.target.value)} required>
          <option value="">{T(lang, '請選擇', 'Select')}</option>
          {directions8.map(d => <option key={d.value} value={d.value}>{T(lang, d.zh, d.en)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="fengshui-year-built" className={labelCls}>{T(lang, '建造年份', 'Year Built')}</label>
        <input id="fengshui-year-built" type="number" className={inputCls} value={form.yearBuilt} onChange={e => setField('yearBuilt', e.target.value)} placeholder="e.g. 2005" />
      </div>
      <div>
        <label htmlFor="fengshui-owner-info" className={labelCls}>{T(lang, '屋主簡介', 'Owner Info')}</label>
        <textarea id="fengshui-owner-info" className={inputCls + ' h-20 resize-none'} value={form.ownerInfo} onChange={e => setField('ownerInfo', e.target.value)} placeholder={T(lang, '性別、出生年份、主要居住者情況等', 'Gender, birth year, who lives there...')} />
      </div>

      {/* Demonstrative Helper Example */}
      <div className="p-3.5 rounded-xl bg-gold/5 border border-gold/20 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-serif text-gold font-medium text-xs flex items-center gap-1.5">
            <NoticeIcon className="w-3.5 h-3.5 text-gold" />
            <span>{T(lang, FENGSHUI_DEMO_EXAMPLE.title.zh, FENGSHUI_DEMO_EXAMPLE.title.en)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setField('direction', FENGSHUI_DEMO_EXAMPLE.exampleDirection)
              setField('yearBuilt', String(FENGSHUI_DEMO_EXAMPLE.exampleYear))
              setField(
                'ownerInfo',
                T(
                  lang,
                  FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.zh,
                  FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.en
                )
              )
            }}
            className="text-[11px] text-gold hover:text-gold-light underline cursor-pointer"
          >
            {T(lang, FENGSHUI_DEMO_EXAMPLE.applyLabel.zh, FENGSHUI_DEMO_EXAMPLE.applyLabel.en)}
          </button>
        </div>
        <p className="text-foreground/60 text-[11px] leading-relaxed">
          {T(lang, FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.zh, FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.en)}
        </p>
      </div>
    </FormSection>
  )
}
