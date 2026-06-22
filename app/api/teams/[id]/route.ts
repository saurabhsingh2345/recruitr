import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Team } from '@/lib/models/Team'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const team = await Team.findById(id).lean()
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const isMember = team.members.some((m: { userId: { toString(): string } }) => m.userId.toString() === session.user.id)
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ team })
}
