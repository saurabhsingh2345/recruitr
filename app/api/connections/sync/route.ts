import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { enqueueSync } from '@/lib/queue'
import { runConnectionSync } from '@/lib/jobs/syncConnections'

export const maxDuration = 60

/**
 * POST /api/connections/sync
 *
 * Auth: session cookie (web app) OR Authorization: Bearer <syncToken> (GitHub Action).
 * The syncToken is a free feature — gating it would break the distribution flywheel.
 *
 * On completion, updates User.lastSyncAt so the Settings page can show "Last synced X ago".
 */
export async function POST(req: NextRequest) {
  await connectDB()

  let userId: string | null = null

  // Bearer token path (GitHub Action / CI)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token) return NextResponse.json({ error: 'Empty token' }, { status: 401 })

    const user = await User.findOne({ syncToken: token }).select('_id').lean()
    if (!user) return NextResponse.json({ error: 'Invalid sync token' }, { status: 401 })
    userId = String(user._id)
  }

  // Session cookie path (web app)
  if (!userId) {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = session.user.id
  }

  try {
    const jobId = await enqueueSync(userId)

    // Update lastSyncAt immediately (even if queued, the trigger time is what matters)
    await User.findByIdAndUpdate(userId, { lastSyncAt: new Date() })

    if (jobId) {
      return NextResponse.json({ queued: true, jobId })
    }

    const result = await runConnectionSync(userId)
    return NextResponse.json({ queued: false, ...result })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
