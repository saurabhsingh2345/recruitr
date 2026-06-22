import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { User } from '@/lib/models/User'
import { Handshake } from '@/lib/models/Handshake'
import { scoutStructureRole } from '@/lib/agents/scout'

// GET /api/roles — list the recruiter's roles (with surfaced-candidate counts)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const roles = await RoleSpec.find({ recruiterId: session.user.id })
      .sort({ updatedAt: -1 })
      .lean()

    // attach surfaced count per role
    const withCounts = await Promise.all(
      roles.map(async (r) => {
        const surfaced = await Handshake.countDocuments({
          roleSpecId: r._id.toString(),
          status: { $in: ['surfaced_to_candidate', 'candidate_accepted', 'connected'] },
        })
        const accepted = await Handshake.countDocuments({
          roleSpecId: r._id.toString(),
          status: { $in: ['candidate_accepted', 'connected'] },
        })
        return { ...r, surfacedCount: surfaced, acceptedCount: accepted }
      })
    )

    return NextResponse.json({ roles: withCounts })
  } catch (err) {
    console.error('Roles list error:', err)
    return NextResponse.json({ error: 'Failed to load roles' }, { status: 500 })
  }
}

// POST /api/roles — recruiter creates a role; Scout structures the bar
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { rawJd, title, blind } = await req.json()
    if (!rawJd?.trim() && !title?.trim()) {
      return NextResponse.json({ error: 'Provide a job description or title' }, { status: 400 })
    }

    await connectDB()
    const recruiter = await User.findById(session.user.id).select('company').lean<{ company?: string }>()
    const company = recruiter?.company || ''

    // Scout structures the JD into a bar
    const structured = await scoutStructureRole(rawJd || title, company)

    const role = await RoleSpec.create({
      recruiterId: session.user.id,
      company,
      title: structured.title || title || 'Untitled role',
      seniority: structured.seniority,
      rawJd: rawJd || '',
      mustHave: structured.mustHave,
      niceHave: structured.niceHave,
      compMinLpa: structured.compMinLpa,
      compMaxLpa: structured.compMaxLpa,
      locations: structured.locations,
      stage: structured.stage,
      domain: structured.domain,
      teamContext: structured.teamContext,
      dealbreakers: structured.dealbreakers,
      blind: !!blind,
      status: 'active',
    })

    return NextResponse.json({ role })
  } catch (err) {
    console.error('Role create error:', err)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
