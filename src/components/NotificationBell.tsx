'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useLang } from './LanguageContext'
import Link from 'next/link'
import { catchAndReport } from '@/lib/errorReporter'
import { T } from '@/lib/i18n'

interface NotificationItem {
  id: string
  title: string
  titleEn: string
  type: string
  createdAt: string
  read: boolean
}

const TYPE_ICONS: Record<string, string> = {
  info: '\u{1F4E2}',
  warning: '\u26A0\uFE0F',
  update: '\u{1F195}',
  promo: '\u{1F381}',
}

function timeAgo(date: string, lang: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return T(lang, '剛剛', 'just now')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return T(lang, `${minutes}分鐘前`, `${minutes}m ago`)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return T(lang, `${hours}小時前`, `${hours}h ago`)
  const days = Math.floor(hours / 24)
  return T(lang, `${days}天前`, `${days}d ago`)
}

export default function NotificationBell() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) return
    fetch('/api/notifications/unread-count')
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(catchAndReport('/api/notifications/unread-count'))
  }, [session])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadNotifications = async () => {
    if (loading) return
    setLoading(true)
    try {
      const r = await fetch('/api/notifications')
      const data = await r.json()
      setNotifications(Array.isArray(data) ? data.slice(0, 5) : [])
    } catch (e) {
      catchAndReport('/api/notifications')(e)
    }
    setLoading(false)
  }

  const handleToggle = () => {
    if (!open) loadNotifications()
    setOpen(!open)
  }

  if (!session) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative px-2 py-1 rounded border border-gold/40 text-gold/80 hover:border-gold hover:text-gold text-sm transition-colors"
        title={T(lang, '通知', 'Notifications')}
        aria-label={T(lang, '通知', 'Notifications')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-foreground text-[10px] font-bold px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl overflow-hidden z-50"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-gold)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-gold)' }}>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {T(lang, '通知', 'Notifications')}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                {T(lang, '載入中...', 'Loading...')}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                {T(lang, '暫無通知', 'No notifications')}
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 border-b transition-colors hover:opacity-80"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: n.read ? 'transparent' : 'var(--bg-highlight, rgba(212, 168, 83, 0.05))',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{TYPE_ICONS[n.type] || TYPE_ICONS.info}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                        >
                          {T(lang, n.title, n.titleEn)}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted, var(--text-secondary))' }}>
                        {timeAgo(n.createdAt, lang)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-sm text-gold hover:text-gold-light transition-colors border-t"
            style={{ borderColor: 'var(--border-gold)' }}
          >
            {T(lang, '查看全部', 'View all')}
          </Link>
        </div>
      )}
    </div>
  )
}
