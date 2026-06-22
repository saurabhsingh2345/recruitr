'use client'

import type { LucideIcon } from 'lucide-react'

interface VoiceOrbProps {
  level: number
  speaking: boolean
  label: string
  sublabel: string
  icon: LucideIcon
  accent: 'teal' | 'indigo'
}

const ACCENTS = {
  teal: {
    core: 'from-[#2DE2C5] to-[#3FC5F0]',
    glow: '0, 212, 170',
    ring: 'border-[#2DE2C5]/40',
    text: 'text-[#2DE2C5]',
    bars: 'bg-[#2DE2C5]',
  },
  indigo: {
    core: 'from-violet-400 to-indigo-600',
    glow: '139, 92, 246',
    ring: 'border-violet-400/40',
    text: 'text-violet-300',
    bars: 'bg-violet-400',
  },
} as const

export function VoiceOrb({ level, speaking, label, sublabel, icon: Icon, accent }: VoiceOrbProps) {
  const a = ACCENTS[accent]
  const clamped = Math.min(1, Math.max(0, level))
  const scale = 1 + clamped * 0.35
  const glowSize = 12 + clamped * 80

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid h-44 w-44 place-items-center">
        {/* Outer reactive ring */}
        <div
          className={`absolute inset-0 rounded-full border transition-opacity duration-150 ${a.ring}`}
          style={{
            transform: `scale(${1 + clamped * 0.22})`,
            opacity: 0.25 + clamped * 0.5,
          }}
        />
        {/* Secondary ring */}
        <div
          className={`absolute h-36 w-36 rounded-full border ${a.ring}`}
          style={{
            transform: `scale(${1 + clamped * 0.14})`,
            opacity: 0.35 + clamped * 0.4,
          }}
        />
        {/* Core orb */}
        <div
          className={`relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br text-white transition-transform duration-100 ${a.core}`}
          style={{
            transform: `scale(${scale})`,
            boxShadow: `0 0 ${glowSize}px rgba(${a.glow}, ${0.3 + clamped * 0.5})`,
          }}
        >
          <Icon className="w-10 h-10" strokeWidth={1.75} />
        </div>
      </div>

      {/* Equalizer bars */}
      <div className="flex h-5 items-end gap-1">
        {[0.55, 0.8, 1, 0.65, 0.4].map((weight, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-full transition-all duration-100 ${a.bars}`}
            style={{
              height: `${Math.max(3, clamped * weight * 20)}px`,
              opacity: speaking ? 1 : 0.2,
            }}
          />
        ))}
      </div>

      <div className="text-center">
        <p className={`text-sm font-semibold ${speaking ? a.text : 'text-[#F8F9FA]'}`}>{label}</p>
        <p className="text-xs text-[#AEB5E0]">{speaking ? 'Speaking…' : sublabel}</p>
      </div>
    </div>
  )
}
