'use client'

import { useEffect, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'

interface VisibilityItem {
  type: string
  visible: boolean
  order: number
}

const TYPE_INFO: Record<string, { icon: string; zh: string; en: string }> = {
  bazi: { icon: '☰', zh: '八字命理', en: 'BaZi' },
  iching: { icon: '☯', zh: '易經占卜', en: 'I Ching' },
  liuyao: { icon: '☯', zh: '六爻占卜', en: 'Liu Yao' },
  ziwei: { icon: '⭐', zh: '紫微斗數', en: 'Zi Wei' },
  qimen: { icon: '⚡', zh: '奇門遁甲', en: 'Qi Men' },
  fengshui: { icon: '🏯', zh: '風水佈局', en: 'Feng Shui' },
  meihua: { icon: '🌸', zh: '梅花易數', en: 'Mei Hua' },
}

const DEFAULT_VISIBILITY: VisibilityItem[] = [
  { type: 'bazi', visible: true, order: 1 },
  { type: 'ziwei', visible: true, order: 2 },
  { type: 'liuyao', visible: true, order: 3 },
  { type: 'qimen', visible: true, order: 4 },
  { type: 'fengshui', visible: true, order: 5 },
  { type: 'meihua', visible: true, order: 6 },
  { type: 'iching', visible: false, order: 7 },
]

export default function AdminSettings() {
  const [visibilityItems, setVisibilityItems] = useState<VisibilityItem[]>(DEFAULT_VISIBILITY)
  const [settings, setSettings] = useState<Record<string, string>>({
    divinationEnabled: 'true',
    maintenanceMode: 'false',
    model1Name: 'anthropic/claude-3-5-haiku',
    model1Label: '標準模型 / Standard',
    registerBonus: '6',
    shareBonus: '20',
    shareBonusChat: '5',
    dailyBonusCredits: '2',
    llmTimeoutSeconds: '240',
    llmMaxTokens: '8192',
    llmReasoningEffort: 'medium',
    chatModelName: '',
    masterModelName: '',
    masterBackgroundModelName: '',
    // Per-function reasoning / tokens / timeout (defaults mirror settings.ts).
    divinationReasoningEffort: 'medium',
    divinationMaxTokens: '8192',
    divinationTimeoutSeconds: '240',
    chatReasoningEffort: 'low',
    chatMaxTokens: '8192',
    chatTimeoutSeconds: '240',
    masterReasoningEffort: 'low',
    masterMaxTokens: '8192',
    masterTimeoutSeconds: '240',
    masterBackgroundReasoningEffort: 'off',
    masterBackgroundMaxTokens: '1500',
    masterBackgroundTimeoutSeconds: '240',
    cost_bazi: '5',
    cost_ziwei: '5',
    cost_qimen: '5',
    cost_meihua: '3',
    cost_iching: '3',
    cost_liuyao: '3',
    cost_fengshui: '3',
    cost_chat: '2',
    cost_master: '1',
    cost_dayun_unlock: '1',
    free_dayun_limit: '3',
    showWikiNav: 'false',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/divination/visibility').then(r => r.json()),
    ]).then(([statsData, visData]) => {
      if (statsData.settings) setSettings(s => ({ ...s, ...statsData.settings }))
      if (Array.isArray(visData)) setVisibilityItems(visData.sort((a: VisibilityItem, b: VisibilityItem) => a.order - b.order))
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    const allSettings = {
      ...settings,
      divination_visibility: JSON.stringify(visibilityItems),
    }
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allSettings),
    })
    if (res.ok) toast.success('Settings saved')
    else toast.error('Failed to save')
    setSaving(false)
  }

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }))

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading...</div>

  const textField = (key: string, label: string, desc?: string) => (
    <div>
      <label className="text-white/60 text-sm block mb-2">{label}</label>
      <input
        type="text"
        value={settings[key] || ''}
        onChange={e => set(key, e.target.value)}
        className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/50 text-sm"
      />
      {desc && <p className="text-white/30 text-xs mt-1">{desc}</p>}
    </div>
  )

  const numberField = (key: string, label: string, desc?: string) => (
    <div>
      <label className="text-white/60 text-sm block mb-2">{label}</label>
      <input
        type="number"
        value={settings[key] || '0'}
        onChange={e => set(key, e.target.value)}
        className="w-32 px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/50 text-sm"
      />
      {desc && <p className="text-white/30 text-xs mt-1">{desc}</p>}
    </div>
  )

  const REASONING_OPTIONS = [
    { v: 'off', l: '關閉 / Off' },
    { v: 'low', l: '低 / Low' },
    { v: 'medium', l: '中 / Medium' },
    { v: 'high', l: '高 / High' },
  ]

  const selectField = (key: string, label: string, options: { v: string; l: string }[], desc?: string) => (
    <div>
      <label className="text-white/60 text-sm block mb-2">{label}</label>
      <select
        value={settings[key] || ''}
        onChange={e => set(key, e.target.value)}
        className="w-full px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white focus:outline-none focus:border-gold/50 text-sm"
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {desc && <p className="text-white/30 text-xs mt-1">{desc}</p>}
    </div>
  )

  // One function's full config block: model + reasoning + tokens + timeout.
  const fnBlock = (
    title: string,
    modelFields: React.ReactNode,
    keys: { reasoning: string; maxTokens: string; timeout: string },
  ) => (
    <div className="border-t border-gold/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-gold text-sm font-bold mb-3">{title}</h3>
      <div className="space-y-3">
        {modelFields}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {selectField(keys.reasoning, '思考強度 / Reasoning', REASONING_OPTIONS)}
          {numberField(keys.maxTokens, '最大Tokens / Max tokens')}
          {numberField(keys.timeout, '超時秒數 / Timeout (s)')}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-gold">系統設置</h1>
        <p className="text-white/40 text-sm mt-1">Global configuration</p>
      </div>

      <div className="space-y-6">
        {/* Model Configuration */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🤖</span> 模型配置 / Model Configuration
          </h2>
          <p className="text-white/40 text-xs mb-2">每個功能可獨立配置模型、思考強度、最大Tokens 與超時。留空則回退到下方「全局默認」。/ Each function configures its own model, reasoning, max-tokens and timeout; blank falls back to the global defaults below.</p>
          <p className="text-amber-300/70 text-xs mb-4">⚠️ 「思考強度 / Reasoning」僅對支援推理的模型生效（如 Claude 3.7+/4、OpenAI o系列/GPT-5、Gemini 2.5 thinking、Grok）。對 claude-3-5-haiku、gpt-4o 等非推理模型無效（會被安全忽略）。/ Reasoning only affects reasoning-capable models; it is silently ignored by non-reasoning models.</p>
          <div className="space-y-5">
            {fnBlock('占卜 / Divination',
              <>
                {/* Divination keeps the legacy "model1" key names (model1 == the Divination/standard model). */}
                {textField('model1Name', '模型 API名称 / Model Name（model1）', 'e.g. anthropic/claude-3-5-haiku')}
                {textField('model1Label', '顯示名 / Model Label（model1）')}
              </>,
              { reasoning: 'divinationReasoningEffort', maxTokens: 'divinationMaxTokens', timeout: 'divinationTimeoutSeconds' })}
            {fnBlock('聊天 / Chat',
              textField('chatModelName', '模型 / Model Name', '留空則使用占卜模型'),
              { reasoning: 'chatReasoningEffort', maxTokens: 'chatMaxTokens', timeout: 'chatTimeoutSeconds' })}
            {fnBlock('玄機大師 · 主對話 / Master',
              textField('masterModelName', '模型 / Model Name', '留空用 MASTER_MODEL 或占卜模型，預設 openai/gpt-4o'),
              { reasoning: 'masterReasoningEffort', maxTokens: 'masterMaxTokens', timeout: 'masterTimeoutSeconds' })}
            {fnBlock('玄機大師 · 後台任務 / Master Background',
              textField('masterBackgroundModelName', '模型 / Model Name', '對話摘要、用戶畫像提取等，留空預設 openai/gpt-4o-mini'),
              { reasoning: 'masterBackgroundReasoningEffort', maxTokens: 'masterBackgroundMaxTokens', timeout: 'masterBackgroundTimeoutSeconds' })}
          </div>
        </div>

        {/* Karma Economy & Gating Rules / 機緣體系與收費規則 */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-gold flex items-center gap-2">
              <span>☯</span> 機緣體系與收費規則 / Karma Economy & Gating Rules
            </h2>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              全站統一以「機緣」（Karma Credits）衡量天機因果流轉。包含善緣結付（註冊、每日登入、分享引薦）、天機啟盤（各術數排盤起卦）、大師請益以及大運階梯解鎖機制。
            </p>
          </div>

          {/* Section 1: Inflows / 善緣贈予 */}
          <div>
            <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2 mb-3">
              <span className="text-amber-400">✦</span> 因果流轉 · 善緣贈予 (Inflows & Rewards)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numberField('registerBonus', '註冊善緣 / Register Karma', '新用戶首次註冊結緣贈送之機緣點數')}
              {numberField('dailyBonusCredits', '晨夕感應 / Daily Login Karma', '每日首次登入結緣修習贈送之機緣點數')}
              {numberField('shareBonus', '廣結善緣 / Referral Karma', '分享引薦同道結緣，邀請人與受邀人各得機緣')}
              {numberField('shareBonusChat', '舊版分享兼容 / Legacy Chat Bonus', '舊版引薦聊天額度（向前兼容）')}
            </div>
          </div>

          {/* Section 2: Outflows / 天機啟盤消耗 */}
          <div className="border-t border-white/10 pt-5">
            <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2 mb-3">
              <span className="text-amber-400">✦</span> 天機啟盤 · 消耗規則 (Divination & Consultation Costs)
            </h3>
            <p className="text-white/40 text-xs mb-3">每次啟動命盤排盤、起卦筮爻或深入諮商時所扣減之機緣點數。</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {numberField('cost_bazi', '八字命理啟盤 / BaZi', '預設 5 點機緣')}
              {numberField('cost_ziwei', '紫微斗數排盤 / Zi Wei', '預設 5 點機緣')}
              {numberField('cost_qimen', '奇門遁甲起局 / Qi Men', '預設 5 點機緣')}
              {numberField('cost_meihua', '梅花易數起卦 / Mei Hua', '預設 3 點機緣')}
              {numberField('cost_iching', '周易筮爻求筮 / I Ching', '預設 3 點機緣')}
              {numberField('cost_liuyao', '六爻納甲立卦 / Liu Yao', '預設 3 點機緣')}
              {numberField('cost_fengshui', '堪輿風水定穴 / Feng Shui', '預設 3 點機緣')}
              {numberField('cost_chat', '卦盤深入解惑 / In-depth Chat', '預設 2 點機緣 / 次')}
              {numberField('cost_master', '請益玄機大師 / Ask Master', '預設 1 點機緣 / 問')}
            </div>
          </div>

          {/* Section 3: Decadal Gating / 大運階梯解鎖 */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <span className="text-amber-400">✦</span> 大運階梯解鎖規則 (Decadal Gating)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                三十年世 · 階梯解鎖
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-950/60 border border-gold/20 text-xs text-white/70 leading-relaxed mb-4">
              <p className="text-gold/90 font-medium mb-1">古籍云：“三十年為一世，立命而後通變。”</p>
              <p>
                古制三十年為一世。在八字命理及紫微斗數之大運/大限批算中，規約前 <strong>{settings.free_dayun_limit || '3'}</strong> 步大運（凡三十年，涵蓋求學、立命、初涉俗世）完全免費開放精批；自第 <strong>{Number(settings.free_dayun_limit || 3) + 1}</strong> 步大運及之後，每窺探一步大運（十年流年星度詳批）需結付相應機緣。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numberField('free_dayun_limit', '免費開放大運步數 / Free DaYun Decades Limit', '預設 3 步（前三十年大運免費，覆蓋青少年至立業期）')}
              {numberField('cost_dayun_unlock', '大運解鎖機緣 / Decadal Unlock Karma', '每解鎖一步大運（十年精批）所需結付之機緣點數，預設 1 點')}
            </div>
          </div>
        </div>


        {/* Divination Visibility */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>👁</span> 占卜類型顯示 / Divination Visibility
          </h2>
          <p className="text-white/40 text-xs mb-4">控制首頁和選擇頁面顯示哪些占卜類型及順序 / Control which types appear and their display order</p>
          <div className="space-y-2">
            {visibilityItems.map((item, idx) => {
              const info = TYPE_INFO[item.type]
              if (!info) return null
              return (
                <div key={item.type} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-navy-800/50">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const arr = [...visibilityItems]
                        ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
                        setVisibilityItems(arr.map((it, i) => ({ ...it, order: i + 1 })))
                      }}
                      className="text-white/40 hover:text-gold disabled:opacity-20 text-xs leading-none"
                    >▲</button>
                    <button
                      type="button"
                      disabled={idx === visibilityItems.length - 1}
                      onClick={() => {
                        const arr = [...visibilityItems]
                        ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
                        setVisibilityItems(arr.map((it, i) => ({ ...it, order: i + 1 })))
                      }}
                      className="text-white/40 hover:text-gold disabled:opacity-20 text-xs leading-none"
                    >▼</button>
                  </div>
                  <span className="text-2xl w-8 text-center">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white/80 text-sm">{info.zh}</span>
                    <span className="text-white/40 text-xs ml-2">{info.en}</span>
                  </div>
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={item.visible}
                      onChange={e => {
                        setVisibilityItems(prev => prev.map(it =>
                          it.type === item.type ? { ...it, visible: e.target.checked } : it
                        ))
                      }}
                      className="sr-only"
                    />
                    <div
                      onClick={() => {
                        setVisibilityItems(prev => prev.map(it =>
                          it.type === item.type ? { ...it, visible: !it.visible } : it
                        ))
                      }}
                      className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                        item.visible ? 'bg-jade' : 'bg-navy-800 border border-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        item.visible ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Global LLM fallback defaults */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>⏳</span> 全局默認 / Global LLM Defaults
          </h2>
          <p className="text-white/40 text-xs mb-4">當某功能未單獨設定時使用。/ Used only when a function above leaves a field blank.</p>
          <div className="space-y-4">
            {selectField('llmReasoningEffort', '全局思考強度 / Global reasoning', REASONING_OPTIONS, '默認 medium')}
            {numberField('llmTimeoutSeconds', '全局請求超時（秒）/ Global timeout (seconds)', '默認 240 秒')}
            {numberField('llmMaxTokens', '全局最大輸出 Tokens / Global max output tokens', '默認 8192，八字精批建議 8192+')}
          </div>
        </div>

        {/* Service Switches */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🔌</span> 服務開關 / Service Switches
          </h2>
          <div className="space-y-4">
            {[
              { key: 'divinationEnabled', label: '占卜功能', enLabel: 'Divination enabled', desc: '關閉後所有用戶將無法提交占卜請求' },
              { key: 'showWikiNav', label: 'Wiki 知識庫入口', enLabel: 'Show Wiki in nav', desc: '在導航欄顯示 Wiki 知識庫連結' },
              { key: 'maintenanceMode', label: '維護模式', enLabel: 'Maintenance mode', desc: '開啟後所有占卜請求返回維護提示', danger: true },
            ].map(item => (
              <label key={item.key} className="flex items-start gap-4 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={settings[item.key] === 'true'}
                    onChange={e => set(item.key, e.target.checked ? 'true' : 'false')}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    settings[item.key] === 'true'
                      ? item.danger ? 'bg-red-500' : 'bg-jade'
                      : 'bg-navy-800 border border-white/20'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings[item.key] === 'true' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-medium ${item.danger && settings[item.key] === 'true' ? 'text-red-400' : 'text-white/80'}`}>
                    {item.label} <span className="text-white/30 font-normal">/ {item.enLabel}</span>
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-8 py-3 bg-gold text-navy-950 rounded-xl font-semibold hover:bg-gold-light disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : '儲存設置 Save Settings'}
        </button>
      </div>
    </div>
  )
}
