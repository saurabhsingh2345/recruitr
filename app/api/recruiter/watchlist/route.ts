import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Watchlist } from '@/lib/models/Watchlist'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'

/** GET /api/recruiter/watchlist — list saved candidates with their current scores */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watches = await Watchlist.find({ recruiterId: session.user.id })
    .sort({ addedAt: -1 })
    .lean<any[]>()

  const enriched = await Promise.all(
    watches.map(async (w) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await User.findById(w.candidateId)
        .select('name username avatarUrl discoverability')
        .lean<any>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = await Profile.findOne({ userId: w.candidateId })
        .select('parsedSkills cohortPercentile targetRole')
        .lean<any>()
      return { ...w, candidate: user, profile }
    })
  )

  return NextResponse.json({ watchlist: enriched })
}

/** POST /api/recruiter/watchlist — add a candidate to watchlist */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { candidateId, roleSpecId, notes, skillAlerts } = await req.json()
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  await connectDB()

  const watch = await Watchlist.findOneAndUpdate(
    { recruiterId: session.user.id, candidateId },
    {
      $set: {
        recruiterId: session.user.id,
        candidateId,
        roleSpecId: roleSpecId || null,
        notes: notes || '',
        statusAlert: true,
      },
      $setOnInsert: { addedAt: new Date(), skillAlerts: skillAlerts || [] },
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ success: true, watchlist: watch })
}

/** DELETE /api/recruiter/watchlist?candidateId=... — remove from watchlist */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const candidateId = searchParams.get('candidateId')
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

  await connectDB()
  await Watchlist.deleteOne({ recruiterId: session.user.id, candidateId })
  return NextResponse.json({ success: true })
}
