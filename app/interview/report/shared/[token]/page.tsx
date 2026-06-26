'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle2, AlertCircle, BookOpen, TrendingUp,
  Code2, Loader2, Sparkles, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = size * 0.4
  const circ = 2 * Math.PI * r
  const color = getScoreColor(score)
  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.07} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - score / 100) }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  )
}

interface Report {
  format: string
  targetSkill: string
  name: string
  username: string
  avatarUrl: string
  scores: { overall: number; breakdown: Record<string, number> }
  insightReport: {
    strengths: string[]
    gaps: string[]
    studyRecommendations: string[]
  }
  completedAt: string
  scoreUpdate: { skill: string; before: number; after: number; delta: number; isFirstScore: boolean } | null
}

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Session',
  pm_case: 'PM Case Study',
  design_critique: 'Design Critique',
  ops_case: 'Ops / Program Mgmt',
  sales_discovery: 'Sales Discovery',
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/interview/report/shared/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((data) => { if (data) setReport(data) })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.05] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-4 h-4 text-[#05060F]" />
          </div>
          <span className="font-bold tracking-tight text-sm">intervue</span>
        </Link>
        <Link href="/onboarding">
          <Button size="sm" className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold text-xs h-8">
            Build your proof <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#2DE2C5]" />
          </div>
        ) : notFound ? (
          <div className="text-center py-32">
            <AlertCircle className="w-10 h-10 text-[#f43f5e] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link not found</h2>
            <p className="text-[#AEB5E0] text-sm">This report link may have expired or been removed.</p>
          </div>
        ) : report ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Shared by banner */}
            <div className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-4 flex items-center gap-3">
              {report.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.avatarUrl} alt={report.name} className="w-9 h-9 rounded-full border border-white/[0.1]" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2DE2C5] to-[#8B7CF8] flex items-center justify-center text-[#05060F] font-bold">
                  {report.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{report.name || report.username}</p>
                <p className="text-xs text-[#AEB5E0]">Shared this verified interview report from Intervue</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#2DE2C5]/10 border border-[#2DE2C5]/20">
                <Sparkles className="w-3 h-3 text-[#2DE2C5]" />
                <span className="text-[10px] text-[#2DE2C5] font-semibold">Verified</span>
              </div>
            </div>

            {/* Score header */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#080A18] p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-[#AEB5E0] uppercase tracking-wider font-semibold">
                  {FORMAT_LABELS[report.format] || report.format}
                </span>
                <span className="text-[#AEB5E0]">·</span>
                <span className="text-xs text-[#AEB5E0]">{report.targetSkill}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <ScoreRing score={report.scores?.overall || 0} size={120} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold font-mono" style={{ color: getScoreColor(report.scores?.overall || 0) }}>
                      {report.scores?.overall || 0}
                    </span>
                    <span className="text-xs text-[#AEB5E0]">/100</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold mb-1">{report.targetSkill}</h1>
                  <p className="text-sm text-[#AEB5E0] mb-2">
                    <span className="font-semibold" style={{ color: getScoreColor(report.scores?.overall || 0) }}>
                      {getScoreLabel(report.scores?.overall || 0)}
                    </span>
                    {' '}· Verified by Intervue AI
                  </p>
                  {report.completedAt && (
                    <p className="text-xs text-[#888FC0]">
                      {new Date(report.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Breakdown */}
              {report.scores?.breakdown && Object.keys(report.scores.breakdown).length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-2 gap-2.5">
                  {Object.entries(report.scores.breakdown).map(([key, val]) => {
                    const color = getScoreColor(val)
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-[#AEB5E0] truncate capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] font-mono font-semibold ml-2 shrink-0" style={{ color }}>{val}</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${val}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Insights */}
            {report.insightReport && (
              <div className="space-y-4">
                {report.insightReport.strengths?.length > 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#080A18] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-[#2DE2C5]" />
                      <h3 className="text-sm font-semibold text-[#2DE2C5]">Strengths</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {report.insightReport.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-[#C0C4D0] flex gap-2">
                          <span className="text-[#2DE2C5]/40 shrink-0 mt-0.5">·</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.insightReport.gaps?.length > 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#080A18] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                      <h3 className="text-sm font-semibold text-[#f59e0b]">Areas to work on</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {report.insightReport.gaps.map((g, i) => (
                        <li key={i} className="text-sm text-[#C0C4D0] flex gap-2">
                          <span className="text-[#f59e0b]/40 shrink-0 mt-0.5">·</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.insightReport.studyRecommendations?.length > 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#080A18] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-[#8B7CF8]" />
                      <h3 className="text-sm font-semibold text-[#8B7CF8]">Study plan</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {report.insightReport.studyRecommendations.map((r, i) => (
                        <li key={i} className="text-sm text-[#C0C4D0] flex gap-2">
                          <span className="text-[#8B7CF8]/40 shrink-0 mt-0.5">·</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-[#2DE2C5]/20 bg-gradient-to-br from-[#2DE2C5]/[0.06] to-[#8B7CF8]/[0.04] p-6 text-center">
              <TrendingUp className="w-8 h-8 text-[#2DE2C5] mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">Build your own verified proof</h3>
              <p className="text-sm text-[#AEB5E0] mb-4 max-w-sm mx-auto">
                Practice real interview scenarios, earn scores backed by evidence, and share your proof with recruiters.
              </p>
              <Link href="/onboarding">
                <Button className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
                  Start free — no credit card needed <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
