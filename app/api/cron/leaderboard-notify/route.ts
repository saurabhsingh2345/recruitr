/**
 * Cron: weekly leaderboard notification.
 * Runs Monday 09:00 UTC (one hour after weekly-brief).
 * For each skill in the top 20, finds candidates who made the board
 * for the first time this week and sends them an email.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { LeaderboardAlert } from '@/lib/models/LeaderboardAlert'
import { createNotification } from '@/lib/notifications'
import { Resend } from 'resend'
import type { PipelineStage } from 'mongoose'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://intervue.in'

export const maxDuration = 60

const SKILLS_TO_CHECK = [
  'Go', 'TypeScript', 'Python', 'Rust', 'React', 'Node.js', 'Kubernetes', 'Java', 'System Design',
]

const CITIES_TO_CHECK = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune',
]

function getThisMonday(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  return d
}

async function getTop20ForSkill(skill: string | null, city?: string) {
  const pipeline: PipelineStage[] = [
    { $match: { isPublic: true } },
  ]

  if (skill) {
    pipeline.push({
      $match: {
        parsedSkills: { $elemMatch: { name: { $regex: skill, $options: 'i' } } },
      },
    })
  }

  if (city) {
    pipeline.push({ $match: { location: { $regex: city, $options: 'i' } } })
  }

  pipeline.push(
    {
      $addFields: {
        sortScore: skill
          ? {
              $let: {
                vars: {
                  sk: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$parsedSkills',
                          as: 's',
                          cond: { $regexMatch: { input: '$$s.name', regex: skill ?? '', options: 'i' } },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: '$$sk.proofScore',
              },
            }
          : { $avg: '$parsedSkills.proofScore' },
      },
    },
    { $match: { sortScore: { $gt: 0 } } },
    { $sort: { sortScore: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        userId: 1,
        username: '$user.username',
        name: '$user.name',
        email: '$user.email',
        score: '$sortScore',
      },
    },
  )

  return Profile.aggregate(pipeline)
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const weekOf = getThisMonday()
  let sent = 0
  let skipped = 0

  // Check global skill leaderboards
  for (const skill of SKILLS_TO_CHECK) {
    const top20 = await getTop20ForSkill(skill)
    for (let i = 0; i < top20.length; i++) {
      const result = await notifyIfNew({ row: top20[i], rank: i + 1, skill, city: '', weekOf, resend })
      if (result === 'sent') sent++
      else if (result === 'skipped') skipped++
    }
  }

  // Check skill × city leaderboards (top 10 per combo to keep email volume reasonable)
  for (const skill of SKILLS_TO_CHECK) {
    for (const city of CITIES_TO_CHECK) {
      const top10 = await getTop20ForSkill(skill, city)
      for (let i = 0; i < Math.min(top10.length, 10); i++) {
        const result = await notifyIfNew({ row: top10[i], rank: i + 1, skill, city, weekOf, resend })
        if (result === 'sent') sent++
        else if (result === 'skipped') skipped++
      }
    }
  }

  return NextResponse.json({ sent, skipped, weekOf })
}

async function notifyIfNew({
  row, rank, skill, city, weekOf, resend: resendClient,
}: {
  row: { userId: string; email?: string; name?: string; username: string; score: number }
  rank: number
  skill: string
  city: string
  weekOf: Date
  resend: Resend | null
}): Promise<'sent' | 'skipped' | 'no_email'> {
  if (!row.email) return 'no_email'

  const alreadyNotified = await LeaderboardAlert.findOne({ userId: row.userId, skill, city, weekOf })
  if (alreadyNotified) return 'skipped'

  const cityLabel = city ? ` · ${city}` : ''
  const subject = `You're #${rank} on the ${skill}${cityLabel} leaderboard this week`

  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: 'Atlas by Intervue <atlas@intervue.in>',
        to: row.email,
        subject,
        html: buildLeaderboardHtml({
          name: row.name || row.username,
          username: row.username,
          skill: `${skill}${cityLabel}`,
          rank,
          score: Math.round(row.score),
        }),
      })
    } catch {
      return 'skipped'
    }
  }

  try {
    await LeaderboardAlert.create({ userId: row.userId, skill, city, rank, weekOf, sentAt: new Date() })
    createNotification(
      row.userId,
      'leaderboard_entry',
      `You made the ${skill}${cityLabel} leaderboard`,
      `#${rank} this week · ${Math.round(row.score)}/100`,
      `/leaderboard?skill=${encodeURIComponent(skill)}${city ? `&city=${encodeURIComponent(city)}` : ''}`
    ).catch(() => {})
    return 'sent'
  } catch {
    return 'skipped'
  }
}

function buildLeaderboardHtml({
  name, username, skill, rank, score,
}: {
  name: string; username: string; skill: string; rank: number; score: number
}) {
  const profileUrl = `${BASE_URL}/p/${username}`
  const leaderboardUrl = `${BASE_URL}/leaderboard?skill=${encodeURIComponent(skill)}`
  const rankCardUrl = `${BASE_URL}/api/rank-card/${username}`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0B0D1A;font-family:sans-serif;color:#AEB5E0;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#12152A;border:1px solid #1E2347;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 32px 20px;border-bottom:1px solid #1E2347;">
        <span style="font-size:11px;color:#2DE2C5;letter-spacing:3px;text-transform:uppercase;">Atlas · Leaderboard Alert</span>
        <h1 style="margin:12px 0 0;font-size:22px;font-weight:700;color:#FFFFFF;">
          You made the board, ${name}.
        </h1>
      </div>
      <div style="padding:28px 32px;text-align:center;">
        <div style="font-family:monospace;font-size:64px;font-weight:700;color:#FFFFFF;line-height:1;">#${rank}</div>
        <div style="font-size:18px;color:#2DE2C5;margin-top:8px;font-family:monospace;">${skill} · ${score}/100</div>
        <div style="font-size:14px;color:#71717A;margin-top:8px;">Top ${rank} ${skill} engineers in India this week</div>
      </div>
      <!-- Rank card image -->
      <div style="padding:0 32px 28px;">
        <a href="${profileUrl}">
          <img src="${rankCardUrl}" alt="Rank card" style="width:100%;border-radius:8px;display:block;" />
        </a>
      </div>
      <div style="padding:0 32px 32px;display:flex;gap:12px;">
        <a href="${leaderboardUrl}" style="display:inline-block;background:#2DE2C5;color:#0B0D1A;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
          View leaderboard →
        </a>
        <a href="${profileUrl}" style="display:inline-block;color:#2DE2C5;font-size:13px;text-decoration:none;padding:12px 0;">
          Share your profile
        </a>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1E2347;font-size:11px;color:#555B8A;">
        Leaderboards reset weekly. Keep practicing to hold your spot.
      </div>
    </div>
  </div>
</body>
</html>`
}
