import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Team } from '@/lib/models/Team'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

// POST /api/teams/join { inviteCode }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await req.json()
  if (!inviteCode) return NextResponse.json({ error: 'inviteCode required' }, { status: 400 })

  await connectDB()

  const team = await Team.findOne({ inviteCode })
  if (!team) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  const alreadyMember = team.members.some((m: { userId: { toString(): string } }) => m.userId.toString() === session.user.id)
  if (alreadyMember) return NextResponse.json({ teamId: team._id, alreadyMember: true })

  if (team.members.length >= 20) {
    return NextResponse.json({ error: 'Team is full (max 20 members)' }, { status: 400 })
  }

  const [user, profile] = await Promise.all([
    User.findById(session.user.id).select('name username').lean(),
    Profile.findOne({ userId: session.user.id }).select('parsedSkills').lean(),
  ])

  team.members.push({
    userId: session.user.id as unknown as import('mongoose').Types.ObjectId,
    name: user?.name || '',
    username: user?.username || '',
    joinedAt: new Date(),
    skills: (profile?.parsedSkills || []).slice(0, 8).map((s: { name: string; proofScore: number }) => ({
      name: s.name,
      proofScore: s.proofScore,
    })),
  })
  await team.save()

  return NextResponse.json({ teamId: team._id })
}
