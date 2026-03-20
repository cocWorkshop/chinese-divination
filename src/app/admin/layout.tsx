'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') {
      fetch('/api/admin/stats')
        .then(r => { if (r.status === 403 || r.status === 401) { router.push('/'); } else { setIsAdmin(true) } })
        .catch(() => router.push('/'))
    }
  }, [status, router])

  if (status === 'loading' || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="text-gold text-2xl animate-pulse">☯</div>
      </div>
    )
  }

  const navItems = [
    { href: '/admin', label: '概覽', enLabel: 'Overview', icon: '📊' },
    { href: '/admin/users', label: '用戶管理', enLabel: 'Users', icon: '👥' },
    { href: '/admin/logs', label: '系統日誌', enLabel: 'System Logs', icon: '📋' },
    { href: '/admin/feedback', label: '用戶反饋', enLabel: 'Feedback', icon: '💬' },
    { href: '/admin/compensation', label: '用戶補償', enLabel: 'Compensation', icon: '🎁' },
    { href: '/admin/settings', label: '系統設置', enLabel: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-navy-900 border-r border-gold/20 flex flex-col">
        <div className="p-6 border-b border-gold/20">
          <div className="text-gold font-serif text-xl">玄機</div>
          <div className="text-white/40 text-xs mt-1">Admin Console</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gold/20">
          <div className="text-white/40 text-xs">{session?.user?.email}</div>
          <Link href="/" className="text-gold/60 text-xs hover:text-gold mt-1 block">← Back to app</Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
