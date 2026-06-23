import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/mongodb'
import { VerifiedCard } from '@/lib/models/VerifiedCard'
import { User } from '@/lib/models/User'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    await connectDB()

    const card = await VerifiedCard.findOne({ cardToken: token }).lean() as {
      userId: string; targetRole: string; targetLevel: string
      topSkills: { name: string; score: number; percentile: number }[]
      sessionCount: number; issuedAt: Date
    } | null

    if (!card) {
      return new ImageResponse(
        <div style={{ width: 1200, height: 630, background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#888', fontSize: 24 }}>Card not found</span>
        </div>,
        { width: 1200, height: 630 }
      )
    }

    const user = await User.findById(card.userId).select('name username').lean() as {
      name: string; username: string
    } | null

    const top3 = card.topSkills.slice(0, 3)
    const roleLabel = [card.targetLevel, card.targetRole].filter(Boolean).join(' ')

    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#050508',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#2DE2C5', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: '#2DE2C5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#050508', fontWeight: 900, fontSize: 18 }}>I</span>
            </div>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>intervue</span>
          </div>
          <div style={{ background: 'rgba(45,226,197,0.1)', border: '1px solid rgba(45,226,197,0.3)', borderRadius: 8, padding: '6px 14px', display: 'flex' }}>
            <span style={{ color: '#2DE2C5', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>VERIFIED</span>
          </div>
        </div>

        {/* Candidate name */}
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 20, marginBottom: 8, display: 'flex' }}>
          {user?.name || 'Candidate'}
        </div>

        {/* Role title */}
        <div style={{ color: '#ffffff', fontSize: 56, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: 48, display: 'flex' }}>
          {roleLabel}
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 'auto' }}>
          {top3.map((sk) => (
            <div
              key={sk.name}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 160,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{sk.name}</span>
              <span style={{ color: '#2DE2C5', fontSize: 32, fontWeight: 800, fontFamily: 'monospace' }}>{sk.score}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Top {100 - sk.percentile}%</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            {card.sessionCount} sessions · intervue.dev
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            {new Date(card.issuedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>,
      { width: 1200, height: 630 }
    )
  } catch (err) {
    console.error('OG image error:', err)
    return new ImageResponse(
      <div style={{ width: 1200, height: 630, background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#888', fontSize: 24 }}>Error</span>
      </div>,
      { width: 1200, height: 630 }
    )
  }
}
