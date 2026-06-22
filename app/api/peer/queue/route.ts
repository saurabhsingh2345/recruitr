import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { PeerSession } from '@/lib/models/PeerSession'
import { User } from '@/lib/models/User'
import { generateText } from 'ai'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'

// POST /api/peer/queue — join queue or match with waiting session
// body: { skill, format, preferRole?: 'interviewer' | 'candidate' | 'any' }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { skill = 'General', format = 'peer_coding', preferRole = 'any' } = await req.json()

  await connectDB()

  const user = await User.findById(session.user.id).select('name username').lean()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Look for a waiting session this user didn't create, for the same skill/format
  const oppositeRole = preferRole === 'interviewer' ? 'candidate'
    : preferRole === 'candidate' ? 'interviewer'
    : null

  const matchQuery: Record<string, unknown> = {
    skill,
    format,
    status: 'waiting',
    'participants.userId': { $ne: session.user.id },
  }
  if (oppositeRole) {
    matchQuery['participants.role'] = oppositeRole
  }

  const existing = await PeerSession.findOne(matchQuery)

  if (existing) {
    // Assign the user as the other role
    const takenRole = existing.participants[0]?.role
    const myRole = takenRole === 'interviewer' ? 'candidate' : 'interviewer'

    existing.participants.push({
      userId: session.user.id as unknown as import('mongoose').Types.ObjectId,
      name: user.name || '',
      username: user.username || '',
      role: myRole,
      joinedAt: new Date(),
    })
    existing.status = 'active'

    // AI moderator: drop an opening message
    const openingText = await getOpeningMessage(skill, format, existing.participants[0].name, user.name || '')
    existing.messages.push({
      senderUserId: session.user.id as unknown as import('mongoose').Types.ObjectId,
      senderName: 'AI Moderator',
      role: 'ai_moderator',
      content: openingText,
      at: new Date(),
    })
    await existing.save()

    return NextResponse.json({ sessionId: existing._id, role: myRole, status: 'matched' })
  }

  // No match — create a new waiting session
  const myRole = preferRole === 'any' ? 'interviewer' : preferRole
  const peerSession = await PeerSession.create({
    skill,
    format,
    status: 'waiting',
    participants: [
      {
        userId: session.user.id,
        name: user.name || '',
        username: user.username || '',
        role: myRole,
        joinedAt: new Date(),
      },
    ],
    messages: [],
  })

  return NextResponse.json({ sessionId: peerSession._id, role: myRole, status: 'waiting' })
}

async function getOpeningMessage(skill: string, format: string, interviewerName: string, candidateName: string): Promise<string> {
  const formatLabel = format.replace('peer_', '').replace('_', ' ')
  try {
    const { text } = await generateText({
      model: await getModel(),
      system: INTERVIEW_SYSTEM_PROMPT,
      prompt: `You are an AI moderator for a peer ${formatLabel} interview about ${skill}.
${interviewerName} is the interviewer and ${candidateName} is the candidate.
Write a short 2-sentence welcome message that introduces the session, reminds the interviewer to ask one question at a time, and encourages the candidate. Be warm but professional.`,
      maxOutputTokens: 120,
    })
    return text.trim()
  } catch {
    return `Welcome to your peer ${formatLabel} interview on ${skill}! ${interviewerName}, please start with your first question. ${candidateName}, take your time and think aloud.`
  }
}
