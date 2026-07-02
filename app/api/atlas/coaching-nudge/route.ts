import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { buildCoachingNudge } from '@/lib/atlas-coaching'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const profile = await Profile.findOne({ userId: session.user.id })
    .select('parsedSkills careerGoal')
    .lean()

  const sessionCount = await InterviewSession.countDocuments({
    userId: session.user.id,
    status: 'completed',
  })

  const nudge = buildCoachingNudge({
    skills: (profile?.parsedSkills as { name: string; proofScore: number }[]) || [],
    careerGoal: profile?.careerGoal || null,
    sessionCount,
  })

  return NextResponse.json({ nudge })
}
