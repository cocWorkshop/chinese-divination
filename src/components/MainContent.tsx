'use client'

import React from 'react'
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
 * On mobile (< lg), the single-page jump flow is fully preserved with 0 right margin.
 */
export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname()
  const { shape } = useMasterChat()

  const isWorkspace = pathname?.startsWith('/divination') || pathname?.startsWith('/reading')
  const isExpandedDesktop = isWorkspace && shape === 'expanded'

  return (
    <main
      id="main-content"
      className={`pt-16 flex-1 flex flex-col pb-20 transition-all duration-300 ease-out ${
        isExpandedDesktop
          ? 'lg:mr-[440px] xl:mr-[480px] 2xl:mr-[520px]'
          : ''
      }`}
    >
      {children}
    </main>
  )
}
