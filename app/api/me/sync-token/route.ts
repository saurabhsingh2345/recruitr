import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { randomBytes } from 'crypto'

// GET — return existing token or generate one (idempotent)
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await User.findById(session.user.id).select('syncToken lastSyncAt')
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!user.syncToken) {
    user.syncToken = randomBytes(32).toString('hex')
    await user.save()
  }

  return NextResponse.json({
    token: user.syncToken,
    lastSyncAt: user.lastSyncAt || null,
  })
}

// POST — force-regenerate the token (invalidates all existing workflows)
export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await User.findById(session.user.id)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  user.syncToken = randomBytes(32).toString('hex')
  await user.save()

  return NextResponse.json({ token: user.syncToken, regenerated: true })
}
