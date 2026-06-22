import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params
  const url = new URL(req.url)
  const name = url.searchParams.get('name') || 'Candidate'
  const sessions = url.searchParams.get('sessions') || '0'
  const avgScore = url.searchParams.get('avg') || '0'
  const topSkill = url.searchParams.get('skill') || 'General'
  const streak = url.searchParams.get('streak') || '0'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #04050e 0%, #0a0c1a 50%, #0d1128 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: 60,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ fontSize: 14, color: '#2DE2C5', letterSpacing: 4, textTransform: 'uppercase' }}>
            Intervue · {year} Wrapped
          </div>
        </div>

        {/* Name */}
        <div style={{ fontSize: 52, fontWeight: 700, marginBottom: 8 }}>{name}</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 60 }}>
          Here&apos;s your {year} in proof
        </div>

        {/* Stats grid */}
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Sessions', value: sessions, color: '#2DE2C5' },
            { label: 'Avg Score', value: avgScore, color: '#3FC5F0' },
            { label: 'Best Streak', value: `${streak}d`, color: '#8B7CF8' },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '28px 40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top skill */}
        <div style={{
          marginTop: 48,
          background: 'rgba(45,226,197,0.08)',
          border: '1px solid rgba(45,226,197,0.2)',
          borderRadius: 12,
          padding: '12px 32px',
          fontSize: 15,
          color: '#2DE2C5',
        }}>
          Top skill: {topSkill}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
