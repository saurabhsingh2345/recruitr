'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle2, AlertCircle, BookOpen, TrendingUp,
  ChevronRight, Code2, BarChart2, Sparkles, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/assessment'
import { getScoreColor } from '@/lib/scoring'

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding', system_design: 'System Design', project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural', gap: 'Gap Session', pm_case: 'PM Case Study',
  design_critique: 'Design Critique', ops_case: 'Ops / Program Mgmt', sales_discovery: 'Sales Discovery',
}

const CONF_LABEL: Record<'high' | 'medium' | 'low', string> = { high: 'High', medium: 'Medium', low: 'Low' }

interface CompetencyScore {
  key: string
  label: string
  rating: number
  score: number
  weight: number
  evidence: string
  confidence: 'high' | 'medium' | 'low'
}

interface RoundReport {
  roundOrder: number
  status: string
  score?: number
  breakdown?: Record<string, number>
  competencies?: CompetencyScore[]
  confidence?: 'high' | 'medium' | 'low'
  sessionReport?: {
    format: string
    scores: { overall: number; breakdown: Record<string, number> }
    insightReport: {
      strengths: string[]
      gaps: string[]
      idealAnswers: Array<{ question: string; answer: string }>
      studyRecommendations: string[]
      aiVerdict?: string
    }
  } | null
}

interface AssessmentRound { order: number; title: string; format: string }

