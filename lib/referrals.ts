import { connectDB } from './mongodb'
import { User } from './models/User'
import { Profile } from './models/Profile'
import { InterviewSession } from './models/InterviewSession'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Intervue <noreply@intervue.dev>'
const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

function makeReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function ensureReferralCode(userId: string): Promise<string> {
  await connectDB()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(userId).lean<any>()
  if (user?.referralCode) return user.referralCode

  let code = makeReferralCode()
  // Retry on collision (extremely rare)
  while (await User.findOne({ referralCode: code })) {
    code = makeReferralCode()
  }
  await User.findByIdAndUpdate(userId, { referralCode: code })
  return code
}

/**
 * Called when a new GitHub user signs up with ?ref=CODE in the URL.
 * Stores on the user doc — the session callback fires after OAuth so
 * we save the code to localStorage on the client and POST it to /api/referral/claim.
 */
export async function claimReferral(userId: string, referralCode: string): Promise<void> {
  await connectDB()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const referrer = await User.findOne({ referralCode }).lean<any>()
  if (!referrer) return

  // Don't self-refer
  if (referrer._id.toString() === userId) return

  // Only set once
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const me = await User.findById(userId).lean<any>()
  if (me?.referredBy) return

  await User.findByIdAndUpdate(userId, { referredBy: referrer._id })
}

/**
 * Called after each completed InterviewSession.
 * On the 3rd session, grants vouchedBadge to the referrer.
 */
export async function processReferralMilestone(userId: string): Promise<void> {
  await connectDB()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(userId).lean<any>()
  if (!user?.referredBy) return

  const sessionCount = await InterviewSession.countDocuments({ userId, status: 'completed' })
  if (sessionCount !== 3) return

  // Grant vouched to referrer
  await User.findByIdAndUpdate(user.referredBy, {
    $inc: { vouchedCount: 1 },
    $set: { isVouched: true },
  })
  await Profile.findOneAndUpdate(
    { userId: user.referredBy },
    { vouchedBadge: true, vouchedBy: userId }
  )

  // Notify referrer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const referrer = await User.findById(user.referredBy).lean<any>()
  if (referrer?.email && resend) {
    await resend.emails.send({
      from: FROM,
      to: referrer.email,
      subject: 'Your referral just completed 3 sessions — you\'re vouched!',
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:24px;height:24px;background:#2DE2C5;border-radius:6px;display:flex;align-items:center;justify-content:center">
              <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
            </div>
            <span style="font-weight:700;font-size:14px">intervue</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:18px">You've earned a Vouched badge</h2>
          <p style="color:#8B8FA8;margin:0 0 16px;font-size:14px">
            Someone you referred just completed their 3rd interview session on Intervue.
            Your profile now shows a Vouched badge — a social trust signal that recruiters see.
          </p>
          <a href="${BASE}/p/${referrer.username}"
             style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            View your profile →
          </a>
        </div>`,
    }).catch(() => {})
  }

  // Notify the referee (person who was referred)
  if (user.email && resend) {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: 'Nice work — you\'ve completed 3 sessions on Intervue',
      html: `
        <div style="font-family:system-ui,sans-serif;background:#0F1117;color:#F8F9FA;padding:32px;border-radius:12px;max-width:480px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:24px;height:24px;background:#2DE2C5;border-radius:6px;display:flex;align-items:center;justify-content:center">
              <span style="color:#0F1117;font-weight:700;font-size:12px">I</span>
            </div>
            <span style="font-weight:700;font-size:14px">intervue</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:18px">3 sessions down — keep going</h2>
          <p style="color:#8B8FA8;margin:0 0 16px;font-size:14px">
            You've completed 3 interview sessions. Your proof scores are being seen by recruiters.
            Start your next session to keep improving.
          </p>
          <a href="${BASE}/interview/new"
             style="display:inline-block;background:#2DE2C5;color:#0F1117;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
            Start next session →
          </a>
        </div>`,
    }).catch(() => {})
  }
}
