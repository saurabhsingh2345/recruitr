import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'

// GET /api/notifications — unread message count across all threads
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0 })

  try {
    await connectDB()

    const apps = await Application.find({
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
      .select('messages recruiterId candidateId recruiterInfo candidateInfo status updatedAt')
      .lean()

    let count = 0
    const threads = apps.map((a) => {
      const unread = a.messages.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => !m.readBy.includes(session.user.id) && m.senderId !== session.user.id
      ).length
      count += unread
      return {
        _id: String(a._id),
        unread,
        status: a.status,
        updatedAt: a.updatedAt,
        otherParty:
          a.recruiterId === session.user.id
            ? { name: a.candidateInfo.name, username: a.candidateInfo.username, avatarUrl: a.candidateInfo.avatarUrl }
            : { name: a.recruiterInfo.name, username: a.recruiterInfo.username, avatarUrl: a.recruiterInfo.avatarUrl },
        lastMessage: a.messages[a.messages.length - 1] ?? null,
      }
    })

    return NextResponse.json({ count, threads })
  } catch {
    return NextResponse.json({ count: 0, threads: [] })
  }
}
