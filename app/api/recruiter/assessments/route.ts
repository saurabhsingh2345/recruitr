import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { User } from '@/lib/models/User'
import { sendAssessmentInviteEmail } from '@/lib/assessment-email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const { title, role, deadline, rounds, candidates } = await req.json()

  if (!title || !role || !deadline || !rounds?.length || !candidates?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Usage-based billing: one credit per candidate assessed.
  const needed = candidates.length
  const balance = user.assessmentCredits ?? 0
  if (balance < needed) {
    return NextResponse.json(
      {
        error: 'INSUFFICIENT_CREDITS',
        message: `This assessment needs ${needed} credit${needed !== 1 ? 's' : ''} but you have ${balance}.`,
        needed,
        balance,
      },
      { status: 402 }
    )
  }

  const assessment = await Assessment.create({
    recruiterId: user._id,
    title,
    role,
    rounds,
    deadline: new Date(deadline),
    status: 'active',
  })

  const invites = []
  for (const candidate of candidates) {
    const token = crypto.randomBytes(16).toString('hex')
    const invite = await AssessmentInvite.create({
      assessmentId: assessment._id,
      token,
      candidateName: candidate.name || '',
      candidateEmail: candidate.email,
      rounds: rounds.map((r: { order: number; weight?: number }) => ({
        roundOrder: r.order,
        status: 'pending',
        weight: r.weight ?? 1,
      })),
      status: 'invited',
      invitedAt: new Date(),
    })
    invites.push(invite)
    sendAssessmentInviteEmail({
      to: candidate.email,
      candidateName: candidate.name || '',
      role,
      company: user.company || user.name,
      roundCount: rounds.length,
      deadline: new Date(deadline),
      token,
    }).catch(() => {})
  }

  // Consume one credit per invite actually created.
  if (invites.length > 0) {
    await User.findByIdAndUpdate(user._id, { $inc: { assessmentCredits: -invites.length } })
  }

  return NextResponse.json({
    assessment,
    inviteCount: invites.length,
    creditsRemaining: balance - invites.length,
  })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const assessments = await Assessment.find({ recruiterId: user._id })
    .sort({ createdAt: -1 })
    .lean()

  const ids = assessments.map((a) => a._id)
  const inviteCounts = await AssessmentInvite.aggregate([
    { $match: { assessmentId: { $in: ids } } },
    { $group: { _id: '$assessmentId', count: { $sum: 1 } } },
  ])
  const countMap = Object.fromEntries(inviteCounts.map((c) => [c._id.toString(), c.count]))

  return NextResponse.json({
    assessments: assessments.map((a) => ({
      ...a,
      candidateCount: countMap[a._id.toString()] || 0,
    })),
  })
}
