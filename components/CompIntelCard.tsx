'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { formatLpa, type CompBenchmark } from '@/lib/comp-intelligence'

/**
 * Candidate-facing comp insight: "at your proof level, hires land around ₹X".
 * Self-contained — fetches its own benchmark. Renders nothing when there isn't
 * enough verified hire data, so it never shows an empty/misleading state.
 */
export function CompIntelCard({ skill, proofScore }: { skill: string; proofScore: number }) {
  const [data, setData] = useState<(CompBenchmark & { hasEnoughData: boolean }) | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!skill) return
    fetch(`/api/comp-intelligence?skill=${encodeURIComponent(skill)}&proofScore=${proofScore}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [skill, proofScore])

  if (!loaded || !data || !data.hasEnoughData) return null

  const bandsWithData = data.bands.filter((b) => b.medianLpa != null)
  const maxMedian = Math.max(...bandsWithData.map((b) => b.medianLpa || 0), 1)

  return (
    <div className="rounded-xl border border-[#2DE2C5]/15 bg-[#2DE2C5]/[0.03] p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-[#2DE2C5]" />
        <h3 className="text-sm font-semibold text-white">Comp intelligence · {skill}</h3>
      </div>

      {data.predictedLpa != null ? (
        <p className="text-sm text-[#AEB5E0] mb-4">
          At your {skill} proof of <span className="font-mono text-white">{proofScore}</span>, verified hires land around{' '}
          <span className="font-mono font-bold text-[#2DE2C5]">{formatLpa(data.predictedLpa)}</span>.
        </p>
      ) : (
        <p className="text-sm text-[#AEB5E0] mb-4">Verified {skill} hire comp by proof level:</p>
      )}

      <div className="space-y-2">
        {bandsWithData.map((b) => {
          const isYou =
            data.yourBand && b.label === data.yourBand.label
          return (
            <div key={b.label} className="flex items-center gap-3">
              <span className={`w-16 text-xs font-mono ${isYou ? 'text-[#2DE2C5] font-bold' : 'text-[#888FC0]'}`}>
                {b.label}
              </span>
              <div className="flex-1 h-5 bg-white/[0.04] rounded overflow-hidden">
                <div
                  className="h-full rounded flex items-center px-2"
                  style={{
                    width: `${((b.medianLpa || 0) / maxMedian) * 100}%`,
                    background: isYou ? '#2DE2C5' : '#2DE2C540',
                  }}
                >
                  <span className={`text-[10px] font-mono font-bold whitespace-nowrap ${isYou ? 'text-[#05060F]' : 'text-[#AEB5E0]'}`}>
                    {formatLpa(b.medianLpa)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-[#555] mt-3">
        Median of verified Intervue hires · {data.sampleSize} data points
      </p>
    </div>
  )
}
