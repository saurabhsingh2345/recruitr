import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Intervue <noreply@intervue.dev>'
const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function sendMessageNotification(
  to: string,
  fromName: string,
  threadId: string
) {
  if (!resend) return
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `New message from ${fromName} on Intervue`,
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:24px;height:24px;background:#00D4AA;border-radius:6px;display:flex;align-items:center;justify-content:center">
              <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
            </div>
            <span style="font-weight:700;font-size:14px">intervue</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:18px">New message from ${fromName}</h2>
          <p style="color:#8B8FA8;margin:0 0 24px;font-size:14px">You have a new message waiting on Intervue.</p>
          <a href="${BASE}/messages/${threadId}"
             style="display:inline-block;background:#00D4AA;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            View message →
          </a>
          <p style="color:#4d5066;font-size:11px;margin-top:24px">
            You're receiving this because you have an account on Intervue.
          </p>
        </div>`,
    })
  } catch (err) {
    console.error('[email] sendMessageNotification failed:', err)
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
) {
  if (!resend) {
    // Dev fallback: log the reset link so manual testing works without RESEND_API_KEY
    console.log(`[email] Password reset link for ${to}: ${resetUrl}`)
    return
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Reset your Intervue password',
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:24px;height:24px;background:#2DE2C5;border-radius:6px;display:flex;align-items:center;justify-content:center">
              <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
            </div>
            <span style="font-weight:700;font-size:14px">intervue</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:18px">Reset your password</h2>
          <p style="color:#8B8FA8;margin:0 0 4px;font-size:14px">Hi ${name},</p>
          <p style="color:#8B8FA8;margin:0 0 24px;font-size:14px">Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            Reset password →
          </a>
          <p style="color:#4d5066;font-size:11px;margin-top:24px">
            If you didn't request this, ignore this email — your password won't change.
          </p>
        </div>`,
    })
  } catch (err) {
    console.error('[email] sendPasswordResetEmail failed:', err)
  }
}

export async function sendScoreChangeEmail(
  to: string,
  name: string,
  changes: { skill: string; before: number; after: number; delta: number }[]
) {
  if (!resend) return
  const improved = changes.filter((c) => c.delta > 0)
  const declined = changes.filter((c) => c.delta < 0)
  const rows = changes
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#F8F9FA">${c.skill}</td>
          <td style="padding:8px 12px;font-size:13px;color:#888FC0;text-align:right;font-family:monospace">${c.before}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-family:monospace;color:${c.delta >= 0 ? '#2DE2C5' : '#f43f5e'}">${c.delta > 0 ? '+' : ''}${c.delta}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-family:monospace;font-weight:600;color:${c.delta >= 0 ? '#2DE2C5' : '#f43f5e'}">${c.after}</td>
        </tr>`
    )
    .join('')
  const subject =
    improved.length > 0
      ? `${improved.length} skill score${improved.length > 1 ? 's' : ''} improved on Intervue`
      : `Score update on Intervue`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:520px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:24px;height:24px;background:#2DE2C5;border-radius:6px;display:flex;align-items:center;justify-content:center">
              <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
            </div>
            <span style="font-weight:700;font-size:14px">intervue</span>
          </div>
          <h2 style="margin:0 0 6px;font-size:18px">Your proof-of-skill scores updated</h2>
          <p style="color:#8B8FA8;margin:0 0 20px;font-size:14px">
            Hi ${name}, your latest connection sync brought in new signals.${improved.length > 0 ? ` ${improved.length} score${improved.length > 1 ? 's' : ''} went up.` : ''}
          </p>
          <table style="width:100%;border-collapse:collapse;background:#080A18;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
                <th style="padding:8px 12px;font-size:11px;text-align:left;color:#888FC0;font-weight:500;text-transform:uppercase;letter-spacing:.05em">Skill</th>
                <th style="padding:8px 12px;font-size:11px;text-align:right;color:#888FC0;font-weight:500;text-transform:uppercase;letter-spacing:.05em">Before</th>
                <th style="padding:8px 12px;font-size:11px;text-align:right;color:#888FC0;font-weight:500;text-transform:uppercase;letter-spacing:.05em">Change</th>
                <th style="padding:8px 12px;font-size:11px;text-align:right;color:#888FC0;font-weight:500;text-transform:uppercase;letter-spacing:.05em">Score</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${BASE}/dashboard"
             style="display:inline-block;margin-top:20px;background:#2DE2C5;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            View your profile →
          </a>
          <p style="color:#4d5066;font-size:11px;margin-top:24px">
            Score-change alerts are a Pro feature. Manage in Settings.
          </p>
        </div>`,
    })
  } catch (err) {
    console.error('[email] sendScoreChangeEmail failed:', err)
  }
}

export async function sendScheduleNotification(
  to: string,
  fromName: string,
  threadId: string,
  date: string,
  time: string
) {
  if (!resend) return
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Interview scheduled for ${date} at ${time}`,
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
          <h2 style="margin:0 0 8px;font-size:18px">Interview scheduled</h2>
          <p style="color:#8B8FA8;margin:0 0 8px;font-size:14px">${fromName} has proposed an interview.</p>
          <p style="color:#F8F9FA;margin:0 0 24px;font-size:14px">
            <strong>${date}</strong> at <strong>${time}</strong> IST
          </p>
          <a href="${BASE}/messages/${threadId}"
             style="display:inline-block;background:#00D4AA;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            Confirm or decline →
          </a>
        </div>`,
    })
  } catch (err) {
    console.error('[email] sendScheduleNotification failed:', err)
  }
}
