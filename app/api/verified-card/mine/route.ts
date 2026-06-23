import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { VerifiedCard } from '@/lib/models/VerifiedCard'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [card, profile, sessionCount] = await Promise.all([
    VerifiedCard.findOne({ userId: session.user.id }).lean() as Promise<{
      targetRole: string; targetLevel: string; topSkills: { name: string; score: number; percentile: number }[]
      sessionCount: number; issuedAt: Date; cardToken: string; shareCount: number
    } | null>,
    Profile.findOne({ userId: session.user.id }).select('parsedSkills careerGoal').lean() as Promise<{
      parsedSkills: { name: string; proofScore: number }[]
      careerGoal?: { targetRole: string; targetLevel: string }
    } | null>,
    InterviewSession.countDocuments({ userId: session.user.id, status: 'completed' }),
  ])

  const topScore = profile?.parsedSkills?.sort((a, b) => b.proofScore - a.proofScore)[0]?.proofScore ?? 0
  const hasGoal = !!profile?.careerGoal?.targetRole
  const sessionsNeeded = Math.max(0, 5 - sessionCount)
  const scoreNeeded = Math.max(0, 70 - topScore)

  return NextResponse.json({
    card,
    progress: {
      hasGoal,
      sessionCount,
      sessionsNeeded,
      topScore,
      scoreNeeded,
      eligible: hasGoal && sessionCount >= 5 && topScore >= 70,
    },
  })
}
