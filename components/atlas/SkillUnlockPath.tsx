'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { getScoreColor } from '@/lib/scoring'

interface UnlockPath {
  skill: string
  currentScore: number
  targetScore: number
  unlockCount: number
  sessionCount: number
  recommendedFormat: string
}

interface SkillUnlockPathProps {
  onStartSession: (skill: string, format: string) => void
}

export function SkillUnlockPath({ onStartSession }: SkillUnlockPathProps) {
  const [paths, setPaths] = useState<UnlockPath[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/atlas/unlock-path')
      .then((r) => r.json())
      .then((d) => setPaths(d.unlockPaths || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#888FC0] py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating unlock paths…
      </div>
    )
  }

  if (paths.length === 0) return null

  const visible = showAll ? paths : paths.slice(0, 5)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
        <span className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold">
          Skill unlock path
        </span>
      </div>

      {visible.map((path) => {
        const color = getScoreColor(path.currentScore)
        const targetColor = getScoreColor(path.targetScore)
        const progressPct = Math.min(100, (path.currentScore / path.targetScore) * 100)

        return (
          <motion.div
            key={path.skill}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium capitalize">{path.skill}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#2DE2C5]/10 text-[#2DE2C5] border border-[#2DE2C5]/20">
                +{path.unlockCount} match{path.unlockCount !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: color }}
              />
              <div
                className="absolute top-0 h-full w-0.5 opacity-40"
                style={{ left: `${100}%`, backgroundColor: targetColor }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[10px] text-[#AEB5E0]">
                <span style={{ color }}>{path.currentScore}</span>
                <span className="text-[#888FC0]"> → </span>
                <span style={{ color: targetColor }}>{path.targetScore}</span>
                <span className="text-[#888FC0]"> · ~{path.sessionCount} session{path.sessionCount !== 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => onStartSession(path.skill, path.recommendedFormat)}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#2DE2C5] hover:text-[#5BF0D8] transition-colors"
              >
                Start <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )
      })}

      {paths.length > 5 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 text-xs text-[#888FC0] hover:text-white py-1 transition-colors"
        >
          {showAll ? (
            <><ChevronUp className="w-3 h-3" />Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" />+{paths.length - 5} more skills</>
          )}
        </button>
      )}
    </div>
  )
}
