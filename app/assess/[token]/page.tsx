'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding', system_design: 'System Design', project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural', gap: 'Gap Session', pm_case: 'PM Case Study',
  design_critique: 'Design Critique', ops_case: 'Ops / Program Mgmt', sales_discovery: 'Sales Discovery',
}

interface AssessmentRound { order: number; title: string; format: string; durationMinutes: number; instructions?: string }
interface Assessment { title: string; role: string; deadline: string; rounds: AssessmentRound[] }
interface InviteRound { roundOrder: number; status: string }
interface Invite { candidateName: string; candidateEmail: string; status: string; rounds: InviteRound[] }

export default function AssessLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [data, setData] = useState<{ invite: Invite; assessment: Assessment; company: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [identifying, setIdentifying] = useState(false)

  useEffect(() => {
    fetch(`/api/assess/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load assessment'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setIdentifying(true)
    const res = await fetch(`/api/assess/${token}/identify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    })
    const d = await res.json()
    if (!res.ok) {
      toast.error(d.error || 'Failed')
      setIdentifying(false)
      return
    }
    // Reload to show overview
    const updated = await fetch(`/api/assess/${token}`).then((r) => r.json())
    setData(updated)
    setIdentifying(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#2DE2C5] animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center text-white">
      <div className="text-center max-w-sm">
        <AlertCircle className="w-10 h-10 text-[#f43f5e] mx-auto mb-3" />
        <h2 className="font-bold text-lg mb-2">Link not valid</h2>
        <p className="text-[#888FC0] text-sm">{error}</p>
      </div>
    </div>
  )

  if (!data) return null

  const { invite, assessment, company } = data

  if (invite.status === 'completed') return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center text-white">
      <div className="text-center max-w-sm">
        <CheckCircle2 className="w-10 h-10 text-[#2DE2C5] mx-auto mb-3" />
        <h2 className="font-bold text-lg mb-2">You've completed this assessment</h2>
        <p className="text-[#888FC0] text-sm mb-6">Thank you for completing all rounds.</p>
        <Link href={`/assess/${token}/report`}>
          <Button className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
            View your results →
          </Button>
        </Link>
      </div>
    </div>
  )

  const inputCls = 'w-full bg-[#0B0E1C] border border-[#1A1E3A] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#888FC0] focus:outline-none focus:border-[#2DE2C5]/40'

  // Not identified yet
  if (!invite.candidateName) return (
    <div className="min-h-screen bg-[#05060F] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#2DE2C5] flex items-center justify-center mx-auto mb-4">
            <span className="font-bold text-[#05060F] text-lg">I</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to your assessment</h1>
          <p className="text-[#888FC0] text-sm">
            You've been invited to interview for <strong className="text-white">{assessment.role}</strong> at <strong className="text-white">{company}</strong>.
          </p>
        </div>
        <form onSubmit={handleIdentify} className="space-y-4">
          <div>
            <label className="text-xs text-[#AEB5E0] font-medium block mb-1.5">Your full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className={inputCls} required />
          </div>
          <div>
            <label className="text-xs text-[#AEB5E0] font-medium block mb-1.5">Your email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="priya@example.com" className={inputCls} required />
          </div>
          <Button type="submit" disabled={identifying} className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold">
            {identifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Begin assessment →'}
          </Button>
        </form>
        <p className="text-center text-xs text-[#555] mt-4">No account required. Your link is unique to you.</p>
      </div>
    </div>
  )

  // Identified — show overview
  const deadlinePassed = new Date(assessment.deadline) < new Date()

  function nextRoundToStart(): number | null {
    for (const r of assessment.rounds) {
      const ir = invite.rounds.find((ir) => ir.roundOrder === r.order)
      if (!ir || ir.status === 'pending' || ir.status === 'in_progress') return r.order
    }
    return null
  }

  const nextRound = nextRoundToStart()

  return (
    <div className="min-h-screen bg-[#05060F] text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#2DE2C5] flex items-center justify-center mx-auto mb-4">
            <span className="font-bold text-[#05060F] text-lg">I</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">{assessment.title}</h1>
          <p className="text-[#888FC0] text-sm">{assessment.role} · {company}</p>
          <p className="text-xs text-[#555] mt-2 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Due {new Date(assessment.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {deadlinePassed && (
            <div className="mt-3 text-xs text-[#f43f5e] bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-lg px-3 py-2">
              The deadline for this assessment has passed.
            </div>
          )}
        </div>

        {/* Greeting */}
        <div className="text-sm text-[#888FC0] mb-6 text-center">
          Hi <strong className="text-white">{invite.candidateName}</strong> — here's your assessment overview.
        </div>

        {/* Rounds list */}
        <div className="space-y-3 mb-8">
          {assessment.rounds.map((round) => {
            const ir = invite.rounds.find((r) => r.roundOrder === round.order)
            const status = ir?.status || 'pending'
            const isCompleted = status === 'completed'
            const isNext = round.order === nextRound && !deadlinePassed

            return (
              <div key={round.order} className={`rounded-xl border p-4 transition-all ${
                isCompleted ? 'border-[#2DE2C5]/20 bg-[#2DE2C5]/[0.03]'
                : isNext ? 'border-[#2DE2C5]/30 bg-white/[0.02]'
                : 'border-white/[0.06] bg-white/[0.01]'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{round.title}</span>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#2DE2C5]" />}
                    </div>
                    <div className="text-xs text-[#888FC0]">
                      {FORMAT_LABELS[round.format] || round.format} · {round.durationMinutes} min
                    </div>
                    {round.instructions && !isCompleted && (
                      <p className="text-xs text-[#AEB5E0] mt-1.5 leading-relaxed">{round.instructions}</p>
                    )}
                  </div>
                  {isNext && (
                    <Link href={`/assess/${token}/round/${round.order}`}>
                      <Button size="sm" className="bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold text-xs gap-1">
                        {status === 'in_progress' ? 'Continue' : 'Start'} <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {nextRound && !deadlinePassed && (
          <Link href={`/assess/${token}/round/${nextRound}`} className="block">
            <Button className="w-full bg-[#2DE2C5] text-[#05060F] hover:bg-[#1fb89e] font-semibold text-base py-3">
              Begin assessment →
            </Button>
          </Link>
        )}

        <p className="text-center text-xs text-[#555] mt-6">Your progress is saved automatically. You can return to this link anytime.</p>
      </div>
    </div>
  )
}
