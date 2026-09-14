'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface HelpTooltipProps {
  content: ReactNode
  title?: string
  className?: string
  align?: 'left' | 'center' | 'right'
}

export default function HelpTooltip({
  content,
  title,
  className = '',
  align = 'center',
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  const alignmentClass =
    align === 'left'
      ? 'left-0 sm:left-auto'
      : align === 'right'
      ? 'right-0 sm:right-auto'
      : 'left-1/2 -translate-x-1/2'

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="w-4 h-4 rounded-full border border-gold/40 text-gold/80 hover:text-gold hover:border-gold text-[10px] inline-flex items-center justify-center transition-all bg-navy-900/60 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-gold/50"
        aria-label={title || 'Help info'}
        title={typeof content === 'string' ? content : undefined}
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 bottom-full mb-2 ${alignmentClass} w-64 sm:w-72 p-3 rounded-xl bg-navy-900/95 border border-gold/35 shadow-xl backdrop-blur-md text-xs text-left leading-relaxed text-white/80 pointer-events-auto`}
          >
            {title && (
              <p className="font-serif font-medium text-gold text-xs mb-1 border-b border-gold/20 pb-1">
                {title}
              </p>
            )}
            <div className="text-[11px] text-white/80 leading-normal">{content}</div>
            <div className="mt-1.5 pt-1 text-[9px] text-gold/60 text-right">
              點擊任意處關閉
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
