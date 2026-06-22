/**
 * LiveKit video interview room token endpoint.
 *
 * Prerequisites (not yet installed):
 *   npm install livekit-server-sdk
 *
 * Required env vars:
 *   LIVEKIT_URL        — wss://your-livekit-instance.livekit.cloud
 *   LIVEKIT_API_KEY    — from LiveKit dashboard
 *   LIVEKIT_API_SECRET — from LiveKit dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const LIVEKIT_URL = process.env.LIVEKIT_URL
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

const livekitEnabled = Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET)

// POST /api/interview/room — create or join a LiveKit room for a session
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!livekitEnabled) {
    return NextResponse.json(
      { error: 'Video interviews are not enabled on this instance', code: 'LIVEKIT_NOT_CONFIGURED' },
      { status: 503 }
    )
  }

  const { sessionId, participantName } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

  try {
    // Dynamic import so the server doesn't crash when the package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const livekit = await (new Function('m', 'return import(m)'))('livekit-server-sdk').catch(() => {
      throw new Error('livekit-server-sdk is not installed. Run: npm install livekit-server-sdk')
    })
    const { AccessToken } = livekit as { AccessToken: new (key: string, secret: string, opts: { identity: string; name: string; ttl: string }) => { addGrant: (g: Record<string, unknown>) => void; toJwt: () => Promise<string> } }

    const roomName = `interview-${sessionId}`
    const identity = session.user.id
    const name = participantName || session.user.name || identity

    const token = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity,
      name,
      ttl: '2h',
    })
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    })

    return NextResponse.json({
      token: await token.toJwt(),
      url: LIVEKIT_URL,
      room: roomName,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create room token'
    console.error('[livekit] room token error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
