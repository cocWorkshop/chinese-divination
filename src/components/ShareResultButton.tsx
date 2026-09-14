'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { T } from '@/lib/i18n'
import { LinkIcon, ShareIcon, CopyIcon } from '@/components/DivinationIcons'

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

  const revoke = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/readings/${readingId}/share`, { method: 'DELETE' })
      if (res.ok) {
        setUrl(null)
        toast.success(T(lang, '已停止分享，連結已失效', 'Sharing stopped — link revoked'))
      } else {
        toast.error(T(lang, '操作失敗', 'Operation failed'))
      }
    } catch { toast.error(T(lang, '操作失敗', 'Operation failed')) }
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30"
      >
        {loading ? (
          '...'
        ) : url ? (
          <>
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{T(lang, '複製連結', 'Copy link')}</span>
          </>
        ) : (
          <>
            <ShareIcon className="w-3.5 h-3.5" />
            <span>{T(lang, '分享', 'Share')}</span>
          </>
        )}
      </button>
    )
  }

  if (url) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex items-center gap-2 flex-wrap">
        <LinkIcon className="w-4 h-4 text-gold/70 flex-shrink-0" />
        <code className="text-xs break-all px-2 py-1 rounded bg-[var(--accent-bg)] text-gold border border-gold/20 flex-1">{url}</code>
        <button
          onClick={() => { copyToClipboard(url).then(ok => { if (ok) toast.success(T(lang, '已複製', 'Copied!')) }) }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] text-xs rounded transition-colors bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30"
          title={T(lang, '複製連結', 'Copy link')}
        >
          <CopyIcon className="w-3.5 h-3.5" />
          <span>{T(lang, '複製', 'Copy')}</span>
        </button>
        <button
          onClick={revoke}
          disabled={loading}
          className="px-2.5 py-1.5 min-h-[32px] text-xs rounded transition-colors disabled:opacity-50 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30"
          title={T(lang, '停止分享並使連結失效', 'Stop sharing and revoke the link')}
        >
          {T(lang, '停止分享', 'Stop sharing')}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] text-xs rounded-lg transition-colors disabled:opacity-50 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30"
      >
        <ShareIcon className="w-3.5 h-3.5" />
        <span>{loading ? '...' : T(lang, '分享結果', 'Share Result')}</span>
      </button>
    </div>
  )
}
