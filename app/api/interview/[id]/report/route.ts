import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await connectDB()

    const [interviewSession, userDoc, profile] = await Promise.all([
      InterviewSession.findOne({ _id: id, userId: session.user.id })
        .select('format targetSkill scores insightReport completedAt status messages scoreUpdate companyMode metadata'),
      User.findById(session.user.id).select('username').lean(),
      Profile.findOne({ userId: session.user.id }).select('cohortPercentile').lean(),
    ])

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      format: interviewSession.format,
      targetSkill: interviewSession.targetSkill,
      scores: interviewSession.scores,
      insightReport: interviewSession.insightReport,
      completedAt: interviewSession.completedAt,
      status: interviewSession.status,
      scoreUpdate: interviewSession.scoreUpdate || null,
      companyMode: interviewSession.companyMode || null,
      metadata: interviewSession.metadata || null,
      username: (userDoc as { username?: string } | null)?.username || '',
      cohortPercentile: (profile as { cohortPercentile?: number } | null)?.cohortPercentile ?? 0,
      messages: (interviewSession.messages || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })
  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