export default function AssessReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [data, setData] = useState<{
    invite: { candidateName: string; compositeScore: number; verdict: string | null; verdictReason: string; confidence?: 'high' | 'medium' | 'low' | null; userId?: string; rounds: RoundReport[]; status: string }
    assessment: { title: string; role: string; rounds: AssessmentRound[] }
    company: string
    isRecruiterView: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCTA, setShowCTA] = useState(true)
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/assess/${token}/report`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center text-white">
      <div className="text-center">
        <AlertCircle className="w-8 h-8 text-[#f43f5e] mx-auto mb-3" />
        <p className="text-[#888FC0]">{error || 'Report not available'}</p>
      </div>
    </div>
  )

  const { invite, assessment, company, isRecruiterView } = data
  const verdictLabel = invite.verdict ? VERDICT_LABELS[invite.verdict as keyof typeof VERDICT_LABELS] : null
  const verdictColor = invite.verdict ? VERDICT_COLORS[invite.verdict as keyof typeof VERDICT_COLORS] : '#888FC0'
  const scoreColor = getScoreColor(invite.compositeScore)

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#2DE2C5] flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-[#05060F]" />
          </div>
          <span className="font-bold text-sm">intervue</span>
        </div>
        {isRecruiterView && (
          <Badge className="bg-[#8B7CF8]/10 text-[#8B7CF8] border-[#8B7CF8]/20 text-xs">Recruiter view</Badge>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">{assessment.title}</h1>
          <p className="text-[#888FC0] text-sm">{assessment.role} · {company}</p>
          {invite.candidateName && (
            <p className="text-sm text-white/60 mt-1">{invite.candidateName}</p>
          )}
        </div>

        {/* Composite score + verdict */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
          <div className="text-5xl font-bold font-mono mb-2" style={{ color: scoreColor }}>
            {invite.compositeScore || 0}
          </div>
          <div className="text-sm text-[#888FC0] mb-3">Composite score / 100</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {verdictLabel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border"
                style={{ color: verdictColor, borderColor: verdictColor + '40', backgroundColor: verdictColor + '15' }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {verdictLabel}
              </span>
            )}
            {invite.confidence && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/[0.1] text-[#AEB5E0] bg-white/[0.03]"
                title="How much signal the assessment captured. Lower with thin transcripts or inconsistent rounds.">
                {CONF_LABEL[invite.confidence]} confidence
              </span>
            )}
          </div>
          {isRecruiterView && invite.verdictReason && (
            <p className="text-sm text-[#AEB5E0] mt-3 italic leading-relaxed max-w-sm mx-auto">
              &ldquo;{invite.verdictReason}&rdquo;
            </p>
          )}
        </div>

        {/* Round-by-round breakdown */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-[#AEB5E0] uppercase tracking-wider">Round results</h2>
          {assessment.rounds.map((round) => {
            const ir = invite.rounds.find((r) => r.roundOrder === round.order)
            const score = ir?.score
            const isExpanded = expandedRound === round.order
            const report = ir?.sessionReport

            return (
              <div key={round.order} className="rounded-xl border border-white/[0.06] overflow-hidden">
                <button
                  className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedRound(isExpanded ? null : round.order)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm mb-0.5">{round.title}</div>
                      <div className="text-xs text-[#888FC0]">{FORMAT_LABELS[round.format] || round.format}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {score !== undefined ? (
                        <span className="font-mono font-bold text-lg" style={{ color: getScoreColor(score) }}>{score}</span>
                      ) : (
                        <span className="text-[#555] text-sm">—</span>
                      )}
                      <ChevronRight className={`w-4 h-4 text-[#888FC0] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>

                {isExpanded && report && (
                  <div className="border-t border-white/[0.06] p-4 space-y-4">
                    {/* Competency breakdown — anchored ratings with evidence */}
                    {ir?.competencies && ir.competencies.length > 0 ? (
                      <div>
                        <div className="text-xs text-[#888FC0] font-semibold uppercase tracking-wider mb-2">
                          <BarChart2 className="w-3 h-3 inline mr-1" />Competencies
                        </div>
                        <div className="space-y-3">
                          {ir.competencies.map((c) => (
                            <div key={c.key}>
                              <div className="flex items-center gap-3">
                                <div className="text-xs text-[#AEB5E0] w-36">{c.label}</div>
                                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: getScoreColor(c.score) }} />
                                </div>
                                <span className="text-xs font-mono w-12 text-right" style={{ color: getScoreColor(c.score) }}>{c.rating}/5</span>
                              </div>
                              {c.evidence && c.evidence !== 'Not assessed' && (
                                <p className="text-[11px] text-[#888FC0] italic mt-1 ml-0 pl-3 border-l border-white/[0.08] leading-snug">
                                  &ldquo;{c.evidence}&rdquo;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : report.scores?.breakdown && Object.keys(report.scores.breakdown).length > 0 && (
                      <div>
                        <div className="text-xs text-[#888FC0] font-semibold uppercase tracking-wider mb-2">
                          <BarChart2 className="w-3 h-3 inline mr-1" />Score breakdown
                        </div>
                        <div className="space-y-2">
                          {Object.entries(report.scores.breakdown).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-3">
                              <div className="text-xs text-[#888FC0] w-36 capitalize">{key.replace(/_/g, ' ')}</div>
                              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: getScoreColor(val) }} />
                              </div>
                              <span className="text-xs font-mono w-8 text-right" style={{ color: getScoreColor(val) }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {report.insightReport?.strengths?.length > 0 && (
                      <div>
                        <div className="text-xs text-[#2DE2C5] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />Strengths
                        </div>
                        <ul className="space-y-1">
                          {report.insightReport.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-[#AEB5E0] flex items-start gap-2">
                              <span className="text-[#2DE2C5] shrink-0">·</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gaps */}
                    {report.insightReport?.gaps?.length > 0 && (
                      <div>
                        <div className="text-xs text-[#f59e0b] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />Gaps
                        </div>
                        <ul className="space-y-1">
                          {report.insightReport.gaps.map((g, i) => (
                            <li key={i} className="text-sm text-[#AEB5E0] flex items-start gap-2">
                              <span className="text-[#f59e0b] shrink-0">·</span>{g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ideal answers */}
                    {report.insightReport?.idealAnswers?.length > 0 && (
                      <div>
                        <div className="text-xs text-[#8B7CF8] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />Expert answers
                        </div>
                        <div className="space-y-3">
                          {report.insightReport.idealAnswers.slice(0, 3).map(({ question, answer }, i) => (
                            <div key={i} className="space-y-1.5">
                              <p className="text-xs text-[#888FC0] italic">&ldquo;{question}&rdquo;</p>
                              <p className="text-sm text-[#AEB5E0] pl-3 border-l border-[#8B7CF8]/30 leading-relaxed">{answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Study recommendations */}
                    {report.insightReport?.studyRecommendations?.length > 0 && (
                      <div>
                        <div className="text-xs text-[#3FC5F0] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />Study recommendations
                        </div>
                        <ol className="space-y-1">
                          {report.insightReport.studyRecommendations.map((r, i) => (
                            <li key={i} className="text-sm text-[#AEB5E0] flex items-start gap-2">
                              <Badge className="bg-[#3FC5F0]/10 text-[#3FC5F0] border-[#3FC5F0]/20 text-[10px] px-1.5 shrink-0 mt-0.5">{i + 1}</Badge>
                              {r}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && !report && ir?.status !== 'completed' && (
                  <div className="border-t border-white/[0.06] p-4 text-sm text-[#888FC0]">This round hasn't been completed yet.</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Conversion CTA — shown only to candidate (not recruiter), only if not already claimed */}
        {!isRecruiterView && !invite.userId && showCTA && (
          <div className="rounded-2xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-6 relative">
            <button onClick={() => setShowCTA(false)} className="absolute top-4 right-4 text-[#888FC0] hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#2DE2C5]" />
              <span className="font-semibold text-sm">Keep your scores permanently</span>
            </div>
            <p className="text-sm text-[#AEB5E0] leading-relaxed mb-4">
              Your scores are saved temporarily. Create a free Intervue account to keep them permanently,
              build your verified skill profile, and get matched with roles automatically.
            </p>
            <Link href={`/onboarding?assessmentToken=${token}`}>
              <Button className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold w-full">
                Create account → Keep my scores
              </Button>
            </Link>
          </div>
        )}

        {!isRecruiterView && invite.userId && (
          <div className="rounded-2xl border border-white/[0.06] p-5 text-center">
            <p className="text-sm text-[#888FC0] mb-3">Your scores have been added to your Intervue profile.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/[0.08] text-[#AEB5E0] hover:text-white">
                View your Intervue profile →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
