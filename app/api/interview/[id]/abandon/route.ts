import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'

// Called via navigator.sendBeacon — must accept POST
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse(null, { status: 204 })

  const { id } = await params

  try {
    await connectDB()
    await InterviewSession.updateOne(
      { _id: id, userId: session.user.id, status: 'in_progress' },
      { $set: { status: 'abandoned', completedAt: new Date() } }
    )
  } catch { /* fire-and-forget, errors are silent */ }

  return new NextResponse(null, { status: 204 })
}
