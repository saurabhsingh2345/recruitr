import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { Assessment } from '@/lib/models/Assessment'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  await connectDB()

  const invite = await AssessmentInvite.findOne({ token }).lean()
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const assessment = await Assessment.findById(invite.assessmentId).lean()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const recruiter = await User.findById(assessment.recruiterId).select('name company').lean()

  // Check if recruiter is viewing (has auth session)
  const authSession = await auth()
  const isRecruiter = authSession?.user?.id &&
    (recruiter as { _id?: { toString(): string } } | null)?._id?.toString() === authSession.user.id

  // Load session reports for each round
  const roundsWithReports = await Promise.all(
    (invite.rounds as { sessionId?: unknown; [k: string]: unknown }[]).map(async (round) => {
      if (!round.sessionId) return round
      const sess = await InterviewSession.findById(round.sessionId)
        .select('scores insightReport messages format')
        .lean()
      return { ...round, sessionReport: sess || null }
    })
  )

  return NextResponse.json({
    invite: { ...invite, rounds: roundsWithReports },
    assessment,
    company: (recruiter as { company?: string; name?: string } | null)?.company || (recruiter as { name?: string } | null)?.name || 'The company',
    isRecruiterView: isRecruiter,
  })
}
