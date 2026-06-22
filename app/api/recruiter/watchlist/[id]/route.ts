import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Watchlist } from '@/lib/models/Watchlist'

/** PATCH /api/recruiter/watchlist/[id] — update skill alerts or notes */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { skillAlerts, notes } = await req.json()

  await connectDB()

  const watch = await Watchlist.findOneAndUpdate(
    { _id: id, recruiterId: session.user.id },
    {
      $set: {
        ...(skillAlerts !== undefined ? { skillAlerts } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    },
    { new: true }
  )

  if (!watch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, watchlist: watch })
}
