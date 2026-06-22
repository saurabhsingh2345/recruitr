import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Handshake } from '@/lib/models/Handshake'

/**
 * GET /api/handshakes
 * Candidate view: opportunities Atlas surfaced (genuine fits only) + their status.
 * Recruiter view (?role=ID): all handshakes for one role.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleId = req.nextUrl.searchParams.get('role')

  try {
    await connectDB()

    if (roleId) {
      const handshakes = await Handshake.find({
        roleSpecId: roleId,
        recruiterId: session.user.id,
      })
        .sort({ 'verdict.score': -1 })
        .lean()
      return NextResponse.json({ handshakes })
    }

    // Candidate: only fits Atlas surfaced (never show silent declines as noise)
    const handshakes = await Handshake.find({
      candidateId: session.user.id,
      status: { $in: ['surfaced_to_candidate', 'candidate_accepted', 'candidate_declined', 'connected'] },
    })
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({ handshakes })
  } catch (err) {
    console.error('Handshakes list error:', err)
    return NextResponse.json({ error: 'Failed to load handshakes' }, { status: 500 })
  }
}
