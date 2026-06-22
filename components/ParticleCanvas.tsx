'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface Particle {
  x: number
  y: number
  r: number
  dx: number
  dy: number
  opacity: number
  phase: number
  speed: number
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dark = resolvedTheme !== 'light'
    let w = 0, h = 0, animId = 0
    const dpr = window.devicePixelRatio || 1

    function resize() {
      w = window.innerWidth
      h = window.innerHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = w + 'px'
      canvas!.style.height = h + 'px'
      ctx!.scale(dpr, dpr)
    }
    resize()

    const count = dark ? 130 : 22
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: dark
        ? Math.random() * 1.1 + 0.2
        : Math.random() * 9 + 4,
      dx: dark
        ? (Math.random() - 0.5) * 0.06
        : (Math.random() - 0.5) * 0.12,
      dy: dark
        ? (Math.random() - 0.5) * 0.04
        : -(Math.random() * 0.18 + 0.04),
      opacity: dark
        ? Math.random() * 0.55 + 0.15
        : Math.random() * 0.09 + 0.03,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.008 + 0.003,
    }))

    function draw() {
      ctx!.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.dx
        p.y += p.dy
        p.phase += p.speed

        if (p.x < -p.r * 3) p.x = w + p.r
        if (p.x > w + p.r * 3) p.x = -p.r
        if (p.y > h + p.r * 3) p.y = -p.r
        if (p.y < -p.r * 3) p.y = h + p.r

        const twinkle = 0.55 + 0.45 * Math.sin(p.phase)
        const alpha = p.opacity * twinkle

        if (dark) {
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          // alternating between cool-white and faint teal/violet tones
          const hue = (p.phase * 30) % 360
          if (hue < 120) {
            ctx!.fillStyle = `rgba(210, 225, 255, ${alpha})`
          } else if (hue < 240) {
            ctx!.fillStyle = `rgba(45, 226, 197, ${alpha * 0.6})`
          } else {
            ctx!.fillStyle = `rgba(139, 124, 248, ${alpha * 0.5})`
          }
          ctx!.fill()
        } else {
          // light mode: soft blue bubble with radial gradient
          const grad = ctx!.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r)
          grad.addColorStop(0, `rgba(100, 149, 237, ${alpha * 1.4})`)
          grad.addColorStop(0.5, `rgba(120, 170, 255, ${alpha * 0.9})`)
          grad.addColorStop(1, `rgba(140, 180, 255, 0)`)
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx!.fillStyle = grad
          ctx!.fill()
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      cancelAnimationFrame(animId)
      resize()
      draw()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
