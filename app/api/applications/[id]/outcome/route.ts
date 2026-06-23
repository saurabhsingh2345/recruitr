import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { HireSignal } from '@/lib/models/HireSignal'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { result, notes, hiredCompany, hiredRole, hiredSalaryLPA } = await req.json()

  if (!['hired', 'rejected', 'withdrawn'].includes(result)) {
    return NextResponse.json({ error: 'result must be hired | rejected | withdrawn' }, { status: 400 })
  }

  try {
    await connectDB()

    const app = await Application.findOne({
      _id: id,
      $or: [{ recruiterId: session.user.id }, { candidateId: session.user.id }],
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sender = await User.findById(session.user.id).lean()
    const hiredAt = new Date()

    app.outcome = {
      result,
      notes: notes || '',
      updatedAt: hiredAt,
      ...(result === 'hired' ? {
        hiredCompany: hiredCompany || app.recruiterInfo?.company || '',
        hiredRole: hiredRole || app.jobTitle || '',
        hiredSalaryLPA: Number(hiredSalaryLPA) || 0,
        hiredAt,
      } : {}),
    }
    app.status = result

    const emoji = result === 'hired' ? '🎉' : result === 'rejected' ? '❌' : '🔄'
    const label = result === 'hired' ? 'Offer accepted!' : result === 'rejected' ? 'Application closed' : 'Application withdrawn'

    app.messages.push({
      senderId: session.user.id,
      senderName: sender?.name || '',
      senderAvatar: sender?.avatarUrl || '',
      content: `${emoji} ${label}${notes ? ` — ${notes}` : ''}`,
      type: 'outcome',
      readBy: [session.user.id],
      timestamp: hiredAt,
    })

    await app.save()

    // Write HireSignal records for each top skill when hired
    if (result === 'hired') {
      const candidateId = app.candidateId
      writeHireSignals(candidateId, id, hiredRole || app.jobTitle || '', hiredAt).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Outcome error:', err)
    return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 })
  }
}

async function writeHireSignals(
  candidateId: string,
  applicationId: string,
  targetRole: string,
  hiredAt: Date
) {
  const [profile, sessions] = await Promise.all([
    Profile.findOne({ userId: candidateId }).select('parsedSkills').lean() as Promise<{
      parsedSkills: { name: string; proofScore: number }[]
    } | null>,
    InterviewSession.find({ userId: candidateId, status: 'completed' })
      .select('targetSkill scores')
      .lean() as Promise<{ targetSkill: string; scores?: { overall: number } }[]>,
  ])

  if (!profile?.parsedSkills) return

  const top8 = [...profile.parsedSkills]
    .sort((a, b) => b.proofScore - a.proofScore)
    .slice(0, 8)

  const signals = top8.map((skill) => {
    const skillSessions = sessions.filter(
      (s) => s.targetSkill?.toLowerCase() === skill.name.toLowerCase()
    )
    const sessionCount = skillSessions.length
    const sessionAvgScore = sessionCount
      ? Math.round(skillSessions.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) / sessionCount)
      : 0

    return {
      userId: candidateId,
      applicationId,
      skill: skill.name,
      proofScoreAtHire: skill.proofScore,
      sessionCount,
      sessionAvgScore,
      targetRole,
      hiredAt,
    }
  })

  await HireSignal.insertMany(signals)
}
