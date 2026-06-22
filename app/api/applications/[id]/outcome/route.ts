import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'
import { User } from '@/lib/models/User'

// PATCH /api/applications/[id]/outcome — mark hired / rejected / withdrawn
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { result, notes } = await req.json()

  if (!['hired', 'rejected', 'withdrawn'].includes(result)) {
    return NextResponse.json({ error: 'result must be hired | rejected | withdrawn' }, { status: 400 })
  }

  try {
    await connectDB()

    const app = await Application.findOne({
      _id: id,
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sender = await User.findById(session.user.id).lean()

    app.outcome = { result, notes: notes || '', updatedAt: new Date() }
    app.status = result

    const emoji = result === 'hired' ? '🎉' : result === 'rejected' ? '❌' : '🔄'
    const label = result === 'hired' ? 'Offer extended!' : result === 'rejected' ? 'Application closed' : 'Application withdrawn'

    app.messages.push({
      senderId: session.user.id,
      senderName: sender?.name || '',
      senderAvatar: sender?.avatarUrl || '',
      content: `${emoji} ${label}${notes ? ` — ${notes}` : ''}`,
      type: 'outcome',
      readBy: [session.user.id],
      timestamp: new Date(),
    })

    await app.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Outcome error:', err)
    return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 })
  }
}
