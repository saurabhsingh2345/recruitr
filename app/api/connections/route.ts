import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { SOURCES } from '@/lib/sources'

// GET /api/connections — the source catalog + this user's connections
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const user = await User.findById(session.user.id).select('connections username').lean<{
      connections?: unknown[]; username?: string
    }>()

    const connections = user?.connections || []
    // GitHub is implicitly connected via login
    const hasGithub = connections.some((c) => (c as { source: string }).source === 'github')
    if (!hasGithub && user?.username) {
      connections.unshift({
        source: 'github', handle: user.username, status: 'connected',
        summary: 'Connected via login', lastSyncedAt: null,
      })
    }

    return NextResponse.json({ sources: SOURCES, connections })
  } catch (err) {
    console.error('Connections list error:', err)
    return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
  }
}

// POST /api/connections — add/update a source handle
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { source, handle } = await req.json()
    if (!source || !handle?.trim()) {
      return NextResponse.json({ error: 'source and handle required' }, { status: 400 })
    }
    if (!SOURCES.some((s) => s.id === source)) {
      return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(session.user.id)
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = user.connections.find((c: { source: string }) => c.source === source)
    if (existing) {
      existing.handle = handle.trim()
      existing.status = 'connected'
    } else {
      user.connections.push({ source, handle: handle.trim(), status: 'connected', summary: '', lastSyncedAt: null })
    }
    await user.save()

    return NextResponse.json({ success: true, connections: user.connections })
  } catch (err) {
    console.error('Connection add error:', err)
    return NextResponse.json({ error: 'Failed to add connection' }, { status: 500 })
  }
}

// DELETE /api/connections?source=devto
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const source = req.nextUrl.searchParams.get('source')
  if (!source) return NextResponse.json({ error: 'source required' }, { status: 400 })

  try {
    await connectDB()
    await User.findByIdAndUpdate(session.user.id, { $pull: { connections: { source } } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Connection delete error:', err)
    return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 })
  }
}
