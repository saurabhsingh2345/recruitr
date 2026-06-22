/**
 * Open Proof API v1 — public read-only endpoint.
 * Rate limited to 100 requests per hour per IP using Upstash Redis sliding window.
 * Returns proof score, label, evidence, and score history for a given skill.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getScoreLabel, getScoreColor } from '@/lib/scoring'
import { Redis } from '@upstash/redis'

const RATE_LIMIT = 100 // requests per hour per IP
const WINDOW_SECONDS = 3600

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedisClient()
  if (!redis) return { allowed: true, remaining: RATE_LIMIT }

  const key = `ratelimit:v1:${ip}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - WINDOW_SECONDS

  // Sliding window using sorted set
  const pipe = redis.pipeline()
  pipe.zremrangebyscore(key, 0, windowStart)
  pipe.zadd(key, { score: now, member: `${now}:${Math.random()}` })
  pipe.zcard(key)
  pipe.expire(key, WINDOW_SECONDS)
  const results = await pipe.exec()

  const count = (results[2] as number) || 0
  const remaining = Math.max(0, RATE_LIMIT - count)
  return { allowed: count <= RATE_LIMIT, remaining }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string; skill: string }> }
) {
  // Rate limiting by IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { allowed, remaining } = await checkRateLimit(ip)

  const headers = {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
  }

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: WINDOW_SECONDS },
      { status: 429, headers: { ...headers, 'Retry-After': String(WINDOW_SECONDS) } }
    )
  }

  const { username, skill } = await params

  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findOne({ username }).select('_id discoverability').lean<any>()
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  if (user.discoverability === 'invisible') {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId: user._id }).select('parsedSkills').lean<any>()
  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  }

  const skillData = (profile.parsedSkills || []).find(
    (s: { name: string }) => s.name.toLowerCase() === skill.toLowerCase()
  )

  if (!skillData) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404, headers })
  }

  const proofScore = skillData.proofScore ?? 0
  const history = (skillData.scoreHistory || [])
    .slice(-10)
    .map((h: { score: number; source: string; at: string }) => ({
      score: h.score,
      source: h.source,
      at: h.at,
    }))

  return NextResponse.json(
    {
      username,
      skill: skillData.name,
      proofScore,
      label: getScoreLabel(proofScore),
      color: getScoreColor(proofScore),
      evidence: (skillData.evidence || []).slice(0, 5),
      scoreHistory: history,
      lastUpdated: skillData.lastUpdated || null,
      proofUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/proof/${username}/${skill}`,
    },
    { status: 200, headers }
  )
}

// CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
