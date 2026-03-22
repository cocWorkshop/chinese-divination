'use client'

import { useEffect, useState } from 'react'
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
  meihua: { icon: '🌸', zh: '梅花六壬', en: 'Mei Hua' },
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
    divinationType_bazi_tier: 'normal',
    divinationType_iching_tier: 'normal',
    divinationType_ziwei_tier: 'normal',
    divinationType_qimen_tier: 'normal',
    divinationType_fengshui_tier: 'normal',
    divinationType_other_tier: 'normal',
    defaultHourlyQuota: '10',
    divinationEnabled: 'true',
    maintenanceMode: 'false',
    model1Name: 'anthropic/claude-3-5-haiku',
    model1Label: '標準模型 / Standard',
    shareBonus: '20',
    llmTimeoutSeconds: '240',
    llmMaxTokens: '8192',
    chatModelName: '',
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
          <div className="space-y-4">
            {textField('model1Name', '占卜模型 API名称 / Divination Model Name', 'e.g. anthropic/claude-3-5-haiku')}
            {textField('model1Label', '占卜模型 顯示名 / Divination Model Label')}
            {textField('chatModelName', '聊天模型 / Chat Model Name', '留空則使用占卜模型')}
          </div>
        </div>

        {/* Share Settings */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🔗</span> 分享設置 / Share Settings
          </h2>
          {numberField('shareBonus', '分享獎勵占卜額度 / Divination credits per share', '分享者和受邀者各獲得此數量的占卜額度')}
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

        {/* Divination Type Tiers */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>✦</span> 預測類型分級 / Divination Type Tiers
          </h2>
          <div className="space-y-4">
            {[
              { key: 'bazi', label: '八字命理 / BaZi' },
              { key: 'iching', label: '易經占卜 / I Ching' },
              { key: 'ziwei', label: '紫微斗數 / Zi Wei' },
              { key: 'qimen', label: '奇門遁甲 / Qi Men' },
              { key: 'fengshui', label: '風水佈局 / Feng Shui' },
              { key: 'other', label: '梅花六壬 / Plum & Liu Ren' },
            ].map(item => {
              const settingKey = `divinationType_${item.key}_tier`
              const currentTier = settings[settingKey] || 'arcane'
              const tierOptions = [
                { value: 'arcane', label: '🔮 啟示 Arcane', cls: 'bg-white/10 text-white/50 border-white/20' },
                { value: 'ethereal', label: '✧ 洞察 Ethereal', cls: 'bg-blue-500/15 text-blue-300 border-blue-400/30' },
                { value: 'prestige', label: '✦ 大師 Prestige', cls: 'bg-gold/20 text-gold border-gold/40' },
              ]
              return (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <span className="text-white/80 text-sm flex-shrink-0">{item.label}</span>
                  <div className="flex gap-1">
                    {tierOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set(settingKey, opt.value)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
                          currentTier === opt.value ? opt.cls : 'bg-transparent text-white/20 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legacy Rate Limiting */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>⏱</span> 舊版配額 / Legacy Quota
          </h2>
          {numberField('defaultHourlyQuota', '預設每小時配額（新用戶）/ Default hourly quota', '此設置已被新的每日限制系統取代')}
        </div>

        {/* LLM Timeout */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>⏳</span> LLM 超時設置 / LLM Timeout
          </h2>
          <div className="space-y-4">
            {numberField('llmTimeoutSeconds', 'LLM 請求超時（秒）/ LLM request timeout (seconds)', '默認 240 秒，適用於占卜和聊天接口')}
            {numberField('llmMaxTokens', 'LLM 最大輸出 Tokens / Max output tokens', '默認 8192，八字精批建議 8192+')}
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
