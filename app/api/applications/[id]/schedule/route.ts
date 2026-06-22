import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'
import { User } from '@/lib/models/User'

// POST — propose an interview schedule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { date, time, timezone, type, meetLink, notes } = await req.json()
  if (!date || !time) return NextResponse.json({ error: 'date and time required' }, { status: 400 })

  try {
    await connectDB()

    const app = await Application.findOne({
      _id: id,
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sender = await User.findById(session.user.id).lean()

    app.interview = {
      date,
      time,
      timezone: timezone || 'Asia/Kolkata',
      type: type || 'video',
      meetLink: meetLink || '',
      notes: notes || '',
      status: 'proposed',
    }
    app.status = 'interview_scheduled'

    const typeLabel: Record<string, string> = {
      video: 'Video call',
      phone: 'Phone call',
      in_person: 'In person',
    }
    const content = [
      `📅 ${date} at ${time} IST`,
      `${typeLabel[type] || type}`,
      meetLink ? `🔗 ${meetLink}` : '',
      notes ? `📝 ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    app.messages.push({
      senderId: session.user.id,
      senderName: sender?.name || '',
      senderAvatar: sender?.avatarUrl || '',
      content,
      type: 'schedule_invite',
      readBy: [session.user.id],
      timestamp: new Date(),
    })

    await app.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Schedule error:', err)
    return NextResponse.json({ error: 'Failed to schedule' }, { status: 500 })
  }
}

// PATCH — confirm or decline
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() // 'confirm' | 'decline'

  try {
    await connectDB()

    const app = await Application.findOne({
      _id: id,
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
    if (!app || !app.interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sender = await User.findById(session.user.id).lean()
    app.interview.status = action === 'confirm' ? 'confirmed' : 'declined'

    const msgType = action === 'confirm' ? 'schedule_confirmed' : 'schedule_declined'
    const content =
      action === 'confirm'
        ? `✅ Interview confirmed for ${app.interview.date} at ${app.interview.time}`
        : `❌ Interview declined — please propose a new time`

    app.messages.push({
      senderId: session.user.id,
      senderName: sender?.name || '',
      senderAvatar: sender?.avatarUrl || '',
      content,
      type: msgType,
      readBy: [session.user.id],
      timestamp: new Date(),
    })

    await app.save()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Schedule confirm error:', err)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}
