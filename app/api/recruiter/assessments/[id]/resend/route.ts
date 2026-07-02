import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { User } from '@/lib/models/User'
import { sendAssessmentInviteEmail } from '@/lib/assessment-email'

/** Resend an assessment invite (no credit charge). Optionally extend deadline. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { inviteId, extendDays = 7 } = await req.json()

  if (!inviteId) return NextResponse.json({ error: 'inviteId required' }, { status: 400 })

  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const assessment = await Assessment.findOne({ _id: id, recruiterId: user._id })
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const invite = await AssessmentInvite.findOne({ _id: inviteId, assessmentId: assessment._id })
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  if (invite.status === 'completed') {
    return NextResponse.json({ error: 'Candidate already completed this assessment' }, { status: 400 })
  }

  const now = new Date()
  let deadline = new Date(assessment.deadline)

  if (deadline < now) {
    deadline = new Date(now.getTime() + extendDays * 86400000)
    assessment.deadline = deadline
    if (assessment.status === 'closed') assessment.status = 'active'
    await assessment.save()
  }

  // Reset invite for another attempt
  const allRoundsDone = invite.rounds.every((r: { status: string }) => r.status === 'completed')
  if (allRoundsDone) {
    return NextResponse.json({ error: 'All rounds already completed' }, { status: 400 })
  }

  invite.status = 'invited'
  invite.invitedAt = now
  invite.compositeScore = 0
  invite.verdict = null
  invite.verdictReason = ''
  invite.rounds = invite.rounds.map((r: { status: string; roundOrder: number; weight?: number }) =>
    r.status === 'completed'
      ? r
      : {
          roundOrder: r.roundOrder,
          status: 'pending' as const,
          weight: r.weight ?? 1,
        }
  )
  await invite.save()

  const emailResult = await sendAssessmentInviteEmail({
    to: invite.candidateEmail,
    candidateName: invite.candidateName,
    role: assessment.role,
    company: user.company || user.name,
    roundCount: assessment.rounds.length,
    deadline,
    token: invite.token,
    subjectPrefix: 'Reminder — interview for',
  })

  return NextResponse.json({
    ok: true,
    inviteUrl: emailResult.url,
    emailSent: emailResult.sent,
    newDeadline: deadline.toISOString(),
  })
}
