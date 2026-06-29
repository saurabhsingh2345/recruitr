'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/assessment'
import { buildComparisonMatrix, ratingColor, type CompareInvite } from '@/lib/assessment-compare'

function textOn(bg: string): string {
  return bg === '#1A1A1F' ? '#555' : '#05060F'
}

export function PoolComparison({ invites }: { invites: CompareInvite[] }) {
  const matrix = buildComparisonMatrix(invites)

  if (matrix.rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] p-10 text-center text-sm text-[#888FC0]">
        No scored candidates yet. The comparison view fills in as candidates complete the assessment.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#080A18]">
            <th className="sticky left-0 z-10 bg-[#080A18] text-left px-4 py-3 font-medium text-[#AEB5E0] min-w-[180px]">
              Candidate
            </th>
            <th className="px-3 py-3 text-center font-medium text-[#AEB5E0]">Score</th>
            <th className="px-3 py-3 text-center font-medium text-[#AEB5E0]">%ile</th>
            <th className="px-3 py-3 text-center font-medium text-[#AEB5E0]">Verdict</th>
            {matrix.competencies.map((c) => (
              <th key={c.key} className="px-2 py-3 text-center font-medium text-[#888FC0] whitespace-nowrap text-xs">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.token} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
              <td className="sticky left-0 z-10 bg-[#0a0c1a] px-4 py-3">
                <Link
                  href={`/assess/${row.token}/report`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-white hover:text-[#2DE2C5] transition-colors"
                >
                  {row.name}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </Link>
                {row.integrityLevel === 'flagged' && (
                  <span className="text-[10px] text-[#f43f5e]">integrity flagged</span>
                )}
              </td>
              <td className="px-3 py-3 text-center font-mono font-bold text-white">{row.composite}</td>
              <td className="px-3 py-3 text-center font-mono text-[#AEB5E0]">{row.percentile}</td>
              <td className="px-3 py-3 text-center">
                {row.verdict ? (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      color: VERDICT_COLORS[row.verdict as keyof typeof VERDICT_COLORS],
                      background: `${VERDICT_COLORS[row.verdict as keyof typeof VERDICT_COLORS]}1a`,
                    }}
                  >
                    {VERDICT_LABELS[row.verdict as keyof typeof VERDICT_LABELS] || row.verdict}
                  </span>
                ) : (
                  <span className="text-xs text-[#555]">—</span>
                )}
              </td>
              {matrix.competencies.map((c) => {
                const cell = row.cells[c.key]
                const bg = ratingColor(cell.rating)
                const isWeak = row.relativeWeakness === c.key
                return (
                  <td key={c.key} className="px-1.5 py-2 text-center">
                    <div
                      className="mx-auto w-9 h-8 rounded flex items-center justify-center font-mono text-xs font-bold"
                      style={{
                        background: bg,
                        color: textOn(bg),
                        outline: isWeak ? '1.5px solid #f43f5e' : 'none',
                      }}
                      title={
                        cell.rating != null
                          ? `${c.label}: ${cell.rating.toFixed(1)}/5${isWeak ? ' (weakest vs pool)' : ''}`
                          : 'not assessed'
                      }
                    >
                      {cell.rating != null ? cell.rating.toFixed(1) : '–'}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}

          {/* Pool average row */}
          <tr className="border-t border-white/[0.1] bg-[#080A18]/60">
            <td className="sticky left-0 z-10 bg-[#080A18] px-4 py-3 text-xs uppercase tracking-wide text-[#888FC0]">
              Pool average
            </td>
            <td colSpan={3} />
            {matrix.competencies.map((c) => {
              const v = matrix.poolAverages[c.key]
              return (
                <td key={c.key} className="px-1.5 py-2 text-center font-mono text-xs text-[#AEB5E0]">
                  {v != null ? v.toFixed(1) : '–'}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
