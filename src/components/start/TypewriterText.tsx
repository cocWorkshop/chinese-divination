'use client'

/**
 * TypewriterText — reveal a string char-by-char with a blinking cursor.
 *
 * Used for the funnel's hero hook line and section headers — echoes the
 * "AI is generating" feel that the streaming reading + master conversation
 * already use, applied at the marketing layer for visual consistency.
 *
 * Deterministic on prop change: typing restarts when `text` or `start` flips.
 */

import { useEffect, useState } from 'react'

interface Props {
  text: string
  /** Milliseconds per character. Default 70. */
  speed?: number
  /** Delay before typing begins, in ms. Default 0. */
  startDelay?: number
  /** Show a blinking cursor at the end. Default true. */
  cursor?: boolean
  /** Class names applied to the wrapping span. */
  className?: string
  /** Inline style for the wrapping span. */
  style?: React.CSSProperties
  /** Fired once typing completes (for chained reveals). */
  onDone?: () => void
}

export default function TypewriterText({
  text,
  speed = 70,
  startDelay = 0,
  cursor = true,
  className,
  style,
  onDone,
}: Props) {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setShown('')
    setDone(false)
    let cancelled = false
    let i = 0
    const tick = () => {
      if (cancelled) return
      if (i >= text.length) {
        setDone(true)
        onDone?.()
        return
      }
      i++
      setShown(text.slice(0, i))
      setTimeout(tick, speed)
    }
    const startId = setTimeout(tick, startDelay)
    return () => {
      cancelled = true
      clearTimeout(startId)
    }
  }, [text, speed, startDelay, onDone])

  return (
    <span className={className} style={style}>
      {shown}
      {cursor && (
        <span
          aria-hidden
          className="inline-block ml-[2px] align-baseline"
          style={{
            width: '0.55ch',
            // Render an under-baseline bar that blinks; matches a terminal cursor
            // more than a vertical line, fits the "console-like" aesthetic.
            borderBottom: '2px solid currentColor',
            opacity: done ? 0.5 : 1,
            animation: done
              ? 'xjCursorBlink 1s step-end infinite'
              : 'none',
          }}
        >
          &nbsp;
        </span>
      )}
      <style>{`
        @keyframes xjCursorBlink {
          0%, 60% { opacity: 1; }
          61%, 100% { opacity: 0; }
        }
      `}</style>
    </span>
  )
}
