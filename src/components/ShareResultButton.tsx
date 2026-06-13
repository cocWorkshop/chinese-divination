'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { T } from '@/lib/i18n'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers that block clipboard API outside user gesture
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
}

export default function ShareResultButton({ readingId, shareToken, lang = 'zh-TW', variant = 'block' }: {
  readingId: string
  shareToken?: string | null
  lang?: string
  /** 'block' = full-width section with inline URL display (default).
   *  'inline' = a compact pill button suited to a header corner; copies on click. */
  variant?: 'block' | 'inline'
}) {
  const [url, setUrl] = useState<string | null>(
    shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${shareToken}` : null
  )
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/readings/${readingId}/share`, { method: 'POST' })
      const data = await res.json()
      if (data.token) {
        const link = `${window.location.origin}/r/${data.token}`
        setUrl(link)
        const copied = await copyToClipboard(link)
        if (copied) {
          toast.success(T(lang, '連結已複製！', 'Link copied!'))
        } else {
          toast.success(T(lang, '分享連結已生成', 'Share link generated'))
        }
      }
    } catch { toast.error(T(lang, '分享失敗', 'Share failed')) }
    setLoading(false)
  }

  // Compact pill — used in the result card's header corner.
  if (variant === 'inline') {
    return (
      <button
        onClick={url
          ? () => { copyToClipboard(url).then(ok => { if (ok) toast.success(T(lang, '連結已複製！', 'Link copied!')) }) }
          : generate}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
        style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)', color: 'var(--gold)', border: '1px solid rgba(212, 168, 83, 0.25)' }}
      >
        {loading ? '...' : url ? `🔗 ${T(lang, '複製連結', 'Copy link')}` : `📤 ${T(lang, '分享', 'Share')}`}
      </button>
    )
  }

  if (url) {
    return (
      <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--card-border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🔗</span>
        <code className="text-xs break-all px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--gold)' }}>{url}</code>
        <button
          onClick={() => { copyToClipboard(url).then(ok => { if (ok) toast.success(T(lang, '已複製', 'Copied!')) }) }}
          className="px-2 py-0.5 text-xs rounded transition-colors"
          style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)', color: 'var(--gold)' }}
        >
          📋
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
      <button
        onClick={generate}
        disabled={loading}
        className="px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50"
        style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)', color: 'var(--gold)', border: '1px solid rgba(212, 168, 83, 0.2)' }}
      >
        {loading ? '...' : `📤 ${T(lang, '分享結果', 'Share Result')}`}
      </button>
    </div>
  )
}
