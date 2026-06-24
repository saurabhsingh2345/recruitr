import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const assessment = await Assessment.findOne({ _id: id, recruiterId: user._id }).lean()
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const invites = await AssessmentInvite.find({ assessmentId: id }).lean()

  // Attach session reports to each invite round
  const enrichedInvites = await Promise.all(
    invites.map(async (invite) => {
      const roundsWithReports = await Promise.all(
        (invite.rounds as { sessionId?: unknown; [k: string]: unknown }[]).map(async (round) => {
          if (!round.sessionId) return round
          const sess = await InterviewSession.findById(round.sessionId)
            .select('scores insightReport')
            .lean()
          return { ...round, sessionReport: sess || null }
        })
      )
      return { ...invite, rounds: roundsWithReports }
    })
  )

  return NextResponse.json({ assessment, invites: enrichedInvites })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const { status } = await req.json()
  const assessment = await Assessment.findOneAndUpdate(
    { _id: id, recruiterId: user._id },
    { status },
    { new: true }
  )
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ assessment })
}
