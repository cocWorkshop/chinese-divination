'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    defaultHourlyQuota: '10',
    divinationEnabled: 'true',
    maintenanceMode: 'false',
    model1Name: 'anthropic/claude-3-5-haiku',
    model1Label: '标准模型 / Standard',
    model2Name: 'anthropic/claude-sonnet-4',
    model2Label: '高级模型 / Premium',
    freeDailyModel1: '20',
    freeDailyModel2: '2',
    paidDailyModel1: '-1',
    paidDailyModel2: '20',
    shareBonus: '20',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { if (d.settings) setSettings(s => ({ ...s, ...d.settings })) })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
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
        <h1 className="text-2xl font-serif text-gold">系统设置</h1>
        <p className="text-white/40 text-sm mt-1">Global configuration</p>
      </div>

      <div className="space-y-6">
        {/* Model Configuration */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🤖</span> 模型配置 / Model Configuration
          </h2>
          <div className="space-y-4">
            {textField('model1Name', '标准模型 API名称 / Standard Model Name', 'e.g. anthropic/claude-3-5-haiku')}
            {textField('model1Label', '标准模型 显示名 / Standard Model Label')}
            {textField('model2Name', '高级模型 API名称 / Premium Model Name', 'e.g. anthropic/claude-sonnet-4')}
            {textField('model2Label', '高级模型 显示名 / Premium Model Label')}
          </div>
        </div>

        {/* Tier Limits - Free */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🆓</span> 免费用户限制 / Free User Limits
          </h2>
          <div className="space-y-4">
            {numberField('freeDailyModel1', '标准模型每日次数 / Standard daily limit', '-1 = 无限制 / unlimited')}
            {numberField('freeDailyModel2', '高级模型每日次数 / Premium daily limit', '-1 = 无限制 / unlimited')}
          </div>
        </div>

        {/* Tier Limits - Paid */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>💎</span> 付费用户限制 / Paid User Limits
          </h2>
          <div className="space-y-4">
            {numberField('paidDailyModel1', '标准模型每日次数 / Standard daily limit', '-1 = 无限制 / unlimited')}
            {numberField('paidDailyModel2', '高级模型每日次数 / Premium daily limit', '-1 = 无限制 / unlimited')}
          </div>
        </div>

        {/* Share Settings */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🔗</span> 分享设置 / Share Settings
          </h2>
          {numberField('shareBonus', '分享奖励次数 / Bonus credits per share', '分享者和接受者各获得此数量的标准模型额外次数')}
        </div>

        {/* Legacy Rate Limiting */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>⏱</span> 旧版配额 / Legacy Quota
          </h2>
          {numberField('defaultHourlyQuota', '默认每小时配额（新用户）/ Default hourly quota', '此设置已被新的每日限制系统取代')}
        </div>

        {/* Service Switches */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            <span>🔌</span> 服务开关 / Service Switches
          </h2>
          <div className="space-y-4">
            {[
              { key: 'divinationEnabled', label: '占卜功能', enLabel: 'Divination enabled', desc: '关闭后所有用户将无法提交占卜请求' },
              { key: 'maintenanceMode', label: '维护模式', enLabel: 'Maintenance mode', desc: '开启后所有占卜请求返回维护提示', danger: true },
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
          {saving ? 'Saving...' : '保存设置 Save Settings'}
        </button>
      </div>
    </div>
  )
}
