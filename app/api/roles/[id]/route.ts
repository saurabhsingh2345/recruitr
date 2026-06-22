import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { Handshake } from '@/lib/models/Handshake'

// GET /api/roles/[id] — role detail + its handshakes (recruiter view)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await connectDB()
    const role = await RoleSpec.findOne({ _id: id, recruiterId: session.user.id }).lean()
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const handshakes = await Handshake.find({ roleSpecId: id })
      .sort({ 'verdict.score': -1, updatedAt: -1 })
      .lean()

    return NextResponse.json({ role, handshakes })
  } catch (err) {
    console.error('Role detail error:', err)
    return NextResponse.json({ error: 'Failed to load role' }, { status: 500 })
  }
}

// PATCH /api/roles/[id] — edit the bar or status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    await connectDB()

    const allowed = [
      'title', 'seniority', 'mustHave', 'niceHave', 'compMinLpa', 'compMaxLpa',
      'locations', 'stage', 'domain', 'teamContext', 'dealbreakers', 'blind', 'status',
    ]
    const update: Record<string, unknown> = { updatedAt: new Date() }
    for (const f of allowed) if (body[f] !== undefined) update[f] = body[f]

    const role = await RoleSpec.findOneAndUpdate(
      { _id: id, recruiterId: session.user.id },
      update,
      { new: true }
    )
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ role })
  } catch (err) {
    console.error('Role update error:', err)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

// DELETE /api/roles/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await connectDB()
    await RoleSpec.deleteOne({ _id: id, recruiterId: session.user.id })
    await Handshake.deleteMany({ roleSpecId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Role delete error:', err)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
