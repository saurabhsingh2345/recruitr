import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { VerifiedCard } from '@/lib/models/VerifiedCard'
import { User } from '@/lib/models/User'
import { createNotification } from '@/lib/notifications'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Intervue <noreply@intervue.dev>'
const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()

    const [profile, sessions, existing] = await Promise.all([
      Profile.findOne({ userId: session.user.id })
        .select('parsedSkills careerGoal cohortPercentile')
        .lean() as Promise<{
          parsedSkills: { name: string; proofScore: number }[]
          cohortPercentile: number
          careerGoal?: { targetRole: string; targetLevel: string }
        } | null>,
      InterviewSession.find({ userId: session.user.id, status: 'completed' })
        .select('targetSkill scores')
        .lean() as Promise<{ targetSkill: string; scores?: { overall: number } }[]>,
      VerifiedCard.findOne({ userId: session.user.id }).lean(),
    ])

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const careerGoal = profile.careerGoal?.targetRole ? profile.careerGoal : null
    if (!careerGoal) {
      return NextResponse.json({ error: 'Set a career goal first' }, { status: 400 })
    }

    if (sessions.length < 5) {
      return NextResponse.json({
        error: 'Complete at least 5 interview sessions first',
        sessionsNeeded: 5 - sessions.length,
      }, { status: 400 })
    }

    const top8 = [...(profile.parsedSkills || [])]
      .sort((a, b) => b.proofScore - a.proofScore)
      .slice(0, 8)

    if (!top8.length || top8[0].proofScore < 70) {
      return NextResponse.json({
        error: 'Your top skill score must be ≥70 to earn a verified card',
        topScore: top8[0]?.proofScore ?? 0,
      }, { status: 400 })
    }

    // Build top 5 skills with approximate percentile
    const topSkills = top8.slice(0, 5).map((sk) => ({
      name: sk.name,
      score: sk.proofScore,
      percentile: Math.min(99, Math.max(1, Math.round(profile.cohortPercentile || (sk.proofScore - 10)))),
    }))

    const cardData = {
      userId: session.user.id,
      targetRole: careerGoal.targetRole,
      targetLevel: careerGoal.targetLevel || '',
      topSkills,
      sessionCount: sessions.length,
      issuedAt: new Date(),
    }

    let card
    if (existing) {
      card = await VerifiedCard.findOneAndUpdate(
        { userId: session.user.id },
        { ...cardData },
        { new: true }
      )
    } else {
      card = await VerifiedCard.create(cardData)
    }

    const cardUrl = `${BASE}/verified-card/${card.cardToken}`

    // Notify in-app
    createNotification(
      session.user.id,
      'certificate_issued',
      'Verified Card issued',
      `Your ${careerGoal.targetLevel} ${careerGoal.targetRole} card is ready to share`,
      cardUrl
    ).catch(() => {})

    // Send email
    if (resend) {
      const user = await User.findById(session.user.id).select('email name').lean()
      if (user?.email) {
        resend.emails.send({
          from: FROM,
          to: user.email,
          subject: `Your Intervue Verified Card is ready`,
          html: `
            <div style="font-family:system-ui,sans-serif;background:#050508;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
              <div style="margin-bottom:24px">
                <span style="background:#2DE2C5;color:#05060F;font-weight:700;padding:4px 10px;border-radius:6px;font-size:12px">INTERVUE VERIFIED</span>
              </div>
              <h2 style="margin:0 0 8px;font-size:20px">${careerGoal.targetLevel} ${careerGoal.targetRole}</h2>
              <p style="color:#8B8FA8;margin:0 0 8px;font-size:14px">Top skills: ${topSkills.slice(0, 3).map(s => `${s.name} (${s.score})`).join(', ')}</p>
              <p style="color:#8B8FA8;margin:0 0 24px;font-size:14px">${sessions.length} sessions completed · Top ${100 - (profile.cohortPercentile || 50)}% of candidates</p>
              <a href="${cardUrl}" style="display:inline-block;background:#2DE2C5;color:#05060F;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">
                View &amp; share your card →
              </a>
            </div>`,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ card, cardUrl })
  } catch (err) {
    console.error('Verified card issue error:', err)
    return NextResponse.json({ error: 'Failed to issue card' }, { status: 500 })
  }
}
