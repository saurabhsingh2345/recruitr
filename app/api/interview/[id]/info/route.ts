import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'

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

    const interviewSession = await InterviewSession.findOne({
      _id: id,
      userId: session.user.id,
    }).select('format targetSkill status messages createdAt')

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      format: interviewSession.format,
      targetSkill: interviewSession.targetSkill,
      status: interviewSession.status,
      messages: interviewSession.messages,
    })
  } catch (error) {
    console.error('Session info error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
