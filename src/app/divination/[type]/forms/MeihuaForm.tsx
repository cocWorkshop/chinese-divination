'use client'

import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls } from '../constants'
import FormSection from './fields/FormSection'

export default function MeihuaForm() {
  const { form, setField, lang } = useDivination()
  const method = form.meihuaMethod || 'numbers'

  const handleRandomNumbers = () => {
    const r1 = Math.floor(Math.random() * 99) + 1
    const r2 = Math.floor(Math.random() * 99) + 1
    setField('num1', String(r1))
    setField('num2', String(r2))
  }

  return (
    <FormSection title={`🌸 ${T(lang, '梅花易數起卦', 'Plum Blossom Divination')}`}>
      <div>
        <label htmlFor="meihua-question" className={labelCls}>{T(lang, '您的問題', 'Your Question')}</label>
        <textarea
          id="meihua-question"
          className={inputCls + ' h-24 resize-none'}
          value={form.question}
          onChange={e => setField('question', e.target.value)}
          required
          placeholder={T(lang, '詳述想預測的事項...', 'Describe what you want to predict...')}
        />
      </div>

      <div>
        <label className={labelCls}>{T(lang, '起卦方式', 'Casting Method')}</label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
              method === 'numbers'
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-navy-900 border-white/10 text-white/60 hover:text-white'
            }`}
            onClick={() => setField('meihuaMethod', 'numbers')}
          >
            🔢 {T(lang, '報數起卦 (推薦)', 'Number Casting (Recommended)')}
          </button>
          <button
            type="button"
            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
              method === 'time'
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-navy-900 border-white/10 text-white/60 hover:text-white'
            }`}
            onClick={() => setField('meihuaMethod', 'time')}
          >
            ⏰ {T(lang, '時間起卦', 'Time Casting')}
          </button>
        </div>

        {method === 'numbers' ? (
          <div className="space-y-3 p-4 bg-navy-900/60 rounded-xl border border-gold/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">
                {T(lang, '請輸入 1~99 的兩個數字，或點擊隨機生成：', 'Enter two numbers (1-99), or generate randomly:')}
              </span>
              <button
                type="button"
                onClick={handleRandomNumbers}
                className="text-xs bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
              >
                🎲 {T(lang, '隨機報數', 'Random Numbers')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="meihua-num1" className="text-xs text-white/60 mb-1 block">
                  {T(lang, '數字一 (上卦)', 'First Number (Upper)')}
                </label>
                <input
                  id="meihua-num1"
                  type="number"
                  min="1"
                  max="999"
                  required={method === 'numbers'}
                  placeholder="如: 33"
                  className={inputCls}
                  value={form.num1 || ''}
                  onChange={e => setField('num1', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="meihua-num2" className="text-xs text-white/60 mb-1 block">
                  {T(lang, '數字二 (下卦)', 'Second Number (Lower)')}
                </label>
                <input
                  id="meihua-num2"
                  type="number"
                  min="1"
                  max="999"
                  required={method === 'numbers'}
                  placeholder="如: 66"
                  className={inputCls}
                  value={form.num2 || ''}
                  onChange={e => setField('num2', e.target.value)}
                />
              </div>
            </div>
            <p className="text-white/40 text-xs">
              {T(
                lang,
                '原理：數一取上卦，數二取下卦，兩數之和取動爻，避免同一時辰卦象重複。',
                'Principle: First number gives Upper Trigram, second gives Lower Trigram, sum determines moving line.'
              )}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="meihua-reading-time" className={labelCls}>{T(lang, '起卦時間', 'Reading Date/Time')}</label>
            <input
              id="meihua-reading-time"
              type="datetime-local"
              className={inputCls}
              value={form.readingDateTime}
              onChange={e => setField('readingDateTime', e.target.value)}
            />
            <p className="text-white/40 text-xs mt-1">
              {T(lang, '默認為當前時間，以年月日時干支數起卦', 'Defaults to current time. Casts by lunar calendar date and shichen.')}
            </p>
          </div>
        )}
      </div>
    </FormSection>
  )
}
