'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import YinYangIcon from '@/components/YinYangIcon'

interface Stats {
  totalUsers: number
  totalReadings: number
  readingsToday: number
  readingsThisWeek: number
  readingsByType: { type: string; count: number }[]
  recentUsers: { id: string; email: string; name: string | null; createdAt: string; isAdmin: boolean }[]
  activeUsersLastHour: number
  settings: Record<string, string>
}

const typeLabel: Record<string, string> = {
  bazi: '八字命理', iching: '易经占卜', ziwei: '紫微斗数',
  qimen: '奇门遁甲', fengshui: '风水布局', other: '梅花六壬',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gold animate-pulse">Loading...</div>
  if (!stats) return <div className="p-8 text-red-400">Failed to load stats</div>

  const cards = [
    { label: '总用户数', value: stats.totalUsers, icon: '👥', color: 'text-blue-400' },
    { label: '总占卜次数', value: stats.totalReadings, icon: '☯', color: 'text-gold' },
    { label: '今日占卜', value: stats.readingsToday, icon: '📅', color: 'text-jade' },
    { label: '本周占卜', value: stats.readingsThisWeek, icon: '📈', color: 'text-purple-400' },
    { label: '过去1小时活跃用户', value: stats.activeUsersLastHour, icon: '⚡', color: 'text-yellow-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-gold">系统概览</h1>
        <p className="text-white/40 text-sm mt-1">Overview Dashboard</p>
      </div>

      {/* System Status */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          { key: 'divinationEnabled', label: '占卜功能', on: '已開啟', off: '已關閉' },
          { key: 'maintenanceMode', label: '維護模式', on: '維護中', off: '正常' },
        ].map(s => (
          <div key={s.key} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.settings[s.key] === 'true' && s.key === 'maintenanceMode'
              ? 'border-red-400/50 text-red-400 bg-red-400/10'
              : stats.settings[s.key] === 'true'
              ? 'border-jade/50 text-jade bg-jade/10'
              : 'border-white/20 text-white/40'
          }`}>
            {s.label}: {stats.settings[s.key] === 'true' ? s.on : s.off}
          </div>
        ))}
        <div className="px-3 py-1.5 rounded-full text-xs font-medium border border-gold/30 text-gold/70">
          默认配额: {stats.settings.defaultHourlyQuota}/小时
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="text-2xl mb-2">{card.icon === '☯' ? <YinYangIcon size={28} /> : card.icon}</div>
            <div className={`text-3xl font-bold ${card.color} mb-1`}>{card.value}</div>
            <div className="text-white/50 text-xs">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readings by type */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-gold font-serif mb-4">占卜类型分布</h2>
          <div className="space-y-3">
            {stats.readingsByType.length === 0 && <p className="text-white/40 text-sm">暂无数据</p>}
            {stats.readingsByType.map(item => {
              const pct = stats.totalReadings > 0 ? Math.round((item.count / stats.totalReadings) * 100) : 0
              return (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{typeLabel[item.type] || item.type}</span>
                    <span className="text-gold">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gold/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent users */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-gold font-serif mb-4">最新注册用户</h2>
          <div className="space-y-3">
            {stats.recentUsers.length === 0 && <p className="text-white/40 text-sm">暂无用户</p>}
            {stats.recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <div className="text-white/80 text-sm">{u.name || u.email}</div>
                  <div className="text-white/40 text-xs">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {u.isAdmin && <span className="text-xs px-1.5 py-0.5 bg-gold/20 text-gold rounded">Admin</span>}
                  <span className="text-white/40 text-xs">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
