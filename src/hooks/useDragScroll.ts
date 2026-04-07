import { useRef, useEffect, useCallback } from 'react'

/**
 * Hook that enables mouse-drag horizontal scrolling on a container.
 * Also auto-scrolls to a child element with [data-scroll-target] on mount.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    const startX = e.pageX
    const scrollLeft = el.scrollLeft
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      el.scrollLeft = scrollLeft - (ev.pageX - startX)
    }
    const onUp = () => {
      el.style.cursor = 'grab'
      el.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Auto-scroll to [data-scroll-target] on mount
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = el.querySelector('[data-scroll-target]') as HTMLElement | null
    if (target) {
      const offset = target.offsetLeft - el.offsetWidth / 2 + target.offsetWidth / 2
      el.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' })
    }
  }, [])

  return { ref, onMouseDown }
}
