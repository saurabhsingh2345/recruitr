import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  try {
    await connectDB()
    const user = await User.findOne({ username }).lean() as { name?: string; username?: string } | null
    if (!user) {
      return new Response('Not found', { status: 404 })
    }
    const profile = await Profile.findOne({ userId: (user as { _id: unknown })._id, isPublic: true })
      .select('parsedSkills cohortPercentile targetRole')
      .lean() as { parsedSkills?: { name: string; proofScore: number }[]; cohortPercentile?: number; targetRole?: string } | null

    const rank = profile?.cohortPercentile ? 100 - profile.cohortPercentile : null
    const skills = ((profile?.parsedSkills || []) as { name: string; proofScore: number }[])
      .sort((a, b) => b.proofScore - a.proofScore)
    const topSkill = skills[0]

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: '#0A0A0B',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Courier New", Courier, monospace',
            position: 'relative',
          }}
        >
          {/* Subtle teal glow top */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              height: '300px',
              background: 'radial-gradient(ellipse at center, rgba(45,212,191,0.12) 0%, transparent 70%)',
            }}
          />

          {/* The number */}
          {rank !== null ? (
            <div style={{ fontSize: 148, fontWeight: 700, color: '#FAFAFA', lineHeight: 1, letterSpacing: '-4px' }}>
              Top {rank}%
            </div>
          ) : (
            <div style={{ fontSize: 148, fontWeight: 700, color: '#FAFAFA', lineHeight: 1 }}>
              Verified
            </div>
          )}

          {/* Skill context */}
          {topSkill && (
            <div style={{ fontSize: 28, color: '#2DD4BF', marginTop: 20, letterSpacing: '1px' }}>
              {topSkill.name} · {topSkill.proofScore}/100
            </div>
          )}

          {/* Second skill row */}
          {skills.length > 1 && (
            <div style={{ display: 'flex', gap: '24px', marginTop: 12 }}>
              {skills.slice(1, 4).map((s) => (
                <span key={s.name} style={{ fontSize: 16, color: '#52525B', letterSpacing: '0.5px' }}>
                  {s.name} {s.proofScore}
                </span>
              ))}
            </div>
          )}

          {/* Identity */}
          <div style={{ fontSize: 20, color: '#71717A', marginTop: 32 }}>
            {user.name || username} · Verified by Intervue
          </div>

          {/* URL */}
          <div style={{ fontSize: 14, color: '#3F3F46', marginTop: 12, letterSpacing: '1px' }}>
            intervue.in/p/{username}
          </div>

          {/* Intervue logo text bottom-right */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              right: 48,
              fontSize: 13,
              color: '#27272A',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            INTERVUE
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch {
    return new Response('Failed to generate rank card', { status: 500 })
  }
}
