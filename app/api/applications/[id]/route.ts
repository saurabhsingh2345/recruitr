import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'

// GET /api/applications/[id] — get full thread (marks messages as read)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await connectDB()

    const app = await Application.findOne({
      _id: id,
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Mark unread messages as read
    let dirty = false
    for (const msg of app.messages) {
      if (!msg.readBy.includes(session.user.id) && msg.senderId !== session.user.id) {
        msg.readBy.push(session.user.id)
        dirty = true
      }
    }
    if (dirty) await app.save()

    return NextResponse.json({ application: app.toObject() })
  } catch (err) {
    console.error('Application get error:', err)
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 })
  }
}

// PATCH /api/applications/[id] — update status (kanban drag)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  const allowed = ['active', 'screening', 'interview_scheduled', 'offer_extended', 'hired', 'rejected', 'withdrawn']
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  try {
    await connectDB()
    await Application.findOneAndUpdate(
      { _id: id, $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }] },
      { status }
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Application patch error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
