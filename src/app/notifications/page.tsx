'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { catchAndReport } from '@/lib/errorReporter'
import { T } from '@/lib/i18n'
import BackButton from '@/components/BackButton'
import MysticalLoader from '@/components/MysticalLoader'
import { NoticeIcon, AlertIcon, SparkleIcon, GiftVesselIcon, DivinationIcon } from '@/components/DivinationIcons'

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

const TYPE_CONFIG: Record<string, { icon: (cls: string) => React.ReactNode; color: string; label: string; labelEn: string }> = {
  info:    { icon: (cls) => <NoticeIcon className={cls} />, color: 'rgba(59, 130, 246, 0.2)',  label: '公告', labelEn: 'Info' },
  warning: { icon: (cls) => <AlertIcon className={cls} />, color: 'rgba(234, 179, 8, 0.2)',   label: '警告', labelEn: 'Warning' },
  update:  { icon: (cls) => <SparkleIcon className={cls} />, color: 'rgba(34, 197, 94, 0.2)',  label: '更新', labelEn: 'Update' },
  promo:   { icon: (cls) => <GiftVesselIcon className={cls} />, color: 'rgba(212, 168, 83, 0.2)', label: '活動', labelEn: 'Promo' },
}

function formatDate(date: string, lang: string): string {
  return new Date(date).toLocaleDateString(T(lang, 'zh-TW', 'en-US'), {
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
      <div className="flex-1 bg-background pt-24 flex items-center justify-center">
        <MysticalLoader lang={lang} />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-background pt-20 sm:pt-24 pb-20 sm:pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(212,168,83,0.16)]">
          <div className="flex items-center gap-3">
            <BackButton fallbackHref="/dashboard" />
            <nav className="flex items-center gap-1.5 text-xs text-foreground/50 font-serif" aria-label="Breadcrumb">
              <Link href="/divination" className="hover:text-gold transition-colors">
                {T(lang, '占卜大廳', 'Divination')}
              </Link>
              <span>/</span>
              <Link href="/dashboard" className="hover:text-gold transition-colors">
                {T(lang, '履歷', 'History')}
              </Link>
              <span>/</span>
              <span className="text-gold">{T(lang, '通知中心', 'Notifications')}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/divination"
              className="px-3.5 py-1.5 rounded-full text-xs font-serif flex items-center gap-1.5 transition-all border border-gold/25 hover:border-gold/50 text-foreground/70 hover:text-gold bg-gold/5 min-h-[36px]"
            >
              <DivinationIcon type="bazi" size={14} color="currentColor" />
              <span>{T(lang, '前往占卜', 'Divination')}</span>
            </Link>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-serif text-gold">
            {T(lang, '通知中心', 'Notification Center')}
          </h1>
          <p className="text-xs text-foreground/50 font-serif">
            {T(lang, '接收最新天機公告、靈修禮券與系統動態', 'Receive news, promo bonuses, and updates')}
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="oriental-sanctuary-card rounded-2xl p-8 text-center shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-3 text-gold">
              <NoticeIcon className="w-7 h-7" />
            </div>
            <p style={{ color: 'var(--text-secondary)' }} className="font-serif text-sm">
              {T(lang, '暫無通知', 'No notifications yet')}
            </p>
            <div className="mt-4">
              <Link
                href="/divination"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-serif text-gold border border-gold/30 bg-gold/5 hover:bg-gold/15 transition-colors"
              >
                <span>{T(lang, '前往易學占卜大廳 →', 'Go to Divination →')}</span>
              </Link>
            </div>
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
                  className="oriental-sanctuary-card rounded-xl overflow-hidden transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 shadow-sm"
                  style={{
                    border: `1px solid ${n.read ? 'rgba(212,168,83,0.16)' : 'rgba(212,168,83,0.45)'}`,
                  }}
                  onClick={() => handleExpand(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleExpand(n.id)
                    }
                  }}
                >
                  <div className="px-4 py-3.5 flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5">{config.icon('w-5 h-5')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: config.color, color: 'var(--text-primary)' }}
                        >
                          {T(lang, config.label, config.labelEn)}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                        )}
                      </div>
                      <h3
                        className="text-sm font-medium mt-1 font-serif"
                        style={{ color: n.read ? 'var(--text-secondary)' : 'var(--gold-light, #e8c278)' }}
                      >
                        {T(lang, n.title, n.titleEn)}
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
                      className="px-4 pb-4 pt-1 ml-10 text-sm whitespace-pre-wrap font-serif leading-relaxed border-t border-[rgba(212,168,83,0.1)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {T(lang, n.content, n.contentEn)}
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
