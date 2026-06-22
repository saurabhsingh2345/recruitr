import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'
import { Types } from 'mongoose'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  try {
    await connectDB()

    const interviewSession = await InterviewSession.findOne({ shareToken: token })
      .select('userId format targetSkill scores insightReport completedAt status scoreUpdate')

    if (!interviewSession) {
      return NextResponse.json({ error: 'Not found or link expired' }, { status: 404 })
    }

    const userDoc = await User.findById(interviewSession.userId as Types.ObjectId)
      .select('username name avatarUrl')
      .lean() as { username?: string; name?: string; avatarUrl?: string } | null

    return NextResponse.json({
      format: interviewSession.format,
      targetSkill: interviewSession.targetSkill,
      scores: interviewSession.scores,
      insightReport: interviewSession.insightReport,
      completedAt: interviewSession.completedAt,
      scoreUpdate: interviewSession.scoreUpdate || null,
      username: userDoc?.username || '',
      name: userDoc?.name || '',
      avatarUrl: userDoc?.avatarUrl || '',
    })
  } catch (error) {
    console.error('Shared report fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
