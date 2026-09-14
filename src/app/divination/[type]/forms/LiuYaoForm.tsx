'use client'

import { DivinationIcon, CheckSealIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import { LIUYAO_CAST_PRINCIPLE } from '../../guidanceConfig'
import CoinCastPanel from './fields/CoinCastPanel'
import FormSection from './fields/FormSection'

export default function LiuYaoForm() {
  const { form, setField, lang } = useDivination()
  return (
    <>
      <FormSection title={
        <span className="flex items-center gap-1.5">
          <DivinationIcon type="liuyao" className="w-4 h-4 text-gold-light" />
          <span>{T(lang, '占問', 'Inquiry')}</span>
        </span>
      }>
        <div>
          <label htmlFor="liuyao-question" className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
          <textarea id="liuyao-question" className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '心中默念所問之事，一事一占，問題越具體越好...', 'Focus on one specific question...')} />
        </div>
      </FormSection>

      {/* Principle of Coin Casting Guidance */}
      <div className="p-3.5 rounded-xl bg-gold/5 border border-gold/20 text-xs text-white/75 leading-relaxed flex items-start gap-2.5">
        <DivinationIcon type="liuyao" className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-serif font-medium text-gold text-xs block mb-1">
            {T(lang, LIUYAO_CAST_PRINCIPLE.title.zh, LIUYAO_CAST_PRINCIPLE.title.en)}
          </span>
          <p className="text-[11px] text-white/70 leading-relaxed">
            {T(lang, LIUYAO_CAST_PRINCIPLE.content.zh, LIUYAO_CAST_PRINCIPLE.content.en)}
          </p>
        </div>
      </div>
      <CoinCastPanel
        field="liuyaoLines"
        title={
          <span className="flex items-center gap-1.5">
            <DivinationIcon type="liuyao" className="w-4 h-4 text-gold-light" />
            <span>{T(lang, '搖卦（三枚銅錢法）', 'Cast Hexagram (Three Coin Method)')}</span>
          </span>
        }
        intro={T(lang,
          '每次擲三枚銅錢，字面為陰（值2），背面為陽（值3）。三枚合計：6=老陰（變爻）、7=少陽、8=少陰、9=老陽（變爻）。共擲六次，從初爻到上爻。',
          'Toss 3 coins each time. Heads=2 (Yin), Tails=3 (Yang). Sum: 6=Old Yin (changing), 7=Young Yang, 8=Young Yin, 9=Old Yang (changing). Toss 6 times, from bottom to top.'
        )}
        completeBox={
          <div className="flex-1 text-center py-2">
            <span className="text-jade text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <CheckSealIcon className="w-4 h-4 text-jade" />
              {T(lang, '六爻已成，可以解卦', 'All 6 lines cast, ready to divine')}
            </span>
          </div>
        }
        showReset={(linesLen, currentLine) => linesLen > 0 && currentLine < 6}
        resetLabel={T(lang, '重擲', 'Reset')}
        onReset={() => setField('liuyaoLines', '')}
        resetClassName="px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors"
      />
    </>
  )
}
