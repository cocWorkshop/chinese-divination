'use client'

import { useEffect, useRef } from 'react'

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Respect prefers-reduced-motion — render static stars instead of animating
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Fewer stars on mobile for performance
    const isMobile = window.innerWidth < 640
    const count = isMobile ? 80 : 200

    const stars: { x: number; y: number; r: number; a: number; da: number }[] = []
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.2,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.01,
      })
    }

    // Static render for reduced-motion preference
    if (prefersReduced) {
      stars.forEach((s) => {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 168, 83, ${s.a})`
        ctx.fill()
      })
      return
    }

    let animId: number
    let paused = false

    const draw = () => {
      if (paused) { animId = requestAnimationFrame(draw); return }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach((s) => {
        s.a += s.da
        if (s.a <= 0 || s.a >= 1) s.da = -s.da
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212, 168, 83, ${s.a})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    // Pause when tab is not visible to save CPU/battery
    const onVisibility = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
