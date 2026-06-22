import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { enqueueSourcing } from '@/lib/queue'
import { runSourcing } from '@/lib/jobs/runSourcing'

export const maxDuration = 60

/**
 * POST /api/roles/[id]/source
 * Scout sources the verified pool and runs the Handshake Protocol against each
 * candidate. Queued via BullMQ when REDIS_URL is set; inline otherwise.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    const asks: string[] = Array.isArray(body.asks) ? body.asks.slice(0, 5) : []

    await connectDB()
    const role = await RoleSpec.findOne({ _id: id, recruiterId: session.user.id }).select('_id')
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const jobId = await enqueueSourcing(id, session.user.id, asks)
    if (jobId) {
      return NextResponse.json({ queued: true, jobId })
    }
    // Inline fallback (no Redis configured)
    const result = await runSourcing(id, session.user.id, asks)
    return NextResponse.json({ queued: false, ...result })
  } catch (err) {
    console.error('Sourcing error:', err)
    return NextResponse.json({ error: 'Sourcing failed' }, { status: 500 })
  }
}
