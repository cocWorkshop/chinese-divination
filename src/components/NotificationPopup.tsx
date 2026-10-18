'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useLang } from './LanguageContext'
import toast from 'react-hot-toast'
import { catchAndReport } from '@/lib/errorReporter'
import { T } from '@/lib/i18n'

const TYPE_ICONS: Record<string, string> = {
  info: '\u{1F4E2}',
  warning: '\u26A0\uFE0F',
  update: '\u{1F195}',
  promo: '\u{1F381}',
}

interface NotificationItem {
  id: string
  title: string
  titleEn: string
  content: string
  contentEn: string
  type: string
  read: boolean
}

export default function NotificationPopup() {
  const { data: session } = useSession()
  const { lang } = useLang()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!session || shown) return

    const key = `notif_popup_${session.user?.id}`
    const last = sessionStorage.getItem(key)
    if (last) return

    fetch('/api/notifications')
      .then(r => r.json())
      .then((data: NotificationItem[]) => {
        if (!Array.isArray(data)) return
        const unread = data.find(n => !n.read)
        if (!unread) return

        setShown(true)
        sessionStorage.setItem(key, Date.now().toString())

        const icon = TYPE_ICONS[unread.type] || TYPE_ICONS.info
        const title = T(lang, unread.title, unread.titleEn)
        const content = T(lang, unread.content, unread.contentEn)
        const preview = content.length > 80 ? content.slice(0, 80) + '...' : content

        toast(
          (t) => (
            <div
              className="cursor-pointer max-w-sm"
              onClick={() => {
                toast.dismiss(t.id)
                fetch(`/api/notifications/${unread.id}/read`, { method: 'POST' })
                  .catch(catchAndReport('/api/notifications/read'))
                window.location.href = '/notifications'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{icon}</span>
                <span className="font-medium text-sm">{title}</span>
              </div>
              <div className="text-xs opacity-80">{preview}</div>
              <div className="text-xs mt-1 opacity-60">
                {T(lang, '點擊查看', 'Click to view')}
              </div>
            </div>
          ),
          {
            duration: 8000,
            style: {
              background: 'var(--bg-surface, #111d35)',
              color: 'var(--text-primary, #e8c278)',
              border: '1px solid var(--border-gold, rgba(212, 168, 83, 0.3))',
              maxWidth: '360px',
            },
          }
        )
      })
      .catch(catchAndReport('/api/notifications', 'popup check'))
  }, [session, shown, lang])

  return null
}
