import { Resend } from 'resend'

const isDev = process.env.NODE_ENV !== 'production'
const resend = !isDev && process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
export const ASSESSMENT_EMAIL_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'
export const ASSESSMENT_FROM = process.env.RESEND_FROM_EMAIL || 'Intervue <onboarding@resend.dev>'

export function assessmentInviteUrl(token: string) {
  return `${ASSESSMENT_EMAIL_BASE}/assess/${token}`
}

export async function sendAssessmentInviteEmail(params: {
  to: string
  candidateName: string
  role: string
  company: string
  roundCount: number
  deadline: Date
  token: string
  subjectPrefix?: string
}) {
  const {
    to,
    candidateName,
    role,
    company,
    roundCount,
    deadline,
    token,
    subjectPrefix = "You've been invited to interview for",
  } = params

  const url = assessmentInviteUrl(token)
  const deadlineStr = deadline.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (!resend) {
    console.log(`[email] Assessment invite for ${to}: ${url}`)
    return { sent: false, devLogged: true, url }
  }

  try {
    await resend.emails.send({
      from: ASSESSMENT_FROM,
      to,
      subject: `${subjectPrefix} ${role} at ${company}`,
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
          <a href="${url}"
             style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none">
            Start assessment →
          </a>
          <p style="color:#4d5066;font-size:11px;margin-top:24px">
            This link is unique to you. Don't share it. Expires on ${deadlineStr}.
          </p>
        </div>`,
    })
    return { sent: true, devLogged: false, url }
  } catch (err) {
    console.error('[email] Assessment invite failed:', err)
    return { sent: false, devLogged: false, url, error: String(err) }
  }
}

export async function sendRecruiterAssessmentSummaryEmail(params: {
  to: string
  recruiterName: string
  assessments: Array<{
    title: string
    role: string
    expiredCount: number
    completedCount: number
    pendingCount: number
  }>
}) {
  const { to, recruiterName, assessments } = params
  if (!assessments.length) return { sent: false }

  const rows = assessments
    .map(
      (a) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1A1E3A">${a.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1A1E3A;text-align:center">${a.expiredCount}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1A1E3A;text-align:center">${a.completedCount}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1A1E3A;text-align:center">${a.pendingCount}</td>
        </tr>`
    )
    .join('')

  if (!resend) {
    console.log(`[email] Assessment expiry summary for ${to}:`, assessments)
    return { sent: false, devLogged: true }
  }

  try {
    await resend.emails.send({
      from: ASSESSMENT_FROM,
      to,
      subject: 'Intervue — assessment deadline summary',
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:560px">
          <h2 style="margin:0 0 8px;font-size:18px">Hi ${recruiterName || 'there'},</h2>
          <p style="color:#8B8FA8;font-size:14px;margin:0 0 20px">
            Some assessment invites have passed their deadline. You can resend invites from the assessment dashboard.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="color:#8B8FA8">
                <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #2DE2C5/30">Assessment</th>
                <th style="padding:8px 12px;border-bottom:1px solid #2DE2C5/30">Expired</th>
                <th style="padding:8px 12px;border-bottom:1px solid #2DE2C5/30">Completed</th>
                <th style="padding:8px 12px;border-bottom:1px solid #2DE2C5/30">Still open</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${ASSESSMENT_EMAIL_BASE}/recruiter/assessments"
             style="display:inline-block;margin-top:24px;background:#2DE2C5;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            View assessments →
          </a>
        </div>`,
    })
    return { sent: true }
  } catch (err) {
    console.error('[email] Assessment summary failed:', err)
    return { sent: false, error: String(err) }
  }
}
