import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { PeerSession, type IPeerMessage } from '@/lib/models/PeerSession'
import { generateText } from 'ai'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import type { Types } from 'mongoose'

type Params = { params: Promise<{ sessionId: string }> }

interface LeanParticipant {
  userId: Types.ObjectId
  name: string
  username: string
  role: 'interviewer' | 'candidate'
}

// GET — poll for messages (returns messages after a given offset)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const url = new URL(req.url)
  const after = parseInt(url.searchParams.get('after') || '0', 10)

  await connectDB()

  const peer = await PeerSession.findById(sessionId).lean()
  if (!peer) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const isMember = (peer.participants as LeanParticipant[]).some(p => p.userId.toString() === session.user.id)
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({
    status: peer.status,
    messages: peer.messages.slice(after),
    total: peer.messages.length,
    participants: (peer.participants as LeanParticipant[]).map(p => ({
      name: p.name,
      username: p.username,
      role: p.role,
      isMe: p.userId.toString() === session.user.id,
    })),
  })
}

// POST — send a message
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const { content } = await req.json()

  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  await connectDB()

  const peer = await PeerSession.findById(sessionId)
  if (!peer) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (peer.status !== 'active') return NextResponse.json({ error: 'Session is not active' }, { status: 400 })

  const sender = peer.participants.find((p: { userId: Types.ObjectId }) => p.userId.toString() === session.user.id)
  if (!sender) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  peer.messages.push({
    senderUserId: session.user.id as unknown as import('mongoose').Types.ObjectId,
    senderName: sender.name,
    role: sender.role,
    content: content.trim(),
    at: new Date(),
  })

  // AI moderation every 6 messages (non-intrusive coaching)
  const humanMessages = peer.messages.filter((m: IPeerMessage) => m.role !== 'ai_moderator')
  if (humanMessages.length > 0 && humanMessages.length % 6 === 0) {
    const moderatorNote = await getModerationNote(peer.skill, peer.messages.slice(-12) as IPeerMessage[])
    if (moderatorNote) {
      peer.messages.push({
        senderUserId: session.user.id as unknown as import('mongoose').Types.ObjectId,
        senderName: 'AI Moderator',
        role: 'ai_moderator',
        content: moderatorNote,
        at: new Date(),
      })
    }
  }

  await peer.save()
  return NextResponse.json({ ok: true, total: peer.messages.length })
}

// PATCH — end session
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const { interviewerScore } = await req.json()

  await connectDB()

  const peer = await PeerSession.findById(sessionId)
  if (!peer) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const isParticipant = peer.participants.some((p: { userId: Types.ObjectId }) => p.userId.toString() === session.user.id)
  if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  peer.status = 'completed'
  peer.completedAt = new Date()
  if (typeof interviewerScore === 'number') {
    peer.interviewerScore = Math.min(100, Math.max(0, interviewerScore))
  }

  // Generate AI summary
  const transcript = peer.messages
    .filter((m: IPeerMessage) => m.role !== 'ai_moderator')
    .map((m: IPeerMessage) => `${m.senderName} (${m.role}): ${m.content}`)
    .join('\n')
  if (transcript.length > 0) {
    try {
      const { text } = await generateText({
        model: await getModel(),
        system: INTERVIEW_SYSTEM_PROMPT,
        prompt: `Summarize this peer interview in 3 sentences: what the candidate demonstrated well, one area to improve, and one tip for the interviewer. Be specific.

Transcript:
${transcript.slice(0, 3000)}`,
        maxOutputTokens: 180,
      })
      peer.aiSummary = text.trim()
    } catch {
      peer.aiSummary = 'Session completed.'
    }
  }

  await peer.save()
  return NextResponse.json({ ok: true, aiSummary: peer.aiSummary })
}

async function getModerationNote(
  skill: string,
  recentMessages: IPeerMessage[],
): Promise<string> {
  const excerpt = recentMessages
    .filter((m: IPeerMessage) => m.role !== 'ai_moderator')
    .map((m: IPeerMessage) => `${m.senderName}: ${m.content}`)
    .join('\n')
  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt: `You are an AI moderator observing a peer interview about ${skill}. Based on this excerpt, give a single short coaching tip (1 sentence, max 100 chars) for either the interviewer or the candidate. If things are going well, skip the note by responding with exactly "ok".

Excerpt:
${excerpt}`,
      maxOutputTokens: 80,
    })
    const trimmed = text.trim()
    return trimmed === 'ok' ? '' : trimmed
  } catch {
    return ''
  }
}
