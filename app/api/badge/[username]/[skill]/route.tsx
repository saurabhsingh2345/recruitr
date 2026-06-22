import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { BadgeEvent } from '@/lib/models/BadgeEvent'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; skill: string }> }
) {
  const { username, skill } = await params

  let score = 0
  let displayName = username

  try {
    await connectDB()
    const user = await User.findOne({ username }).lean()
    if (user) {
      displayName = user.name || username
      const profile = await Profile.findOne({ userId: user._id }).lean()
      if (profile) {
        const found = profile.parsedSkills?.find(
          (s: { name: string }) => s.name.toLowerCase() === decodeURIComponent(skill).toLowerCase()
        )
        if (found) score = Math.round(found.proofScore || 0)
      }
    }
  } catch {
    // return fallback badge on DB error
  }

  // Fire-and-forget serve tracking (sampled 20% to avoid DB bloat on viral badges)
  if (Math.random() < 0.2) {
    const referer = _req.headers.get('referer') || ''
    connectDB()
      .then(() => BadgeEvent.create({ type: 'badge_serve', username, skill: decodeURIComponent(skill), referer, at: new Date() }))
      .catch(() => {})
  }

  const skillName = decodeURIComponent(skill)
  const color = score >= 80 ? '#2DE2C5' : score >= 60 ? '#8B7CF8' : '#f59e0b'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#05060F',
          border: `1.5px solid ${color}40`,
          borderRadius: 14,
          padding: '16px 24px',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: `0 0 24px ${color}20`,
          width: 400,
        }}
      >
        {/* Logo chip */}
        <div
          style={{
            display: 'flex',
            width: 36,
            height: 36,
            borderRadius: 9,
            background: '#2DE2C5',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            color: '#05060F',
            flexShrink: 0,
          }}
        >
          I
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: '#ffffff15' }} />

        {/* Name + skill */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: 12, color: '#AEB5E0', marginBottom: 2 }}>
            {displayName} · intervue verified
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#F8F9FA' }}>
            {skillName}
          </span>
        </div>

        {/* Score */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: 10,
            width: 52,
            height: 44,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{score}</span>
          <span style={{ fontSize: 9, color, opacity: 0.75 }}>/ 100</span>
        </div>
      </div>
    ),
    { width: 400, height: 80 }
  )
}
