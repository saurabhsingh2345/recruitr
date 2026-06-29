import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { User } from '@/lib/models/User'
import { convenePanel, type PanelistSignal } from '@/lib/agents/panel'

/**
 * Convene the hiring-committee (Panel) agent for one candidate: aggregate each
 * assessment round (an independent lens) plus optional human interviewer notes
 * into a committee brief, and persist it on the invite.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { token, humanNotes } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  await connectDB()
  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const assessment = await Assessment.findOne({ _id: id, recruiterId: user._id }).lean()
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const invite = await AssessmentInvite.findOne({ token, assessmentId: id })
  if (!invite) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  // Build a panelist signal from each completed round.
  const roundTitleByOrder = new Map<number, string>(
    (assessment.rounds || []).map((r: { order: number; title: string }) => [r.order, r.title])
  )
  const panelists: PanelistSignal[] = (invite.rounds || [])
    .filter((r: { status: string }) => r.status === 'completed')
    .map((r: {
      roundOrder: number
      score?: number
      competencies?: { label?: string; key: string; rating?: number }[]
    }) => ({
      source: `Round ${r.roundOrder} · ${roundTitleByOrder.get(r.roundOrder) || 'Assessment'}`,
      verdictOrScore: `${Math.round(r.score || 0)}/100`,
      competencies: (r.competencies || []).map(
        (c) => `${c.label || c.key} ${c.rating ?? '?'}/5`
      ),
    }))

  // Integrity is its own panelist lens when there's anything to say.
  if (invite.integrityLevel && invite.integrityLevel !== 'clean') {
    panelists.push({
      source: 'Integrity monitor',
      verdictOrScore: invite.integrityLevel,
      competencies: [],
      notes: `Integrity score ${invite.integrityScore ?? '?'}/100 — ${invite.integrityLevel}.`,
    })
  }

  // Optional human interviewer notes become a panelist too.
  const notes = typeof humanNotes === 'string' ? humanNotes.trim() : ''
  if (notes) {
    panelists.push({
      source: 'Human interviewer',
      verdictOrScore: 'notes',
      competencies: [],
      notes,
    })
  }

  if (panelists.length === 0) {
    return NextResponse.json({ error: 'No completed rounds to convene a panel on' }, { status: 400 })
  }

  const brief = await convenePanel({
    role: assessment.role,
    candidateName: invite.candidateName || 'Candidate',
    composite: invite.compositeScore || 0,
    panelists,
  })

  invite.panelBrief = { ...brief, humanNotes: notes, generatedAt: new Date(brief.generatedAt) }
  await invite.save()

  return NextResponse.json({ panelBrief: invite.panelBrief })
}
