import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'
import { User } from '@/lib/models/User'
import { sendMessageNotification } from '@/lib/email'

// POST /api/applications/[id]/message — send a reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  try {
    await connectDB()

    const app = await Application.findOne({
      _id: id,
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sender = await User.findById(session.user.id).lean()

    app.messages.push({
      senderId: session.user.id,
      senderName: sender?.name || session.user.name || '',
      senderAvatar: sender?.avatarUrl || session.user.image || '',
      content: content.trim(),
      type: 'text',
      readBy: [session.user.id],
      timestamp: new Date(),
    })

    await app.save()

    // Notify recipient via email (fire-and-forget)
    const recipientId = session.user.id === app.recruiterId ? app.candidateId : app.recruiterId
    const recipient = await User.findById(recipientId).select('email').lean()
    if (recipient?.email) {
      sendMessageNotification(recipient.email, sender?.name || 'Someone', id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Message send error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
