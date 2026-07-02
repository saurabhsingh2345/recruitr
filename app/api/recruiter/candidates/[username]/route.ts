import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { VerifiedCard } from '@/lib/models/VerifiedCard'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { HireSignal } from '@/lib/models/HireSignal'

/** Recruiter trust view for a candidate by username. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username } = await params
  await connectDB()

  const user = await User.findOne({ username, role: 'candidate' })
    .select('name username avatarUrl email openToWork _id')
    .lean()
  if (!user) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const profile = await Profile.findOne({ userId: user._id, isPublic: true })
    .select('parsedSkills targetRole location cohortPercentile bio careerGoal vouchedBadge')
    .lean()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not public or not found' }, { status: 404 })
  }

  const [verifiedCard, sessionCount, latestAssessment, hireSignals] = await Promise.all([
    VerifiedCard.findOne({ userId: user._id }).lean(),
    InterviewSession.countDocuments({ userId: user._id, status: 'completed' }),
    AssessmentInvite.findOne({ userId: user._id, status: 'completed' })
      .sort({ completedAt: -1 })
      .select('compositeScore verdict verdictReason completedAt')
      .lean(),
    HireSignal.find({ userId: user._id }).limit(5).lean(),
  ])

  const topSkills = [...(profile.parsedSkills as { name: string; proofScore: number }[])]
    .sort((a, b) => b.proofScore - a.proofScore)
    .slice(0, 5)

  const [verifiedUsers, hiredUsers] = await Promise.all([
    VerifiedCard.distinct('userId').then((ids) => ids.length),
    HireSignal.distinct('userId').then((ids) => ids.length),
  ])
  const platformHireRate =
    verifiedUsers > 0 ? Math.round((hiredUsers / verifiedUsers) * 100) : null

  const avgProofAtHire = await HireSignal.aggregate([
    { $group: { _id: null, avg: { $avg: '$proofScoreAtHire' } } },
  ])

  return NextResponse.json({
    user,
    profile: {
      targetRole: profile.targetRole,
      location: profile.location,
      cohortPercentile: profile.cohortPercentile,
      bio: profile.bio,
      vouchedBadge: profile.vouchedBadge,
    },
    topSkills,
    verifiedCard,
    sessionCount,
    latestAssessment,
    hireSignals,
    benchmarks: {
      platformHireRate,
      avgProofScoreAtHire: avgProofAtHire[0]?.avg ? Math.round(avgProofAtHire[0].avg) : null,
      verifiedCardUsers: verifiedUsers,
    },
  })
}
