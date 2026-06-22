import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Handshake } from '@/lib/models/Handshake'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { Application } from '@/lib/models/Application'

/**
 * POST /api/handshakes/[id]/respond  { action: 'accept' | 'decline' }
 * The human candidate decides. On accept, the connection opens: an Application
 * thread is created and the human recruiter is notified that a verified,
 * interested candidate is ready to talk.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { action } = await req.json()
    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await connectDB()
    const hs = await Handshake.findOne({ _id: id, candidateId: session.user.id })
    if (!hs) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (hs.status !== 'surfaced_to_candidate') {
      return NextResponse.json({ error: 'Already responded' }, { status: 400 })
    }

    if (action === 'decline') {
      hs.status = 'candidate_declined'
      hs.exchanges.push({
        from: 'atlas',
        kind: 'note',
        content: 'Candidate declined — Atlas closed the inquiry.',
        evidenceSnapshot: [],
        at: new Date(),
      })
      hs.updatedAt = new Date()
      await hs.save()
      return NextResponse.json({ status: hs.status })
    }

    // ── ACCEPT → open the human connection ──
    const role = await RoleSpec.findById(hs.roleSpecId).lean<{
      recruiterId: string; title: string; company: string; jobTitle?: string
    }>()
    if (!role) return NextResponse.json({ error: 'Role no longer exists' }, { status: 410 })

    const recruiter = await User.findById(role.recruiterId).lean<{
      _id: string; name: string; company?: string; jobTitle?: string; avatarUrl?: string; username?: string
    }>()
    const candidate = await User.findById(session.user.id).lean<{
      _id: string; name: string; username: string; avatarUrl: string
    }>()
    if (!recruiter || !candidate) {
      return NextResponse.json({ error: 'Participant missing' }, { status: 410 })
    }

    const candidateProfile = await Profile.findOne({ userId: candidate._id }).lean<{ targetRole?: string }>()

    // Reuse an existing thread if one already exists for this pair
    let app = await Application.findOne({
      recruiterId: String(recruiter._id),
      candidateId: String(candidate._id),
    })

    const openingMessage = `Hi ${candidate.name?.split(' ')[0] || 'there'} — you matched our ${role.title} role through Intervue and expressed interest. Your verified profile cleared our bar, so let's talk. When works for a quick call?`

    if (!app) {
      app = await Application.create({
        recruiterId: String(recruiter._id),
        candidateId: String(candidate._id),
        recruiterInfo: {
          name: recruiter.name || '',
          company: hs.blind ? (recruiter.company || '') : (role.company || recruiter.company || ''),
          title: recruiter.jobTitle || '',
          avatarUrl: recruiter.avatarUrl || '',
          username: recruiter.username || '',
        },
        candidateInfo: {
          name: candidate.name,
          username: candidate.username,
          avatarUrl: candidate.avatarUrl,
          targetRole: candidateProfile?.targetRole || '',
        },
        jobTitle: role.title,
        status: 'active',
        messages: [
          {
            senderId: String(recruiter._id),
            senderName: recruiter.name || '',
            senderAvatar: recruiter.avatarUrl || '',
            content: openingMessage,
            type: 'text',
            readBy: [String(recruiter._id)],
          },
        ],
      })
    }

    hs.status = 'connected'
    hs.applicationId = String(app._id)
    hs.exchanges.push({
      from: 'atlas',
      kind: 'note',
      content: 'Candidate accepted. Connection opened — humans are now talking.',
      evidenceSnapshot: [],
      at: new Date(),
    })
    hs.updatedAt = new Date()
    await hs.save()

    return NextResponse.json({ status: hs.status, applicationId: String(app._id) })
  } catch (err) {
    console.error('Handshake respond error:', err)
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 })
  }
}
