'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface PaymentItem {
  id: string
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  packId: string | null
  amount: number
  currency: string
  credits: number
  status: string
  note: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
    isPaid: boolean
    paidAt: string | null
  }
}

interface PaymentStats {
  totalRevenue: number
  totalOrders: number
  totalPaidUsers: number
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalPaidUsers: 0,
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/payments?page=${page}&search=${encodeURIComponent(search)}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error('Failed to load')
        }
        return r.json()
      })
      .then((d) => {
        setPayments(d.payments || [])
        setTotal(d.total || 0)
        setPages(d.pages || 1)
        if (d.stats) setStats(d.stats)
      })
      .catch((err) => {
        toast.error(err.message || '加载订单失败')
      })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  const formatAmount = (amount: number, currency: string) => {
    const val = (amount / 100).toFixed(2)
    return currency.toUpperCase() === 'USD' ? `$${val}` : `${currency.toUpperCase()} ${val}`
  }

  return (
    <div className="p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif text-gold">結緣訂單管理</h1>
          <p className="text-white/40 text-sm mt-1">全平台用戶真實支付與充值記錄</p>
        </div>
        <input
          type="text"
          placeholder="搜索郵箱/姓名/訂單號..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 bg-navy-800 border border-gold/20 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50 w-72"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-5 border border-gold/15 bg-navy-900/60">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-1">累計結緣收益</div>
          <div className="text-2xl font-mono font-bold text-amber-400">
            {formatAmount(stats.totalRevenue, 'usd')}
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 border border-gold/15 bg-navy-900/60">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-1">支付訂單總數</div>
          <div className="text-2xl font-mono font-bold text-white">
            {stats.totalOrders} <span className="text-sm font-normal text-white/40">筆</span>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 border border-gold/15 bg-navy-900/60">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-1">尊享付費用戶</div>
          <div className="text-2xl font-mono font-bold text-gold">
            {stats.totalPaidUsers} <span className="text-sm font-normal text-white/40">人</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-xl overflow-x-auto border border-gold/20">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gold/20 text-white/50 text-xs uppercase tracking-wider bg-navy-900/80">
              <th className="px-4 py-3 text-left">結緣用戶</th>
              <th className="px-4 py-3 text-left">訂單編號 / 会话</th>
              <th className="px-4 py-3 text-center">購買套餐</th>
              <th className="px-4 py-3 text-center">結緣金額</th>
              <th className="px-4 py-3 text-center">獲得機緣</th>
              <th className="px-4 py-3 text-center">狀態</th>
              <th className="px-4 py-3 text-right">支付時間</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-white/40">
                  加載中...
                </td>
              </tr>
            )}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-white/40">
                  暫無結緣訂單記錄
                </td>
              </tr>
            )}
            {!loading &&
              payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/80 font-medium">{p.user?.name || '—'}</span>
                      {p.user?.isPaid && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          尊享
                        </span>
                      )}
                    </div>
                    <div className="text-white/40 text-xs">{p.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-white/60 truncate max-w-[200px]" title={p.stripeSessionId || p.id}>
                      {p.stripeSessionId ? p.stripeSessionId.replace('cs_test_', '').replace('cs_live_', '') : p.id}
                    </div>
                    {p.stripePaymentIntentId && (
                      <div className="text-[11px] text-white/30 font-mono truncate max-w-[200px]" title={p.stripePaymentIntentId}>
                        pi: {p.stripePaymentIntentId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 font-mono">
                      {p.packId || 'custom'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-amber-300">
                    {formatAmount(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-green-400">
                    +{p.credits}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'completed'
                          ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {p.status === 'completed' ? '已完成' : p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-white/40 font-mono">
                    {new Date(p.createdAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-4 border-t border-gold/15 flex items-center justify-between text-xs text-white/50">
            <div>
              共 {total} 筆記錄 · 第 {page} / {pages} 頁
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-navy-800 border border-gold/20 rounded hover:bg-gold/10 disabled:opacity-30 disabled:pointer-events-none text-white"
              >
                上一頁
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="px-3 py-1 bg-navy-800 border border-gold/20 rounded hover:bg-gold/10 disabled:opacity-30 disabled:pointer-events-none text-white"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
