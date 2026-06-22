'use client'

import { useEffect, useState } from 'react'
import { Brain, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Signal {
  skill: string
  topic: string
  severity: 1 | 2 | 3
  count: number
}

interface MemoryData {
  signals: Signal[]
  sessionCount: number
}

const SEVERITY_COLOR: Record<number, string> = {
  1: '#3FC5F0',
  2: '#F0A040',
  3: '#FB7185',
}

const SEVERITY_LABEL: Record<number, string> = {
  1: 'Minor',
  2: 'Recurring',
  3: 'Critical',
}

export function MemoryInsights() {
  const [data, setData] = useState<MemoryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/memory')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2].map(i => (
          <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data || data.signals.length === 0) {
    return (
      <div className="mt-4 flex items-start gap-3 px-4 py-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
        <CheckCircle2 className="w-4 h-4 text-[#2DE2C5] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-white/60">
            {data?.sessionCount === 0
              ? 'Complete your first interview to unlock memory insights.'
              : 'No recurring weaknesses detected across your sessions.'}
          </p>
          {data && data.sessionCount > 0 && (
            <p className="text-xs text-white/30 mt-0.5">{data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''} analysed</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-3.5 h-3.5 text-[#8B7CF8]" />
        <span className="text-xs text-white/40 uppercase tracking-wider">Cross-session memory</span>
        <span className="text-xs text-white/25 ml-auto">{data.sessionCount} sessions</span>
      </div>

      {data.signals.map((sig, i) => {
        const color = SEVERITY_COLOR[sig.severity]
        return (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
          >
            {sig.severity === 3 ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/75 truncate">{sig.topic}</div>
              <div className="text-xs text-white/30">{sig.skill}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-medium" style={{ color }}>
                {SEVERITY_LABEL[sig.severity]}
              </div>
              <div className="text-[10px] text-white/25">{sig.count}×</div>
            </div>
          </div>
        )
      })}

      <p className="text-[11px] text-white/25 pt-1 px-1">
        Focus your next session on these areas to improve your proof scores.
      </p>
    </div>
  )
}
