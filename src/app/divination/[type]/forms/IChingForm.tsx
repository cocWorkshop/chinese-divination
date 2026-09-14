'use client'

import { DivinationIcon, CheckSealIcon } from '@/components/DivinationIcons'
import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import CoinCastPanel from './fields/CoinCastPanel'
import FormSection from './fields/FormSection'

export default function IChingForm() {
  const { form, setField, resetIchingCast, lang } = useDivination()
  return (
    <>
      <FormSection title={
        <span className="flex items-center gap-1.5">
          <DivinationIcon type="iching" className="w-4 h-4 text-gold-light" />
          <span>{T(lang, '占問', 'Inquiry')}</span>
        </span>
      }>
        <div>
          <label htmlFor="iching-question" className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
          <textarea id="iching-question" className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '請詳述您想詢問的事情...', 'Describe your question in detail...')} />
        </div>
      </FormSection>
      <CoinCastPanel
        field="ichingLines"
        title={
          <span className="flex items-center gap-1.5">
            <DivinationIcon type="iching" className="w-4 h-4 text-gold-light" />
            <span>{T(lang, '起卦（三枚銅錢法）', 'Cast Hexagram (Three Coin Method)')}</span>
          </span>
        }
        intro={T(lang,
          '靜心默念所問，每次擲三枚銅錢——字面為陰（值2），背面為陽（值3）。三枚合計：6=老陰（變爻）、7=少陽、8=少陰、9=老陽（變爻）。共擲六次，從初爻到上爻。',
          'Focus on your question. Toss 3 coins: Heads=2 (Yin), Tails=3 (Yang). Sum: 6=Old Yin (changing), 7=Young Yang, 8=Young Yin, 9=Old Yang (changing). Toss 6 times, from bottom to top.'
        )}
        completeBox={
          <div className="flex-1 px-5 py-3 border border-gold/40 bg-gold/10 text-gold rounded-xl text-center text-sm font-semibold flex items-center justify-center gap-1.5">
            <CheckSealIcon className="w-4 h-4 text-gold" />
            <span>{T(lang, '六爻已成，可以解卦', 'Six lines cast — ready to consult')}</span>
          </div>
        }
        showReset={(_linesLen, currentLine) => currentLine > 0}
        resetLabel={T(lang, '重起', 'Reset')}
        onReset={resetIchingCast}
      />
    </>
  )
}
