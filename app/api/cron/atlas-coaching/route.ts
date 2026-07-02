import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { buildCoachingNudge } from '@/lib/atlas-coaching'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const FROM = process.env.RESEND_FROM_EMAIL || 'Intervue <onboarding@resend.dev>'

export const maxDuration = 120

/** Weekly Atlas proactive coaching emails (Wed 07:00 UTC). */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const candidates = await User.find({
    role: 'candidate',
    email: { $exists: true, $ne: '' },
    notifReminders: { $ne: false },
  })
    .select('_id email name username')
    .limit(80)
    .lean()

  let sent = 0
  let skipped = 0

  for (const user of candidates) {
    const profile = await Profile.findOne({ userId: user._id })
      .select('parsedSkills careerGoal')
      .lean()

    const sessionCount = await InterviewSession.countDocuments({
      userId: user._id,
      status: 'completed',
    })

    const nudge = buildCoachingNudge({
      skills: (profile?.parsedSkills as { name: string; proofScore: number }[]) || [],
      careerGoal: profile?.careerGoal as import('@/lib/models/Profile').ICareerGoal | undefined,
      sessionCount,
    })
    if (!nudge) {
      skipped++
      continue
    }

    let emailBody = nudge.body
    try {
      const { text } = await generateText({
        model: await getModel(),
        prompt: `Write a 2-sentence proactive coaching email for a developer using Intervue.
Headline context: ${nudge.headline}
Details: ${nudge.body}
Target role: ${nudge.targetRole || 'not set'}
Be direct, encouraging, no fluff. No subject line.`,
        maxOutputTokens: 120,
      })
      if (text.trim()) emailBody = text.trim()
    } catch {
      // use template body
    }

    if (!resend) {
      console.log(`[atlas-coaching] ${user.email}: ${nudge.headline}`)
      sent++
      continue
    }

    try {
      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `Atlas: ${nudge.headline}`,
        html: `
          <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:520px">
            <div style="font-weight:700;font-size:14px;color:#2DE2C5;margin-bottom:16px">Atlas · Intervue</div>
            <h2 style="margin:0 0 12px;font-size:18px">${nudge.headline}</h2>
            <p style="color:#AEB5E0;font-size:14px;line-height:1.6;margin:0 0 24px">${emailBody}</p>
            <a href="${BASE}${nudge.ctaHref}"
               style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
              ${nudge.ctaLabel} →
            </a>
          </div>`,
      })
      sent++
    } catch (err) {
      console.error('[atlas-coaching] send failed:', user.email, err)
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, processed: candidates.length })
}
