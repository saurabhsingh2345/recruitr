'use client'

import { useEffect, useRef } from 'react'

interface ConstellationFieldProps {
  /** number of drifting nodes — scaled down automatically on small screens */
  density?: number
  /** max distance (px) at which two nodes are linked by an edge */
  linkDistance?: number
  /** overall opacity of the field */
  opacity?: number
  /** whether nodes drift toward the cursor */
  interactive?: boolean
  className?: string
}

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: 'teal' | 'violet' | 'cyan' | 'star'
}

const COLORS: Record<Node['hue'], string> = {
  teal: '45,226,197',
  violet: '139,124,248',
  cyan: '63,197,240',
  star: '201,210,255',
}

/**
 * Animated proof-network backdrop: drifting glowing nodes connected by
 * faint edges that brighten as they near each other or the cursor.
 * Purely decorative — render it absolutely positioned behind content.
 */
export function ConstellationField({
  density = 56,
  linkDistance = 140,
  opacity = 0.55,
  interactive = true,
  className = '',
}: ConstellationFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const c2d = el.getContext('2d')
    if (!c2d) return
    // non-null typed aliases so closures below keep the narrowing
    const canvas: HTMLCanvasElement = el
    const ctx: CanvasRenderingContext2D = c2d

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let nodes: Node[] = []
    const mouse = { x: -9999, y: -9999 }
    let raf = 0

    const hues: Node['hue'][] = ['teal', 'violet', 'cyan', 'star', 'star']

    function build() {
      const parent = canvas.parentElement
      width = parent?.clientWidth ?? window.innerWidth
      height = parent?.clientHeight ?? window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.max(
        12,
        Math.round((density * Math.min(width, 1600)) / 1200)
      )
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.8,
        hue: hues[Math.floor(Math.random() * hues.length)],
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < linkDistance) {
            const alpha = (1 - dist / linkDistance) * 0.5 * opacity
            ctx.strokeStyle = `rgba(76,91,212,${alpha})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const rgb = COLORS[n.hue]
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb},${0.9 * opacity})`
        ctx.shadowColor = `rgba(${rgb},${0.8 * opacity})`
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    function step() {
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy

        if (interactive) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const d = Math.hypot(dx, dy)
          if (d < 160 && d > 0.1) {
            n.x += (dx / d) * 0.18
            n.y += (dy / d) * 0.18
          }
        }

        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1
        n.x = Math.max(0, Math.min(width, n.x))
        n.y = Math.max(0, Math.min(height, n.y))
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    function onMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    function onLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }

    build()
    draw()
    if (!prefersReduced) raf = requestAnimationFrame(step)

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    if (interactive) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseout', onLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
    }
  }, [density, linkDistance, opacity, interactive])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}

export default ConstellationField
