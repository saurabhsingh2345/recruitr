import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { User } from '@/lib/models/User'
import { sendRecruiterAssessmentSummaryEmail } from '@/lib/assessment-email'

export const maxDuration = 120

/** Daily: expire past-deadline invites and email recruiters a summary. */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const now = new Date()

  const overdueAssessments = await Assessment.find({
    status: 'active',
    deadline: { $lt: now },
  }).lean()

  let invitesExpired = 0
  const recruiterSummaries = new Map<
    string,
    { email: string; name: string; items: Array<{ title: string; role: string; expiredCount: number; completedCount: number; pendingCount: number }> }
  >()

  for (const assessment of overdueAssessments) {
    const invites = await AssessmentInvite.find({
      assessmentId: assessment._id,
      status: { $in: ['invited', 'started'] },
    })

    for (const invite of invites) {
      invite.status = 'expired'
      invite.rounds = invite.rounds.map((r: { status: string; roundOrder: number; weight?: number }) =>
        r.status === 'completed' ? r : { ...r, status: 'expired' as const }
      )
      await invite.save()
      invitesExpired++
    }

    const allInvites = await AssessmentInvite.find({ assessmentId: assessment._id }).lean()
    const expiredCount = allInvites.filter((i) => i.status === 'expired').length
    const completedCount = allInvites.filter((i) => i.status === 'completed').length
    const pendingCount = allInvites.filter((i) => i.status === 'invited' || i.status === 'started').length

    const recruiterId = assessment.recruiterId.toString()
    const recruiter = await User.findById(recruiterId).select('email name').lean() as
      { email: string; name: string } | null
    if (!recruiter?.email) continue

    if (!recruiterSummaries.has(recruiterId)) {
      recruiterSummaries.set(recruiterId, {
        email: recruiter.email,
        name: recruiter.name,
        items: [],
      })
    }
    recruiterSummaries.get(recruiterId)!.items.push({
      title: assessment.title,
      role: assessment.role,
      expiredCount,
      completedCount,
      pendingCount,
    })
  }

  // Also expire individual invites on assessments still active but past deadline check on invite level
  const activeWithDeadline = await Assessment.find({ status: 'active', deadline: { $gte: now } })
    .select('_id deadline recruiterId title role')
    .lean()

  for (const assessment of activeWithDeadline) {
    const staleInvites = await AssessmentInvite.find({
      assessmentId: assessment._id,
      status: { $in: ['invited', 'started'] },
    })
    for (const invite of staleInvites) {
      if (new Date(assessment.deadline) < now) {
        invite.status = 'expired'
        await invite.save()
        invitesExpired++
      }
    }
  }

  let emailsSent = 0
  for (const summary of recruiterSummaries.values()) {
    const result = await sendRecruiterAssessmentSummaryEmail({
      to: summary.email,
      recruiterName: summary.name,
      assessments: summary.items,
    })
    if (result.sent) emailsSent++
  }

  return NextResponse.json({
    ok: true,
    overdueAssessments: overdueAssessments.length,
    invitesExpired,
    recruiterEmailsSent: emailsSent,
  })
}
