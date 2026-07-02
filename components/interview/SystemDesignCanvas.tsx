'use client'

import { useCallback, useRef } from 'react'

interface SystemDesignCanvasProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Lightweight architecture whiteboard — structured notes sent to the AI interviewer.
 * Avoids heavy canvas deps while giving system design sessions a dedicated workspace.
 */
export function SystemDesignCanvas({ value, onChange }: SystemDesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    ctx.strokeStyle = '#2DE2C5'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }, [])

  const stopDraw = useCallback(() => {
    drawing.current = false
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B] border-l border-[#27272A]">
      <div className="px-3 py-2 border-b border-[#27272A] flex items-center justify-between">
        <span className="text-xs font-medium text-[#AEB5E0]">Architecture notes</span>
        <button type="button" onClick={clearCanvas} className="text-[10px] text-[#71717A] hover:text-white">
          Clear sketch
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Components:\n- API gateway\n- Auth service\n- DB (PostgreSQL)\n\nData flow:\n1. Client → CDN → API\n2. ...\n\nTrade-offs:\n- Why X over Y?`}
        className="flex-1 min-h-[120px] resize-none bg-transparent text-sm text-[#E4E4E7] placeholder:text-[#52525B] p-3 font-mono leading-relaxed focus:outline-none"
      />
      <div className="border-t border-[#27272A] p-2">
        <div className="text-[10px] text-[#71717A] mb-1">Quick sketch (optional)</div>
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full h-[120px] rounded-lg bg-[#05060F] border border-[#27272A] cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
        />
      </div>
    </div>
  )
}
