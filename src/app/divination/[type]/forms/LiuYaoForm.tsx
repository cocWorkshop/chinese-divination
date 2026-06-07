'use client'

import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import CoinCastPanel from './fields/CoinCastPanel'
import FormSection from './fields/FormSection'

export default function LiuYaoForm() {
  const { form, setField, lang } = useDivination()
  return (
    <>
      <FormSection title={`🔮 ${T(lang, '占問', 'Inquiry')}`}>
        <div>
          <label className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
          <textarea className={inputCls + ' h-24 resize-none'} value={form.question} onChange={e => setField('question', e.target.value)} required placeholder={T(lang, '心中默念所問之事，一事一占，問題越具體越好...', 'Focus on one specific question...')} />
        </div>
      </FormSection>
      <CoinCastPanel
        field="liuyaoLines"
        title={<>🪙 {T(lang, '搖卦（三枚銅錢法）', 'Cast Hexagram (Three Coin Method)')}</>}
        intro={T(lang,
          '每次擲三枚銅錢，字面為陰（值2），背面為陽（值3）。三枚合計：6=老陰（變爻）、7=少陽、8=少陰、9=老陽（變爻）。共擲六次，從初爻到上爻。',
          'Toss 3 coins each time. Heads=2 (Yin), Tails=3 (Yang). Sum: 6=Old Yin (changing), 7=Young Yang, 8=Young Yin, 9=Old Yang (changing). Toss 6 times, from bottom to top.'
        )}
        completeBox={
          <div className="flex-1 text-center py-2">
            <span className="text-jade text-sm font-semibold">✅ {T(lang, '六爻已成，可以解卦', 'All 6 lines cast, ready to divine')}</span>
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
