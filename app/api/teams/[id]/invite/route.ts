import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Team } from '@/lib/models/Team'
import { nanoid } from 'nanoid'

// POST — regenerate invite code
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const team = await Team.findById(id)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (team.ownerId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Only the team owner can regenerate the invite code' }, { status: 403 })
  }

  team.inviteCode = nanoid(8)
  await team.save()

  return NextResponse.json({ inviteCode: team.inviteCode })
}
