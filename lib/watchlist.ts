import { connectDB } from './mongodb'
import { Watchlist } from './models/Watchlist'
import { User } from './models/User'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Intervue <noreply@intervue.dev>'
const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function checkWatchlistAlerts(
  candidateId: string,
  updatedSkills: { name: string; newScore: number }[]
): Promise<void> {
  await connectDB()

  // Only check watchlists where at least one alert is pending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watches = await Watchlist.find({
    candidateId,
    'skillAlerts.alertedAt': null,
  }).lean<any[]>()

  for (const watch of watches) {
    for (const alert of watch.skillAlerts) {
      if (alert.alertedAt) continue
      const updated = updatedSkills.find(
        (s) => s.name.toLowerCase() === alert.skill.toLowerCase()
      )
      if (!updated || updated.newScore < alert.alertAtScore) continue

      // Trigger alert
      await Watchlist.updateOne(
        { _id: watch._id, 'skillAlerts.skill': alert.skill },
        { $set: { 'skillAlerts.$.alertedAt': new Date() } }
      )

      // Get recruiter email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recruiter = await User.findById(watch.recruiterId).lean<any>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidate = await User.findById(candidateId).lean<any>()
      if (!recruiter?.email || !resend) continue

      await resend.emails.send({
        from: FROM,
        to: recruiter.email,
        subject: `Watchlist alert: ${candidate?.name || 'A candidate'}'s ${alert.skill} reached ${updated.newScore}`,
        html: `
          <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
              <div style="width:24px;height:24px;background:#2DE2C5;border-radius:6px;display:flex;align-items:center;justify-content:center">
                <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
              </div>
              <span style="font-weight:700;font-size:14px">intervue</span>
            </div>
            <h2 style="margin:0 0 8px;font-size:18px">Watchlist alert</h2>
            <p style="color:#8B8FA8;margin:0 0 16px;font-size:14px">
              <strong style="color:#F8F9FA">${candidate?.name || 'A candidate'}</strong>'s
              <strong style="color:#2DE2C5">${alert.skill}</strong> proof score just reached
              <strong style="color:#2DE2C5">${updated.newScore}</strong> — your alert threshold was ${alert.alertAtScore}.
            </p>
            <a href="${BASE}/recruiter/watchlist"
               style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
              View watchlist →
            </a>
          </div>`,
      }).catch(() => {})
    }
  }
}
