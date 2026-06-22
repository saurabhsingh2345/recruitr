import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Team } from '@/lib/models/Team'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { nanoid } from 'nanoid'

// GET /api/teams — list teams the current user belongs to
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const teams = await Team.find({ 'members.userId': session.user.id })
    .select('name inviteCode members ownerId createdAt')
    .lean()

  return NextResponse.json({ teams })
}

// POST /api/teams — create a team
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Team name must be at least 2 characters' }, { status: 400 })
  }

  await connectDB()
  const [user, profile] = await Promise.all([
    User.findById(session.user.id).select('name username').lean(),
    Profile.findOne({ userId: session.user.id }).select('parsedSkills').lean(),
  ])

  const inviteCode = nanoid(8)
  const team = await Team.create({
    name: name.trim(),
    ownerId: session.user.id,
    inviteCode,
    members: [
      {
        userId: session.user.id,
        name: user?.name || '',
        username: user?.username || '',
        joinedAt: new Date(),
        skills: (profile?.parsedSkills || []).slice(0, 8).map((s: { name: string; proofScore: number }) => ({
          name: s.name,
          proofScore: s.proofScore,
        })),
      },
    ],
  })

  return NextResponse.json({ teamId: team._id, inviteCode })
}
