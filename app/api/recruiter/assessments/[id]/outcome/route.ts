import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { User } from '@/lib/models/User'

const VALID = ['hired', 'advanced', 'rejected', 'declined'] as const

// Pillar 7 — recruiter records the real hiring outcome for a candidate, which
// calibrates Intervue's verdicts over time.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const { id } = await params
  const { inviteId, decision, note } = await req.json()

  if (!inviteId || !VALID.includes(decision)) {
    return NextResponse.json({ error: 'inviteId and a valid decision are required' }, { status: 400 })
  }

  // Ownership check — the recruiter must own the assessment this invite belongs to.
  const assessment = await Assessment.findOne({ _id: id, recruiterId: user._id }).select('_id').lean()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const invite = await AssessmentInvite.findOne({ _id: inviteId, assessmentId: id })
  if (!invite) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  invite.outcome = { decision, note: note || '', recordedAt: new Date() }
  await invite.save()

  return NextResponse.json({ ok: true, outcome: invite.outcome })
}
