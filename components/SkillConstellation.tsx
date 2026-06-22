'use client'

import { useId } from 'react'

export interface ConstellationSkill {
  name: string
  proofScore: number
  evidence?: string[]
}

interface SkillConstellationProps {
  skills: ConstellationSkill[]
  /** label shown in the central node (e.g. initials or role) */
  centerLabel?: string
  /** avatar url for the central node */
  avatarUrl?: string
  /** square render size in px */
  size?: number
  className?: string
}

function scoreColor(score: number) {
  if (score >= 80) return '#2DE2C5'
  if (score >= 60) return '#3FC5F0'
  if (score >= 40) return '#8B7CF8'
  return '#888FC0'
}

/**
 * Renders a candidate's verified skills as a glowing constellation:
 * a central identity node with skill nodes orbiting it, each linked by a
 * gradient edge, plus faint cross-links and evidence micro-dots. The whole
 * thing is the product's signature "proof network" visual.
 */
export function SkillConstellation({
  skills,
  centerLabel = 'YOU',
  avatarUrl,
  size = 360,
  className = '',
}: SkillConstellationProps) {
  const uid = useId().replace(/:/g, '')
  const cx = size / 2
  const cy = size / 2
  const top = skills.slice(0, 8)
  const n = Math.max(top.length, 1)
  // Round to 4dp so server and client produce identical attribute strings
  const r4 = (v: number) => +v.toFixed(4)

  const nodes = top.map((s, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const base = size * 0.34
    const radius = base - (s.proofScore / 100) * (size * 0.06) + (i % 2 === 0 ? size * 0.02 : 0)
    return {
      ...s,
      x: r4(cx + Math.cos(angle) * radius),
      y: r4(cy + Math.sin(angle) * radius),
      color: scoreColor(s.proofScore),
      r: r4(5 + (s.proofScore / 100) * 7),
    }
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      className={className}
      style={{ maxWidth: size, maxHeight: size }}
      role="img"
      aria-label="Verified skill constellation"
    >
      <defs>
        <radialGradient id={`core-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2DE2C5" />
          <stop offset="100%" stopColor="#0a8f78" />
        </radialGradient>
        <linearGradient id={`edge-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DE2C5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4C5BD4" stopOpacity="0.12" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* faint orbit rings */}
      {[0.22, 0.3, 0.38].map((f) => (
        <circle
          key={f}
          cx={cx}
          cy={cy}
          r={size * f}
          fill="none"
          stroke="rgba(124,140,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* cross-links between adjacent skills for the network feel */}
      {nodes.map((a, i) => {
        const b = nodes[(i + 1) % nodes.length]
        if (nodes.length < 3) return null
        return (
          <line
            key={`x-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="rgba(76,91,212,0.18)"
            strokeWidth="1"
            className="edge-draw"
          />
        )
      })}

      {/* edges from core to each skill */}
      {nodes.map((node, i) => (
        <line
          key={`e-${i}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke={`url(#edge-${uid})`}
          strokeWidth="1.4"
          className="edge-draw"
        />
      ))}

      {/* evidence micro-dots near each skill */}
      {nodes.map((node, i) =>
        (node.evidence ?? []).slice(0, 3).map((_, j) => {
          const a = (j / 3) * Math.PI * 2 + i
          const rr = node.r + 9
          return (
            <circle
              key={`ev-${i}-${j}`}
              cx={r4(node.x + Math.cos(a) * rr)}
              cy={r4(node.y + Math.sin(a) * rr)}
              r="1.6"
              fill="#C9D2FF"
              opacity="0.6"
            />
          )
        })
      )}

      {/* skill nodes */}
      {nodes.map((node, i) => (
        <g key={`n-${i}`} filter={`url(#glow-${uid})`}>
          <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} />
          <circle cx={node.x} cy={node.y} r={node.r + 3} fill="none" stroke={node.color} strokeOpacity="0.3" strokeWidth="1" />
        </g>
      ))}

      {/* skill labels */}
      {nodes.map((node, i) => {
        const right = node.x >= cx
        return (
          <text
            key={`t-${i}`}
            x={node.x + (right ? node.r + 7 : -(node.r + 7))}
            y={node.y + 3}
            textAnchor={right ? 'start' : 'end'}
            fontSize="10"
            fontFamily="var(--font-geist-mono), monospace"
            fill="#ECF0FF"
          >
            {node.name}
            <tspan fill={node.color} dx="4" fontWeight="700">
              {node.proofScore}
            </tspan>
          </text>
        )
      })}

      {/* central identity node */}
      <g filter={`url(#glow-${uid})`}>
        <circle cx={cx} cy={cy} r="22" fill={`url(#core-${uid})`} />
        <circle cx={cx} cy={cy} r="28" fill="none" stroke="#2DE2C5" strokeOpacity="0.35" strokeWidth="1.5" className="orbit-spin" strokeDasharray="3 6" />
      </g>
      {avatarUrl ? (
        <>
          <clipPath id={`clip-${uid}`}>
            <circle cx={cx} cy={cy} r="20" />
          </clipPath>
          <image
            href={avatarUrl}
            x={cx - 20}
            y={cy - 20}
            width="40"
            height="40"
            clipPath={`url(#clip-${uid})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          fill="#05060F"
          fontFamily="var(--font-geist-sans), sans-serif"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  )
}

export default SkillConstellation
