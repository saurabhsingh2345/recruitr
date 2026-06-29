'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Clock, Download, ExternalLink, ChevronLeft, Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/assessment'
import { INTEGRITY_COLORS } from '@/lib/assessment-integrity'
import { computeCalibration, OUTCOME_LABELS, type OutcomeDecision } from '@/lib/assessment-calibration'

interface InviteRound {
  roundOrder: number
  status: string
  score?: number
  breakdown?: Record<string, number>
}

interface Invite {
  _id: string
  candidateName: string
  candidateEmail: string
  token: string
  status: string
  compositeScore: number
  verdict: string | null
  verdictReason: string
  confidence?: 'high' | 'medium' | 'low' | null
  integrityScore?: number | null
  integrityLevel?: 'clean' | 'minor' | 'flagged' | null
  outcome?: { decision: OutcomeDecision; recordedAt: string } | null
  rounds: InviteRound[]
}

interface Assessment {
  _id: string
  title: string
  role: string
  deadline: string
  status: string
  rounds: { order: number; title: string; format: string }[]
}

function scoreColor(score: number) {
  if (score >= 65) return '#2DE2C5'
  if (score >= 50) return '#f59e0b'
  return '#f43f5e'
}

export default function AssessmentDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/recruiter/assessments/${id}`)
    if (res.ok) {
      const data = await res.json()
      setAssessment(data.assessment)
      setInvites(
        [...(data.invites || [])].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
      )
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function closeAssessment() {
    if (!confirm('Close this assessment? Candidates will no longer be able to complete rounds.')) return
    setClosing(true)
    await fetch(`/api/recruiter/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    toast.success('Assessment closed')
    await load()
    setClosing(false)
  }

  async function recordOutcome(inviteId: string, decision: OutcomeDecision) {
    // optimistic update
    setInvites((prev) => prev.map((i) => (i._id === inviteId ? { ...i, outcome: { decision, recordedAt: new Date().toISOString() } } : i)))
    const res = await fetch(`/api/recruiter/assessments/${id}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, decision }),
    })
    if (!res.ok) { toast.error('Failed to save outcome'); await load() }
  }

  function exportCSV() {
    if (!assessment || !invites.length) return
    const headers = ['Name', 'Email', 'Composite Score', 'Verdict', 'Confidence', 'Integrity', ...assessment.rounds.map((r) => `Round ${r.order} Score`)]
    const rows = invites.map((inv) => [
      inv.candidateName || '',
      inv.candidateEmail || '',
      inv.compositeScore || 0,
      inv.verdict ? VERDICT_LABELS[inv.verdict as keyof typeof VERDICT_LABELS] || inv.verdict : '',
      inv.confidence || '',
      inv.integrityScore ?? '',
      ...assessment.rounds.map((r) => {
        const rd = inv.rounds.find((ir) => ir.roundOrder === r.order)
        return rd?.score ?? ''
      }),
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assessment.title.replace(/\s+/g, '-')}-results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
    </div>
  )

  if (!assessment) return (
    <div className="min-h-screen bg-[#05060F] text-white flex items-center justify-center">
      <div className="text-center"><p className="text-[#888FC0] mb-4">Assessment not found</p>
        <Link href="/recruiter/assessments"><Button variant="outline" className="border-white/[0.08]">Back to list</Button></Link>
      </div>
    </div>
  )

  const totalRounds = assessment.rounds.length
  const completed = invites.filter((i) => i.status === 'completed').length
  const strongHire = invites.filter((i) => i.verdict === 'strong_hire' || i.verdict === 'hire').length
  const bestScore = invites.reduce((m, i) => Math.max(m, i.compositeScore || 0), 0)
  const calibration = computeCalibration(invites)

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Nav */}
        <Link href="/recruiter/assessments" className="inline-flex items-center gap-1.5 text-sm text-[#888FC0] hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> All assessments
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{assessment.title}</h1>
              <Badge className={assessment.status === 'active' ? 'bg-[#2DE2C5]/10 text-[#2DE2C5] border-[#2DE2C5]/20' : assessment.status === 'closed' ? 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20' : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'}>
                {assessment.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#888FC0]">
              <span>{assessment.role}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Due {new Date(assessment.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportCSV} variant="outline" size="sm" className="border-white/[0.08] text-[#AEB5E0] hover:text-white gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            {assessment.status === 'active' && (
              <Button onClick={closeAssessment} disabled={closing} size="sm" className="bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/30 hover:bg-[#f43f5e]/20 gap-1.5">
                {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Close assessment
              </Button>
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Invited', value: invites.length, color: '#AEB5E0' },
            { label: 'Completed', value: completed, color: '#2DE2C5' },
            { label: 'Hire / Strong hire', value: strongHire, color: '#3FC5F0' },
            { label: 'Best score', value: bestScore || '—', color: '#8B7CF8' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-2xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#888FC0]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Calibration — proves the verdicts against real outcomes */}
        {calibration.sampleSize > 0 && (
          <div className="rounded-xl border border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.04] p-5 mb-8 flex flex-wrap items-center gap-6">
            <div>
              <div className="text-3xl font-bold font-mono text-[#2DE2C5]">
                {calibration.verifiedHireRate !== null ? `${calibration.verifiedHireRate}%` : '—'}
              </div>
              <div className="text-xs text-[#AEB5E0] max-w-[180px] mt-1">
                of candidates Intervue recommended were hired or advanced
              </div>
            </div>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div className="flex flex-wrap gap-4">
              {(['strong_hire', 'hire', 'maybe', 'no_hire'] as const).map((v) => {
                const b = calibration.byVerdict[v]
                if (b.total === 0) return null
                return (
                  <div key={v} className="text-center">
                    <div className="text-sm font-mono font-bold" style={{ color: VERDICT_COLORS[v] }}>
                      {b.rate}% <span className="text-[10px] text-[#888FC0]">({b.positive}/{b.total})</span>
                    </div>
                    <div className="text-[10px] text-[#888FC0]">{VERDICT_LABELS[v]}</div>
                  </div>
                )
              })}
            </div>
            <div className="text-[10px] text-[#555] ml-auto">Based on {calibration.sampleSize} recorded outcome{calibration.sampleSize !== 1 ? 's' : ''}</div>
          </div>
        )}

        {/* Candidate table */}
        {invites.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] p-12 text-center">
            <Users className="w-8 h-8 text-[#888FC0] mx-auto mb-3" />
            <p className="text-[#888FC0]">No candidates yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Progress</th>
                  <th className="text-center px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Score</th>
                  <th className="text-center px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Verdict</th>
                  <th className="text-center px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Integrity</th>
                  <th className="text-center px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Rounds</th>
                  <th className="text-center px-4 py-3 text-xs text-[#888FC0] font-semibold uppercase tracking-wider">Outcome</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {invites.map((invite) => {
                  const completedRounds = invite.rounds.filter((r) => r.status === 'completed').length
                  const verdictLabel = invite.verdict ? VERDICT_LABELS[invite.verdict as keyof typeof VERDICT_LABELS] : null
                  const verdictColor = invite.verdict ? VERDICT_COLORS[invite.verdict as keyof typeof VERDICT_COLORS] : '#888FC0'

                  return (
                    <tr key={invite._id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{invite.candidateName || 'Not started'}</div>
                        <div className="text-xs text-[#888FC0]">{invite.candidateEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden max-w-20">
                            <div className="h-full bg-[#2DE2C5] rounded-full" style={{ width: `${(completedRounds / totalRounds) * 100}%` }} />
                          </div>
                          <span className="text-xs text-[#888FC0]">{completedRounds}/{totalRounds}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {invite.compositeScore > 0 ? (
                          <span className="font-mono font-bold text-sm" style={{ color: scoreColor(invite.compositeScore) }}>
                            {invite.compositeScore}
                          </span>
                        ) : (
                          <span className="text-[#555] text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {verdictLabel ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color: verdictColor, borderColor: verdictColor + '40', backgroundColor: verdictColor + '15' }}>
                              {verdictLabel}
                            </span>
                            {invite.confidence && (
                              <span className="text-[10px] text-[#888FC0]" title="Confidence in this verdict — lower with thin transcripts or inconsistent rounds">
                                {invite.confidence} conf.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#555] text-xs">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {invite.integrityLevel ? (
                          <span className="text-xs font-mono font-bold" style={{ color: INTEGRITY_COLORS[invite.integrityLevel] }}
                            title={invite.integrityLevel === 'clean' ? 'No integrity flags' : 'Integrity flags — open the report for detail'}>
                            {invite.integrityScore}
                          </span>
                        ) : (
                          <span className="text-[#555] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {invite.rounds.map((r) => (
                            <div key={r.roundOrder} title={`Round ${r.roundOrder}: ${r.score ?? '—'}`}
                              className="w-6 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center border"
                              style={r.status === 'completed' && r.score !== undefined
                                ? { color: scoreColor(r.score), borderColor: scoreColor(r.score) + '40', backgroundColor: scoreColor(r.score) + '15' }
                                : { color: '#888FC0', borderColor: '#1A1E3A', backgroundColor: 'transparent' }}>
                              {r.status === 'completed' && r.score !== undefined ? r.score : '–'}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={invite.outcome?.decision || ''}
                          onChange={(e) => e.target.value && recordOutcome(invite._id, e.target.value as OutcomeDecision)}
                          className="bg-[#0B0E1C] border border-[#1A1E3A] rounded-md px-2 py-1 text-xs text-[#AEB5E0] focus:outline-none focus:border-[#2DE2C5]/40"
                          title="Record what actually happened — this calibrates Intervue's verdicts"
                        >
                          <option value="">— Set —</option>
                          {(Object.keys(OUTCOME_LABELS) as OutcomeDecision[]).map((d) => (
                            <option key={d} value={d}>{OUTCOME_LABELS[d]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/assess/${invite.token}/report`} target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-[#888FC0] hover:text-[#2DE2C5] transition-colors">
                          <ExternalLink className="w-3 h-3" /> Report
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
