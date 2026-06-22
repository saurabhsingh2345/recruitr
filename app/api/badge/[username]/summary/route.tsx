import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getScoreColor } from '@/lib/scoring'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  let topSkills: { name: string; score: number }[] = []
  let displayName = username

  try {
    await connectDB()
    const user = await User.findOne({ username }).lean() as { _id: unknown; name: string } | null
    if (user) {
      displayName = user.name || username
      const profile = await Profile.findOne({ userId: user._id })
        .select('parsedSkills')
        .lean() as { parsedSkills: { name: string; proofScore: number }[] } | null
      if (profile?.parsedSkills) {
        topSkills = profile.parsedSkills
          .sort((a, b) => b.proofScore - a.proofScore)
          .slice(0, 3)
          .map((s) => ({ name: s.name, score: Math.round(s.proofScore) }))
      }
    }
  } catch {
    // return fallback badge
  }

  const chips = topSkills.length > 0
    ? topSkills
    : [{ name: 'No skills yet', score: 0 }]

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#05060F',
          border: '1.5px solid rgba(45,226,197,0.25)',
          borderRadius: 14,
          padding: '14px 20px',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 0 24px rgba(45,226,197,0.10)',
          width: 600,
          height: 80,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#2DE2C5',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 15,
            color: '#05060F',
            flexShrink: 0,
          }}
        >
          I
        </div>

        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#AEB5E0' }}>{displayName}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>intervue verified</span>
        </div>

        {/* Skill chips */}
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {chips.map(({ name, score }) => {
            const color = getScoreColor(score)
            return (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: `${color}12`,
                  border: `1px solid ${color}35`,
                  borderRadius: 8,
                  padding: '4px 10px',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#F8F9FA' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'monospace' }}>{score}</span>
              </div>
            )
          })}
        </div>

        {/* Verified mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)' }}>intervue.in</span>
        </div>
      </div>
    ),
    { width: 600, height: 80 }
  )
}
