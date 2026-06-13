'use client'

import { useDivination } from '../DivinationContext'
import { T, inputCls, labelCls, relationPresets } from '../constants'

/**
 * "Reading For" selector (self / family member) for bazi & ziwei. Shown to
 * everyone; for signed-out users the family list is simply empty and the
 * auth check happens on submit.
 */
export default function TargetPersonSelect() {
  const {
    lang,
    targetType, setTargetType,
    selectedMemberId, handleMemberSelect, familyMembers,
    newMemberRelation, setNewMemberRelation,
    newMemberRelationDetail, setNewMemberRelationDetail,
    newMemberName, setNewMemberName,
    selfProfileRef, setForm, setBirthLat, setBirthLng, setSelectedMemberId,
  } = useDivination()

  return (
    <div className="border border-gold/20 rounded-xl p-4 bg-navy-900/50 space-y-3">
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
        {T(lang, '👤 預測對象', '👤 Reading For')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setTargetType('self')
            setSelectedMemberId('')
            if (selfProfileRef.current) {
              const { birthLat: sLat, birthLng: sLng, ...rest } = selfProfileRef.current
              setForm(f => ({ ...f, ...rest }))
              setBirthLat(sLat)
              setBirthLng(sLng)
            }
          }}
          className={`p-3 rounded-lg border text-center transition-all ${
            targetType === 'self'
              ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-white/80 text-sm font-medium">
            {T(lang, '為自己預測', 'For Myself')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTargetType('family')}
          className={`p-3 rounded-lg border text-center transition-all ${
            targetType === 'family'
              ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <span className="text-white/80 text-sm font-medium">
            {T(lang, '為他人預測', 'For Someone Else')}
          </span>
        </button>
      </div>

      {targetType === 'family' && (
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelCls}>{T(lang, '選擇家庭成員', 'Select Family Member')}</label>
            <select
              className={inputCls}
              value={selectedMemberId}
              onChange={e => handleMemberSelect(e.target.value)}
              required
            >
              <option value="">{T(lang, '請選擇', 'Select')}</option>
              {familyMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {relationPresets.find(r => r.value === m.relation)?.[lang === 'en' ? 'en' : 'zh'] || m.relation}
                  {m.name ? ` - ${m.name}` : ''}
                </option>
              ))}
              <option value="__new__">{T(lang, '➕ 新增家庭成員', '➕ Add New Member')}</option>
            </select>
          </div>

          {selectedMemberId === '__new__' && (
            <div className="space-y-3 border-t border-gold/10 pt-3">
              <div>
                <label className={labelCls}>{T(lang, '關係', 'Relationship')}</label>
                <select
                  className={inputCls}
                  value={newMemberRelation}
                  onChange={e => setNewMemberRelation(e.target.value)}
                  required
                >
                  <option value="">{T(lang, '請選擇', 'Select')}</option>
                  {relationPresets.map(r => (
                    <option key={r.value} value={r.value}>
                      {lang === 'en' ? r.en : `${r.zh} (${r.en})`}
                    </option>
                  ))}
                </select>
              </div>
              {newMemberRelation === 'other' && (
                <div>
                  <label className={labelCls}>
                    {T(lang, '具體關係', 'Specific Relationship')}
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={newMemberRelationDetail}
                    onChange={e => setNewMemberRelationDetail(e.target.value)}
                    placeholder={T(lang, '例：岳父、合作夥伴', 'e.g. father-in-law, business partner')}
                    required
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>{T(lang, '姓名（可選）', 'Name (optional)')}</label>
                <input
                  type="text"
                  className={inputCls}
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder={T(lang, '例：張某', 'e.g. John')}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
