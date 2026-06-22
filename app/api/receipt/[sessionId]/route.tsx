import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  try {
    await connectDB()
    const session = await InterviewSession.findById(sessionId)
      .select('userId format targetSkill scores scoreUpdate insightReport completedAt')
      .lean() as {
        userId: unknown
        format: string
        targetSkill: string
        scores: { overall: number }
        scoreUpdate: { skill: string; before: number; after: number; delta: number }
        insightReport: { aiVerdict: string }
        completedAt: Date
      } | null

    if (!session || !session.scores?.overall) {
      return new Response('Not found', { status: 404 })
    }

    const user = await User.findById(session.userId).select('name username').lean() as { name?: string; username?: string } | null
    const score = session.scores.overall
    const delta = session.scoreUpdate?.delta ?? 0
    const format = (session.format || '').replace(/_/g, ' ')
    const verdict = session.insightReport?.aiVerdict || ''
    const dateStr = session.completedAt
      ? new Date(session.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

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
            padding: '60px',
          }}
        >
          {/* Teal glow */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '500px',
              height: '250px',
              background: 'radial-gradient(ellipse at center, rgba(45,212,191,0.10) 0%, transparent 70%)',
            }}
          />

          {/* Top row: date + verified badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '48px' }}>
            <span style={{ fontSize: 14, color: '#52525B', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Intervue · {dateStr}
            </span>
            <span style={{ fontSize: 13, color: '#2DD4BF', letterSpacing: '2px', textTransform: 'uppercase', border: '1px solid rgba(45,212,191,0.3)', padding: '4px 12px', borderRadius: '4px' }}>
              Verified
            </span>
          </div>

          {/* Score */}
          <div style={{ fontSize: 140, fontWeight: 700, color: '#FAFAFA', lineHeight: 1, letterSpacing: '-4px' }}>
            {score}
          </div>

          {/* Format + skill */}
          <div style={{ fontSize: 22, color: '#71717A', marginTop: 16, letterSpacing: '1px' }}>
            {format} · {session.targetSkill}
          </div>

          {/* Score delta */}
          {delta > 0 && (
            <div style={{ fontSize: 18, color: '#2DD4BF', marginTop: 14 }}>
              {session.scoreUpdate.skill} {session.scoreUpdate.before} → {session.scoreUpdate.after}
              <span style={{ fontSize: 16, color: 'rgba(45,212,191,0.6)', marginLeft: '8px' }}>+{delta}</span>
            </div>
          )}

          {/* AI verdict */}
          {verdict && (
            <div style={{ fontSize: 16, color: '#52525B', marginTop: 28, fontStyle: 'italic', textAlign: 'center', maxWidth: '700px', lineHeight: 1.6 }}>
              &quot;{verdict}&quot;
            </div>
          )}

          {/* Identity */}
          {user && (
            <div style={{ fontSize: 16, color: '#3F3F46', marginTop: 40, letterSpacing: '1px' }}>
              {user.name || user.username} · intervue.in
            </div>
          )}
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch {
    return new Response('Failed to generate receipt image', { status: 500 })
  }
}
