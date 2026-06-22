/**
 * Certificate OG image — renders a 1200×630 shareable certificate card.
 * Edge runtime for fast global delivery.
 */

export const runtime = 'edge'

import { ImageResponse } from 'next/og'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Fetch cert data from internal API (absolute URL required at edge)
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  let cert: {
    skill: string
    milestone: number
    scoreAtIssuance: number
    userName: string
    issuedAt: string
  } | null = null

  try {
    const res = await fetch(`${base}/api/certificate/${token}/data`, { cache: 'no-store' })
    if (res.ok) cert = await res.json()
  } catch {
    // fall through to default
  }

  const skill = cert?.skill ?? 'Unknown Skill'
  const score = cert?.scoreAtIssuance ?? 0
  const name = cert?.userName ?? 'Verified Developer'
  const label = score >= 85 ? 'Expert' : score >= 70 ? 'Proficient' : 'Intermediate'
  const color = score >= 85 ? '#2DE2C5' : score >= 70 ? '#22D3EE' : '#A78BFA'
  const issuedAt = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0B0D1A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Border frame */}
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            border: `2px solid ${color}30`,
            borderRadius: '24px',
            display: 'flex',
          }}
        />

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: '32px', left: '32px', width: '40px', height: '40px', borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: '4px 0 0 0', display: 'flex' }} />
        <div style={{ position: 'absolute', top: '32px', right: '32px', width: '40px', height: '40px', borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: '0 4px 0 0', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '32px', left: '32px', width: '40px', height: '40px', borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRadius: '0 0 0 4px', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '32px', right: '32px', width: '40px', height: '40px', borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: '0 0 4px 0', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ fontSize: '16px', color: '#888FC0', letterSpacing: '4px', textTransform: 'uppercase' }}>
            INTERVUE · PROOF OF SKILL
          </div>
        </div>

        {/* Milestone badge */}
        <div
          style={{
            background: `${color}15`,
            border: `1px solid ${color}40`,
            borderRadius: '100px',
            padding: '8px 24px',
            marginBottom: '24px',
            display: 'flex',
          }}
        >
          <span style={{ color, fontSize: '15px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
            {label} · Score {score}
          </span>
        </div>

        {/* Main skill name */}
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px', textAlign: 'center', display: 'flex' }}>
          {skill}
        </div>

        {/* Recipient */}
        <div style={{ fontSize: '24px', color: '#AEB5E0', marginBottom: '48px', display: 'flex' }}>
          Certified · {name}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ fontSize: '13px', color: '#555B8A', display: 'flex' }}>Issued {issuedAt}</div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#555B8A', display: 'flex' }} />
          <div style={{ fontSize: '13px', color: '#555B8A', display: 'flex' }}>intervue.in</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
