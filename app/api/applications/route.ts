import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'

// GET /api/applications — list threads for current user (recruiter or candidate)
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const apps = await Application.find({
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
      .sort({ updatedAt: -1 })
      .lean()

    // Attach unread count per thread for the current user
    const result = apps.map((a) => ({
      ...a,
      unreadCount: a.messages.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m: any) => !m.readBy.includes(session.user.id) && m.senderId !== session.user.id
      ).length,
      lastMessage: a.messages[a.messages.length - 1] ?? null,
    }))

    return NextResponse.json({ applications: result })
  } catch (err) {
    console.error('Applications list error:', err)
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
}

// POST /api/applications — recruiter starts a new thread
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { candidateUsername, message, jobTitle, company, title } = await req.json()
    if (!candidateUsername || !message) {
      return NextResponse.json({ error: 'candidateUsername and message required' }, { status: 400 })
    }

    await connectDB()

    const recruiter = await User.findById(session.user.id).lean()
    const candidate = await User.findOne({ username: candidateUsername }).lean()
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    if (String(recruiter?._id) === String(candidate._id)) {
      return NextResponse.json({ error: 'Cannot contact yourself' }, { status: 400 })
    }

    // One active thread per recruiter↔candidate pair
    const existing = await Application.findOne({
      recruiterId: String(recruiter?._id),
      candidateId: String(candidate._id),
    })
    if (existing) {
      return NextResponse.json({ applicationId: String(existing._id), alreadyExists: true })
    }

    const candidateProfile = await Profile.findOne({ userId: candidate._id }).lean()

    const app = await Application.create({
      recruiterId: String(recruiter?._id),
      candidateId: String(candidate._id),
      recruiterInfo: {
        name: recruiter?.name || session.user.name || '',
        company: company || recruiter?.company || '',
        title: title || recruiter?.jobTitle || '',
        avatarUrl: recruiter?.avatarUrl || session.user.image || '',
        username: recruiter?.username || '',
      },
      candidateInfo: {
        name: candidate.name,
        username: candidate.username,
        avatarUrl: candidate.avatarUrl,
        targetRole: (candidateProfile as { targetRole?: string })?.targetRole || '',
      },
      jobTitle: jobTitle || '',
      messages: [
        {
          senderId: String(recruiter?._id),
          senderName: recruiter?.name || session.user.name || '',
          senderAvatar: recruiter?.avatarUrl || '',
          content: message,
          type: 'text',
          readBy: [String(recruiter?._id)],
        },
      ],
    })

    return NextResponse.json({ applicationId: String(app._id) })
  } catch (err) {
    console.error('Application create error:', err)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
