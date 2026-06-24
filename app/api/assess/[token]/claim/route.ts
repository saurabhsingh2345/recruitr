import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const authSession = await auth()
  if (!authSession?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params
  await connectDB()

  const invite = await AssessmentInvite.findOne({ token })
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Link invite to user
  invite.userId = authSession.user.id as unknown as import('mongoose').Types.ObjectId
  await invite.save()

  // Update all completed sessions with userId
  const completedRounds = invite.rounds.filter((r: { sessionId?: unknown; status: string }) => r.sessionId && r.status === 'completed')
  for (const round of completedRounds) {
    await InterviewSession.findByIdAndUpdate(round.sessionId, {
      userId: authSession.user.id,
    })
  }

  // Merge skills from sessions into profile
  const profile = await Profile.findOne({ userId: authSession.user.id })
  if (profile) {
    for (const round of completedRounds) {
      const sess = await InterviewSession.findById(round.sessionId).lean()
      if (!sess || !sess.scores?.overall) continue

      const skillName = sess.targetSkill
      const skillIdx = profile.parsedSkills.findIndex(
        (s: { name: string }) => s.name.toLowerCase() === skillName.toLowerCase()
      )

      if (skillIdx >= 0) {
        const before = profile.parsedSkills[skillIdx].proofScore
        const after = Math.min(100, Math.round(before * 0.7 + sess.scores.overall * 0.3))
        profile.parsedSkills[skillIdx].proofScore = after
        profile.parsedSkills[skillIdx].lastUpdated = new Date()
        if (!profile.parsedSkills[skillIdx].scoreHistory) {
          profile.parsedSkills[skillIdx].scoreHistory = []
        }
        profile.parsedSkills[skillIdx].scoreHistory.push({
          score: after,
          source: 'assessment',
          at: new Date(),
        })
      } else {
        const newScore = Math.min(100, Math.max(20, Math.round(sess.scores.overall)))
        profile.parsedSkills.push({
          name: skillName,
          evidence: ['Completed assessment round'],
          proofScore: newScore,
          lastUpdated: new Date(),
          scoreHistory: [{ score: newScore, source: 'assessment', at: new Date() }],
        })
      }
    }
    await profile.save()
  }

  return NextResponse.json({ success: true })
}
