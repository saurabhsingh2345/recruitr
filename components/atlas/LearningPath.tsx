'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

interface Resource {
  name: string
  type: 'book' | 'course' | 'practice' | 'docs'
  free: boolean
}

interface Phase {
  title: string
  weeks: number
  goals: string[]
  resources: Resource[]
}

interface LearningPathData {
  summary: string
  currentLevel: string
  targetLevel: string
  estimatedWeeks: number | null
  phases: Phase[]
}

interface LearningPathProps {
  skill: string
  goal?: string
}

const typeColor: Record<string, string> = {
  book: '#f59e0b',
  course: '#2DE2C5',
  practice: '#A78BFA',
  docs: '#22D3EE',
}

export function LearningPath({ skill, goal }: LearningPathProps) {
  const [data, setData] = useState<LearningPathData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0)

  useEffect(() => {
    if (!skill) return
    setLoading(true)
    setData(null)
    const url = `/api/atlas/learning-path/${encodeURIComponent(skill)}${goal ? `?goal=${encodeURIComponent(goal)}` : ''}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d.learningPath || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [skill, goal])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#888FC0] py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Building learning path…
      </div>
    )
  }

  if (!data) return <p className="text-xs text-[#888FC0]">No plan generated yet.</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-[#A78BFA]" />
        <span className="text-[10px] text-[#888FC0] uppercase tracking-widest font-semibold">
          Learning path · {skill}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#AEB5E0] leading-relaxed">{data.summary}</p>

      {/* Level + duration row */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="text-[9px] uppercase tracking-widest text-[#555B8A] mb-1">Current</div>
          <div className="text-sm font-bold text-white">{data.currentLevel}</div>
        </div>
        <div className="flex items-center text-[#555B8A]">→</div>
        <div className="flex-1 p-3 rounded-xl bg-[#A78BFA]/[0.06] border border-[#A78BFA]/20 text-center">
          <div className="text-[9px] uppercase tracking-widest text-[#A78BFA] mb-1">Target</div>
          <div className="text-sm font-bold text-white">{data.targetLevel}</div>
        </div>
        {data.estimatedWeeks && (
          <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="text-[9px] uppercase tracking-widest text-[#555B8A] mb-1">Est.</div>
            <div className="text-sm font-bold text-white">{data.estimatedWeeks}w</div>
          </div>
        )}
      </div>

      {/* Phases */}
      {data.phases.map((phase, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] overflow-hidden">
          <button
            onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div>
              <span className="text-xs font-semibold text-white">{phase.title}</span>
              <span className="text-[10px] text-[#555B8A] ml-2">· {phase.weeks}w</span>
            </div>
            {expandedPhase === i ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#555B8A]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#555B8A]" />
            )}
          </button>

          {expandedPhase === i && (
            <div className="border-t border-white/[0.04] p-3 space-y-3">
              {/* Goals */}
              {phase.goals?.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-[#555B8A] mb-1.5">Goals</div>
                  <ul className="space-y-1">
                    {phase.goals.map((g, gi) => (
                      <li key={gi} className="text-xs text-[#AEB5E0] flex gap-1.5">
                        <span className="text-[#A78BFA]">·</span>{g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resources */}
              {phase.resources?.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-[#555B8A] mb-1.5">Resources</div>
                  <div className="space-y-1">
                    {phase.resources.map((r, ri) => (
                      <div key={ri} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase"
                            style={{ background: `${typeColor[r.type]}20`, color: typeColor[r.type] }}
                          >
                            {r.type}
                          </span>
                          <span className="text-xs text-[#AEB5E0] truncate">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {r.free && (
                            <span className="text-[8px] text-[#34d399]">free</span>
                          )}
                          <ExternalLink className="w-3 h-3 text-[#555B8A]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
