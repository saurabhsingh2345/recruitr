import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Assessment } from '@/lib/models/Assessment'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { User } from '@/lib/models/User'
import { Resend } from 'resend'
import crypto from 'crypto'

const isDev = process.env.NODE_ENV !== 'production'
const resend = !isDev && process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'
// Use verified domain in prod (e.g. noreply@yourdomain.com); sandbox works for testing
const FROM = process.env.RESEND_FROM_EMAIL || 'Intervue <onboarding@resend.dev>'

async function sendInviteEmail(
  to: string,
  candidateName: string,
  role: string,
  company: string,
  roundCount: number,
  deadline: Date,
  token: string,
) {
  if (!resend) {
    console.log(`[email] Assessment invite for ${to}: ${BASE}/assess/${token}`)
    return
  }
  const deadlineStr = deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `You've been invited to interview for ${role} at ${company}`,
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:520px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:24px;height:24px;background:#2DE2C5;border-radius:6px;display:flex;align-items:center;justify-content:center">
              <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
            </div>
            <span style="font-weight:700;font-size:14px">intervue</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:20px">Hi ${candidateName || 'there'},</h2>
          <p style="color:#8B8FA8;margin:0 0 16px;font-size:15px">
            You've been invited to interview for <strong style="color:#F8F9FA">${role}</strong> at <strong style="color:#F8F9FA">${company}</strong>.
          </p>
          <div style="background:#080A18;border-radius:8px;padding:16px;margin-bottom:24px">
            <div style="font-size:13px;color:#8B8FA8;margin-bottom:8px">Assessment details</div>
            <div style="font-size:14px;color:#F8F9FA;margin-bottom:4px">📋 ${roundCount} round${roundCount !== 1 ? 's' : ''}</div>
            <div style="font-size:14px;color:#F8F9FA;margin-bottom:4px">⏰ Complete by <strong>${deadlineStr}</strong></div>
            <div style="font-size:13px;color:#8B8FA8;margin-top:8px">No account required — complete at your own pace.</div>
          </div>
          <a href="${BASE}/assess/${token}"
             style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none">
            Start assessment →
          </a>
          <p style="color:#4d5066;font-size:11px;margin-top:24px">
            This link is unique to you. Don't share it. Expires on ${deadlineStr}.
          </p>
        </div>`,
    })
  } catch (err) {
    console.error('[email] Assessment invite failed:', err)
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const { title, role, deadline, rounds, candidates } = await req.json()

  if (!title || !role || !deadline || !rounds?.length || !candidates?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const assessment = await Assessment.create({
    recruiterId: user._id,
    title,
    role,
    rounds,
    deadline: new Date(deadline),
    status: 'active',
  })

  const invites = []
  for (const candidate of candidates) {
    const token = crypto.randomBytes(16).toString('hex')
    const invite = await AssessmentInvite.create({
      assessmentId: assessment._id,
      token,
      candidateName: candidate.name || '',
      candidateEmail: candidate.email,
      rounds: rounds.map((r: { order: number }) => ({
        roundOrder: r.order,
        status: 'pending',
      })),
      status: 'invited',
      invitedAt: new Date(),
    })
    invites.push(invite)
    sendInviteEmail(
      candidate.email,
      candidate.name || '',
      role,
      user.company || user.name,
      rounds.length,
      new Date(deadline),
      token,
    ).catch(() => {})
  }

  return NextResponse.json({ assessment, inviteCount: invites.length })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  const assessments = await Assessment.find({ recruiterId: user._id })
    .sort({ createdAt: -1 })
    .lean()

  const ids = assessments.map((a) => a._id)
  const inviteCounts = await AssessmentInvite.aggregate([
    { $match: { assessmentId: { $in: ids } } },
    { $group: { _id: '$assessmentId', count: { $sum: 1 } } },
  ])
  const countMap = Object.fromEntries(inviteCounts.map((c) => [c._id.toString(), c.count]))

  return NextResponse.json({
    assessments: assessments.map((a) => ({
      ...a,
      candidateCount: countMap[a._id.toString()] || 0,
    })),
  })
}
