/**
 * Cron: Atlas weekly career brief email.
 * Vercel cron calls this every Monday at 08:00 UTC.
 * Sends a personalized brief to each candidate who has emailBriefEnabled=true
 * and hasn't received one this week.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { WeeklyBrief } from '@/lib/models/WeeklyBrief'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Allow longer runtime for batch sends
export const maxDuration = 60

function getThisMonday(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay() // 0=Sun, 1=Mon
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  return d
}

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const weekOf = getThisMonday()

  // Find candidates with brief enabled who haven't been briefed this week
  const alreadySent = await WeeklyBrief.find({ weekOf })
    .select('userId')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lean<any[]>()
  const alreadySentIds = new Set(alreadySent.map((b) => b.userId.toString()))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = await User.find({
    role: 'candidate',
    emailBriefEnabled: true,
    email: { $exists: true, $ne: '' },
  })
    .select('_id email name username')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lean<any[]>()

  const pending = candidates.filter((u) => !alreadySentIds.has(u._id.toString()))

  let sent = 0
  let failed = 0

  for (const user of pending.slice(0, 50)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await Profile.findOne({ userId: user._id })
      .select('parsedSkills cohortPercentile')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .lean<any>()

    const topSkills = (profile?.parsedSkills || [])
      .sort((a: { proofScore: number }, b: { proofScore: number }) => b.proofScore - a.proofScore)
      .slice(0, 5)
      .map((s: { name: string; proofScore: number }) => `${s.name}: ${s.proofScore}`)
      .join(', ')

    const percentile = profile?.cohortPercentile ?? 0

    try {
      const model = await getModel()
      const { text: briefText } = await generateText({
        model,
        maxOutputTokens: 400,
        messages: [
          {
            role: 'system',
            content: `You are Atlas, a career intelligence agent. Write a concise, encouraging weekly career brief for a software developer. Use plain text suitable for email. 3-4 short paragraphs. Be specific, not generic. No markdown.`,
          },
          {
            role: 'user',
            content: `Developer: ${user.name || user.username}
Top skills: ${topSkills || 'not yet assessed'}
Cohort percentile: ${Math.round(percentile)}th
Week of: ${weekOf.toDateString()}

Write their weekly Atlas brief covering: (1) a data-driven observation about their skill profile, (2) one concrete action they can take this week (suggest a specific interview format), (3) a motivating closing note about their market position.`,
          },
        ],
      })

      const subject = `Your Atlas weekly brief · ${weekOf.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      const bodyHtml = buildBriefHtml(user.name || user.username, briefText, user.username)

      if (!resend) { failed++; continue }
      await resend.emails.send({
        from: 'Atlas by Intervue <atlas@intervue.in>',
        to: user.email,
        subject,
        html: bodyHtml,
      })

      await WeeklyBrief.create({
        userId: user._id,
        weekOf,
        sentAt: new Date(),
        subject,
        bodyHtml,
      })

      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed, weekOf })
}

function buildBriefHtml(name: string, brief: string, username: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://intervue.in'
  const paragraphs = brief
    .split('\n')
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 14px;line-height:1.7;">${p}</p>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Atlas Weekly Brief</title></head>
<body style="margin:0;padding:0;background:#0B0D1A;font-family:sans-serif;color:#AEB5E0;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#12152A;border:1px solid #1E2347;border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <div style="padding:28px 32px 20px;border-bottom:1px solid #1E2347;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:11px;color:#2DE2C5;letter-spacing:3px;text-transform:uppercase;">Atlas · Weekly Brief</span>
        </div>
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">Hi ${name},</h1>
      </div>
      <!-- Body -->
      <div style="padding:28px 32px;font-size:15px;">
        ${paragraphs}
      </div>
      <!-- CTA -->
      <div style="padding:0 32px 32px;">
        <a href="${base}/agent" style="display:inline-block;background:#2DE2C5;color:#0B0D1A;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
          Open Atlas →
        </a>
        <a href="${base}/p/${username}" style="display:inline-block;margin-left:12px;color:#2DE2C5;font-size:13px;text-decoration:none;">
          View proof page
        </a>
      </div>
      <!-- Footer -->
      <div style="padding:16px 32px;border-top:1px solid #1E2347;font-size:11px;color:#555B8A;">
        You're receiving this because you enabled weekly briefs in
        <a href="${base}/settings" style="color:#555B8A;">Settings → Notifications</a>.
        <a href="${base}/settings" style="color:#555B8A;margin-left:8px;">Unsubscribe</a>
      </div>
    </div>
  </div>
</body>
</html>`
}
