import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'
import { Types } from 'mongoose'

export const runtime = 'nodejs'

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Live Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-Dive',
  behavioural: 'Behavioural',
  gap: 'Gap Session',
  pm_case: 'Product Case',
  design_critique: 'Design Critique',
  ops_case: 'Operations Case',
  sales_discovery: 'Sales Discovery',
}

function scoreColor(s: number): string {
  if (s >= 80) return '#2DE2C5'
  if (s >= 65) return '#3FC5F0'
  if (s >= 50) return '#f59e0b'
  return '#f43f5e'
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()
    if (!Types.ObjectId.isValid(id)) return new Response('Not found', { status: 404 })

    const session = (await InterviewSession.findById(id)
      .select('format targetSkill scores status rigorConditions userId completedAt')
      .lean()) as {
      format?: string
      targetSkill?: string
      scores?: { overall?: number; breakdown?: Record<string, number> }
      status?: string
      rigorConditions?: { fullScreenEnforced?: boolean; faceDetectionActive?: boolean }
      userId?: unknown
    } | null

    if (!session || session.status !== 'completed') return new Response('Not found', { status: 404 })

    const overall = Math.round(session.scores?.overall || 0)
    const color = scoreColor(overall)
    const formatLabel = FORMAT_LABELS[session.format || ''] || 'Interview'
    const breakdown = Object.entries(session.scores?.breakdown || {})
      .map(([k, v]) => ({ k, v: Math.round(Number(v) || 0) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
    const proctored = !!(session.rigorConditions?.fullScreenEnforced || session.rigorConditions?.faceDetectionActive)

    let name = 'A candidate'
    if (session.userId) {
      const user = (await User.findById(session.userId).select('name username').lean()) as
        | { name?: string; username?: string }
        | null
      name = user?.name || user?.username || name
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: '#0A0A0B',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            fontFamily: '"Courier New", Courier, monospace',
            position: 'relative',
            padding: '64px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              left: '120px',
              width: '600px',
              height: '320px',
              background: `radial-gradient(ellipse at center, ${color}22 0%, transparent 70%)`,
            }}
          />
          {/* Left: score ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '420px' }}>
            <div
              style={{
                width: 280,
                height: 280,
                borderRadius: 280,
                border: `12px solid ${color}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: 120, fontWeight: 700, color: '#FAFAFA', lineHeight: 1 }}>{overall}</div>
              <div style={{ fontSize: 22, color: '#71717A', marginTop: 6 }}>/ 100</div>
            </div>
            <div style={{ fontSize: 22, color, marginTop: 24, letterSpacing: '1px' }}>{formatLabel}</div>
          </div>

          {/* Right: detail */}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '48px', flex: 1 }}>
            <div style={{ fontSize: 18, color: '#2DE2C5', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Verified Interview Proof
            </div>
            <div style={{ fontSize: 44, fontWeight: 700, color: '#FAFAFA', marginTop: 14, lineHeight: 1.1 }}>
              {session.targetSkill || 'Interview'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
              {breakdown.map((b) => (
                <div key={b.k} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#A1A1AA' }}>
                    <span>{b.k.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#FAFAFA' }}>{b.v}</span>
                  </div>
                  <div style={{ width: 480, height: 8, background: '#1A1A1F', borderRadius: 8, marginTop: 6, display: 'flex' }}>
                    <div style={{ width: (480 * b.v) / 100, height: 8, background: scoreColor(b.v), borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 36 }}>
              <span style={{ fontSize: 20, color: '#71717A' }}>{name}</span>
              {proctored && (
                <span style={{ fontSize: 14, color: '#2DE2C5', border: '1px solid #2DE2C5', borderRadius: 6, padding: '4px 10px' }}>
                  PROCTORED
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 36,
              right: 48,
              fontSize: 13,
              color: '#3F3F46',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            INTERVUE.IN
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch {
    return new Response('Failed to generate receipt', { status: 500 })
  }
}
