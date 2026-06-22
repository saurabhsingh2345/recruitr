import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Team } from '@/lib/models/Team'
import { Profile } from '@/lib/models/Profile'

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

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const team = await Team.findById(id)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const memberIndex = team.members.findIndex(
    (m: { userId: { toString(): string } }) => m.userId.toString() === session.user.id,
  )
  if (memberIndex === -1) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const profile = await Profile.findOne({ userId: session.user.id }).select('parsedSkills').lean() as { parsedSkills?: { name: string; proofScore: number }[] } | null
  const skills = (profile?.parsedSkills || [])
    .slice(0, 10)
    .map((s) => ({ name: s.name, proofScore: s.proofScore }))

  team.members[memberIndex].skills = skills
  await team.save()

  return NextResponse.json({ ok: true, skills })
}
