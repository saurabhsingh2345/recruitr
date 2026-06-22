/**
 * Certificate issuance logic.
 * Called fire-and-forget after each completed interview session.
 * Issues one certificate per milestone threshold crossed (50, 70, 85).
 */

import { Resend } from 'resend'
import { connectDB } from '@/lib/mongodb'
import { Certificate } from '@/lib/models/Certificate'
import { User } from '@/lib/models/User'
import { createNotification } from '@/lib/notifications'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const MILESTONES = [50, 70, 85] // Intermediate, Proficient, Expert

export async function checkAndIssueCertificates(
  userId: string,
  skill: string,
  scoreBefore: number,
  scoreAfter: number,
  evidence: string[]
): Promise<void> {
  if (scoreAfter <= scoreBefore) return

  await connectDB()

  const crossedMilestones = MILESTONES.filter(
    (m) => scoreBefore < m && scoreAfter >= m
  )
  if (crossedMilestones.length === 0) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(userId).lean<any>()
  if (!user) return

  for (const milestone of crossedMilestones) {
    const token = generateToken()
    try {
      await Certificate.create({
        userId,
        skill,
        milestone,
        scoreAtIssuance: scoreAfter,
        evidence: evidence.slice(0, 5),
        token,
        issuedAt: new Date(),
        linkedInShared: false,
      })
    } catch (err: unknown) {
      // Skip duplicate (unique index on userId+skill+milestone)
      if ((err as { code?: number })?.code === 11000) continue
      throw err
    }

    const milestoneLabel = milestone >= 85 ? 'Expert' : milestone >= 70 ? 'Proficient' : 'Intermediate'
    const certUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/certificate/${token}`

    createNotification(
      userId,
      'certificate_issued',
      `${milestoneLabel} certificate: ${skill}`,
      `Your proof score crossed ${milestone} — certificate ready to share.`,
      certUrl
    ).catch(() => {})

    if (user.email && resend) {
      resend.emails.send({
        from: 'Intervue <certificates@intervue.in>',
        to: user.email,
        subject: `You earned a ${milestoneLabel} certificate in ${skill}!`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:auto;">
            <h2 style="color:#2DE2C5;">🏆 Certificate Earned</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Your proof score for <strong>${skill}</strong> crossed the <strong>${milestoneLabel} (${milestone})</strong> threshold.</p>
            <p>Your verified certificate is ready to share:</p>
            <p>
              <a href="${certUrl}"
                 style="background:#2DE2C5;color:#0B0D1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
                View Certificate →
              </a>
            </p>
            <p style="font-size:12px;color:#888;">Share it on LinkedIn to signal your proof-backed skill to recruiters.</p>
          </div>
        `,
      }).catch(() => {})
    }
  }
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}
