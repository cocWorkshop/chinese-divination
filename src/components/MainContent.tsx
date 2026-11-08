'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useMasterChat } from '@/components/master/MasterChatContext'

export interface MainContentProps {
  children: React.ReactNode
}

/**
 * MainContent — Responsive layout wrapper for primary page content.
 *
 * Implements Design A (Split-Screen Sanctuary Workspace) for desktop users:
 * When on divination or reading routes (/divination, /divination/[type], /reading/[id])
 * and Master Xuanji is expanded (shape === 'expanded'), the left side smoothly
 * reserves space for the docked right-hand Master panel (transition-all duration-300).
 *
 * In desktop workspace mode:
 * 1. Root window scrolling is locked (via .workspace-docked on html & body),
 *    preventing the browser window scrollbar from appearing at the far right of the
 *    screen and clashing with the docked Master Xuanji chat window.
 * 2. MainContent itself becomes an independent scroll container with height
 *    calc(100vh - 4rem) and custom-scrollbar, so the left oracle's vertical
 *    scrollbar sits cleanly at the dividing border between the left workspace
 *    and the Master dock.
 *
 * On mobile (< lg), the single-page jump flow is fully preserved with 0 right margin.
 */
export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname()
  const { shape } = useMasterChat()

  const isWorkspace = pathname?.startsWith('/divination') || pathname?.startsWith('/reading')
  const isExpandedDesktop = isWorkspace && shape === 'expanded'

  useEffect(() => {
    if (isExpandedDesktop) {
      document.documentElement.classList.add('workspace-docked')
      document.body.classList.add('workspace-docked')
    } else {
      document.documentElement.classList.remove('workspace-docked')
      document.body.classList.remove('workspace-docked')
    }
    return () => {
      document.documentElement.classList.remove('workspace-docked')
      document.body.classList.remove('workspace-docked')
    }
  }, [isExpandedDesktop])

  return (
    <main
      id="main-content"
      className={`pt-16 flex-1 flex flex-col pb-20 transition-all duration-300 ease-out ${
        isExpandedDesktop
          ? 'lg:mr-[440px] xl:mr-[480px] 2xl:mr-[520px] lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:mt-16 lg:pt-0 lg:pb-12 custom-scrollbar'
          : ''
      }`}
    >
      {children}
    </main>
  )
}
