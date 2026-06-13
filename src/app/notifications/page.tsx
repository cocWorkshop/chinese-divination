'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/components/LanguageContext'
import { catchAndReport } from '@/lib/errorReporter'
import { T } from '@/lib/i18n'

interface Notification {
  id: string
  title: string
  titleEn: string
  content: string
  contentEn: string
  type: string
  createdAt: string
  read: boolean
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string; labelEn: string }> = {
  info:    { icon: '\u{1F4E2}', color: 'rgba(59, 130, 246, 0.2)',  label: '公告', labelEn: 'Info' },
  warning: { icon: '\u26A0\uFE0F', color: 'rgba(234, 179, 8, 0.2)',   label: '警告', labelEn: 'Warning' },
  update:  { icon: '\u{1F195}', color: 'rgba(34, 197, 94, 0.2)',  label: '更新', labelEn: 'Update' },
  promo:   { icon: '\u{1F381}', color: 'rgba(212, 168, 83, 0.2)', label: '活動', labelEn: 'Promo' },
}

function formatDate(date: string, lang: string): string {
  return new Date(date).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return

    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort: unread first, then by date
          data.sort((a: Notification, b: Notification) => {
            if (a.read !== b.read) return a.read ? 1 : -1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
          setNotifications(data)
        }
      })
      .catch(catchAndReport('/api/notifications'))
      .finally(() => setLoading(false))
  }, [status, router])

  const handleExpand = async (id: string) => {
    const isOpening = expandedId !== id
    setExpandedId(isOpening ? id : null)

    if (isOpening) {
      const n = notifications.find(x => x.id === id)
      if (n && !n.read) {
        fetch(`/api/notifications/${id}/read`, { method: 'POST' })
          .then(() => {
            setNotifications(prev =>
              prev.map(x => x.id === id ? { ...x, read: true } : x)
            )
          })
          .catch(catchAndReport('/api/notifications/read'))
      }
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-navy-950 pt-24 flex items-center justify-center">
        <div className="animate-pulse text-gold">
          {T(lang, '載入中...', 'Loading...')}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif text-gold mb-6">
          {T(lang, '通知中心', 'Notification Center')}
        </h1>

        {notifications.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-gold)' }}
          >
            <div className="text-4xl mb-3">{'\u{1F514}'}</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {T(lang, '暫無通知', 'No notifications yet')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
              const isExpanded = expandedId === n.id

              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className="rounded-xl overflow-hidden transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/60"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: `1px solid ${n.read ? 'var(--border-color)' : 'var(--border-gold)'}`,
                  }}
                  onClick={() => handleExpand(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleExpand(n.id)
                    }
                  }}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: config.color, color: 'var(--text-primary)' }}
                        >
                          {lang === 'en' ? config.labelEn : config.label}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                        )}
                      </div>
                      <h3
                        className="text-sm font-medium mt-1"
                        style={{ color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                      >
                        {lang === 'en' ? n.titleEn : n.title}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted, var(--text-secondary))' }}>
                        {formatDate(n.createdAt, lang)}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--text-secondary)' }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-1 ml-10 text-sm whitespace-pre-wrap"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {lang === 'en' ? n.contentEn : n.content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
