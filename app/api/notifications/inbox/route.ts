import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Notification } from '@/lib/models/Notification'

// GET /api/notifications/inbox — last 30 notifications + unread count
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ notifications: [], unread: 0 })

  try {
    await connectDB()
    const notifications = await Notification.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()

    const unread = notifications.filter(n => !n.read).length

    return NextResponse.json({
      notifications: notifications.map(n => ({
        _id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unread,
    })
  } catch {
    return NextResponse.json({ notifications: [], unread: 0 })
  }
}

// PATCH /api/notifications/inbox — mark all as read
export async function PATCH(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    await connectDB()
    await Notification.updateMany({ userId: session.user.id, read: false }, { $set: { read: true } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
