'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  baseAlpha: number
  alphaAmp: number
  phase: number
  speed: number
  vx: number
  vy: number
  colorRgb: string
  hasGlow: boolean
}

interface Meteor {
  x: number
  y: number
  length: number
  speed: number
  angle: number
  alpha: number
  active: boolean
  decay: number
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const isMobile = width < 640
    const starCount = isMobile ? 65 : 130

    // Palette: 70% warm oriental gold, 30% celestial pearl white
    const goldPalette = ['212, 168, 83', '232, 194, 120', '195, 145, 60']
    const pearlPalette = ['230, 238, 250', '245, 240, 230']

    const stars: Star[] = []
    for (let i = 0; i < starCount; i++) {
      const isPearl = Math.random() < 0.3
      const colorRgb = isPearl
        ? pearlPalette[Math.floor(Math.random() * pearlPalette.length)]
        : goldPalette[Math.floor(Math.random() * goldPalette.length)]

      const r = Math.random() < 0.12 ? Math.random() * 0.9 + 1.4 : Math.random() * 0.9 + 0.5
      const baseAlpha = Math.random() * 0.35 + 0.2
      const alphaAmp = Math.random() * 0.25 + 0.15

      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r,
        baseAlpha,
        alphaAmp,
        phase: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.0018 + 0.0012) * (Math.random() < 0.5 ? 1 : -1),
        // Gentle upward/sideway drift
        vx: (Math.random() - 0.5) * 0.04,
        vy: -(Math.random() * 0.08 + 0.03),
        colorRgb,
        hasGlow: r > 1.6,
      })
    }

    // Occasional subtle shooting star
    let meteor: Meteor = {
      x: 0,
      y: 0,
      length: 0,
      speed: 0,
      angle: 0,
      alpha: 0,
      active: false,
      decay: 0.02,
    }

    let nextMeteorTime = performance.now() + Math.random() * 8000 + 5000

    function spawnMeteor(time: number) {
      const angle = (Math.PI / 180) * (Math.random() * 15 + 35) // 35 - 50 deg down-right
      meteor = {
        x: Math.random() * width * 0.7,
        y: Math.random() * height * 0.35,
        length: Math.random() * 40 + 50,
        speed: Math.random() * 4 + 7,
        angle,
        alpha: 0.75,
        active: true,
        decay: Math.random() * 0.012 + 0.014,
      }
      nextMeteorTime = time + Math.random() * 12000 + 9000 // next in 9-21s
    }

    // If reduced motion is requested, render one quiet static frame
    if (prefersReduced) {
      stars.forEach((s) => {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.colorRgb}, ${s.baseAlpha})`
        ctx.fill()
      })
      return
    }

    let animId: number
    let paused = false

    // Theme awareness: pause in light mode
    let isDark = document.documentElement.classList.contains('dark')
    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark')
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const render = (timestamp: number) => {
      if (paused || !isDark) {
        animId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      // 1. Render starry sky with gentle twinkle and cosmic drift
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]

        // Update positions with slow drift
        s.x += s.vx
        s.y += s.vy

        // Wrap around screen boundaries
        if (s.y < -5) s.y = height + 5
        if (s.x < -5) s.x = width + 5
        else if (s.x > width + 5) s.x = -5

        // Smooth harmonic twinkle
        const alpha = Math.max(
          0.05,
          Math.min(0.95, s.baseAlpha + s.alphaAmp * Math.sin(timestamp * s.speed + s.phase))
        )

        // Soft outer aura for brighter landmark stars
        if (s.hasGlow) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 2.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${s.colorRgb}, ${alpha * 0.22})`
          ctx.fill()
        }

        // Star core
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.colorRgb}, ${alpha})`
        ctx.fill()
      }

      // 2. Render occasional subtle shooting star
      if (!meteor.active && timestamp > nextMeteorTime) {
        spawnMeteor(timestamp)
      }

      if (meteor.active) {
        meteor.x += Math.cos(meteor.angle) * meteor.speed
        meteor.y += Math.sin(meteor.angle) * meteor.speed
        meteor.alpha -= meteor.decay

        if (meteor.alpha <= 0 || meteor.x > width || meteor.y > height) {
          meteor.active = false
        } else {
          const tailX = meteor.x - Math.cos(meteor.angle) * meteor.length
          const tailY = meteor.y - Math.sin(meteor.angle) * meteor.length

          const grad = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y)
          grad.addColorStop(0, 'rgba(212, 168, 83, 0)')
          grad.addColorStop(0.7, `rgba(212, 168, 83, ${meteor.alpha * 0.4})`)
          grad.addColorStop(1, `rgba(255, 248, 220, ${meteor.alpha})`)

          ctx.save()
          ctx.beginPath()
          ctx.moveTo(tailX, tailY)
          ctx.lineTo(meteor.x, meteor.y)
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.2
          ctx.lineCap = 'round'
          ctx.stroke()
          ctx.restore()
        }
      }

      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    // Visibility management
    const onVisibility = () => {
      paused = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="xj-stars absolute inset-0 pointer-events-none w-full h-full"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
