'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import YinYangIcon from '@/components/YinYangIcon'

type GiftStatus = 'loading' | 'ready' | 'already_claimed' | 'expired' | 'exhausted' | 'invalid' | 'claiming' | 'success' | 'error' | 'need_login'

export default function GiftClaimPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<GiftStatus>('loading')
  const [credits, setCredits] = useState(0)
  const [note, setNote] = useState('')
  const [claimCount, setClaimCount] = useState(0)
  const [maxClaims, setMaxClaims] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch(`/api/gift/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ready') {
          setCredits(data.credits)
          setNote(data.note || '')
          setClaimCount(data.claimCount || 0)
          setMaxClaims(data.maxClaims || 0)
          setStatus('ready')
        } else if (data.status === 'already_claimed') {
          setCredits(data.credits)
          setClaimCount(data.claimCount || 0)
          setMaxClaims(data.maxClaims || 0)
          setStatus('already_claimed')
        } else {
          if (data.claimCount !== undefined) setClaimCount(data.claimCount)
          if (data.maxClaims !== undefined) setMaxClaims(data.maxClaims)
          setStatus(data.status || 'invalid')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [code])

  const handleClaim = async () => {
    setStatus('claiming')
    try {
      const res = await fetch(`/api/gift/${code}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setCredits(data.credits)
        setStatus('success')
      } else if (data.error === 'unauthorized') {
        setStatus('need_login')
      } else {
        setErrorMsg(data.message || '領取失敗')
        setStatus('error')
      }
    } catch {
      setErrorMsg('網絡錯誤，請重試')
      setStatus('error')
    }
  }

  const statusConfig: Record<string, { icon: string; title: string; desc: string; color: string }> = {
    loading: { icon: '⏳', title: '加載中...', desc: '', color: 'text-white/60' },
    ready: { icon: '🎁', title: `領取 ${credits} 機緣`, desc: note || '點擊下方按鈕領取您的機緣點數', color: 'text-gold' },
    claiming: { icon: '⏳', title: '領取中...', desc: '請稍候', color: 'text-white/60' },
    success: { icon: '✨', title: `成功領取 ${credits} 機緣！`, desc: '機緣已添加到您的帳戶', color: 'text-green-400' },
    already_claimed: { icon: '✅', title: '已領取', desc: '您已領取過此禮品', color: 'text-blue-400' },
    expired: { icon: '⏰', title: '已過期', desc: '此連結已過期', color: 'text-red-400' },
    exhausted: { icon: '📭', title: '已領完', desc: '此禮品已被領完', color: 'text-orange-400' },
    invalid: { icon: '❌', title: '無效連結', desc: '此連結不存在或已失效', color: 'text-red-400' },
    need_login: { icon: '🔒', title: '請先登入', desc: '登入後即可領取機緣', color: 'text-yellow-400' },
    error: { icon: '⚠️', title: '領取失敗', desc: errorMsg, color: 'text-red-400' },
  }

  const cfg = statusConfig[status] || statusConfig.invalid

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-sm w-full rounded-2xl p-8 text-center space-y-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

        <YinYangIcon size={48} className="mx-auto" />

        <div className="text-5xl">{cfg.icon}</div>
        <h1 className={`text-xl font-serif ${cfg.color}`}>{cfg.title}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cfg.desc}</p>

        {maxClaims > 0 && (status === 'ready' || status === 'already_claimed' || status === 'exhausted') && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            已領取 {claimCount} / {maxClaims}
          </p>
        )}

        {status === 'ready' && (
          <button onClick={handleClaim}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all"
            style={{ backgroundColor: 'var(--gold)', color: '#000' }}>
            🎁 立即領取
          </button>
        )}

        {status === 'need_login' && (
          <button onClick={() => router.push(`/login?callbackUrl=/gift/${code}`)}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all"
            style={{ backgroundColor: 'var(--gold)', color: '#000' }}>
            🔑 前往登入
          </button>
        )}

        {status === 'success' && (
          <button onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all"
            style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--gold)', border: '1px solid var(--card-border)' }}>
            🏠 返回首頁
          </button>
        )}
      </div>
    </div>
  )
}
