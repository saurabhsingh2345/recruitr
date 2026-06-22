/**
 * Autonomous sourcing job — triggered when a candidate's skills are updated.
 * Scout checks all active RoleSpecs for mutual fit without recruiter intervention.
 * Only creates Handshake docs when Atlas confirms mutual fit, then notifies recruiter.
 */

import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { Handshake } from '@/lib/models/Handshake'
import { User } from '@/lib/models/User'
import { runHandshake } from '@/lib/agents/handshake'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const MAX_ROLES_PER_RUN = 20

export async function runAutonomousSourcing(
  userId: string,
  updatedSkills: string[]
): Promise<{ checked: number; matched: number }> {
  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidate = await User.findById(userId).lean<any>()
  if (!candidate || candidate.discoverability === 'invisible') {
    return { checked: 0, matched: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId }).lean<any>()
  if (!profile) return { checked: 0, matched: 0 }

  // Find active roles that overlap with at least one updated skill
  const skillRegexes = updatedSkills.map((s) => new RegExp(s, 'i'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = await RoleSpec.find({
    status: 'active',
    autoSourceEnabled: true,
    'mustHave.skill': { $in: skillRegexes },
  })
    .limit(MAX_ROLES_PER_RUN)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lean<any[]>()

  // Exclude roles already handshaked with this candidate
  const existingHandshakes = await Handshake.find({
    candidateId: userId,
    roleId: { $in: roles.map((r) => r._id) },
  })
    .select('roleId')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lean<any[]>()

  const handshakeRoleIds = new Set(existingHandshakes.map((h) => h.roleId.toString()))
  const newRoles = roles.filter((r) => !handshakeRoleIds.has(r._id.toString()))

  let matched = 0
  for (const role of newRoles) {
    try {
      const hs = await runHandshake(role, userId, [])
      if (!hs) continue

      if (hs.status === 'surfaced_to_candidate') {
        matched++
        // Notify recruiter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recruiter = await User.findById(role.recruiterId).lean<any>()
        if (recruiter?.email && resend) {
          resend.emails.send({
            from: 'Intervue Scout <scout@intervue.in>',
            to: recruiter.email,
            subject: `Scout found a match for "${role.title}"`,
            html: `
              <p>Hi${recruiter.name ? ` ${recruiter.name}` : ''},</p>
              <p>Scout autonomously found a candidate who clears your gates for <strong>${role.title}</strong>.</p>
              <p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/recruiter/roles/${role._id}"
                   style="background:#2DE2C5;color:#0B0D1A;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Review candidate →
                </a>
              </p>
              <p style="font-size:12px;color:#888;">This match was surfaced automatically. The candidate has been notified separately.</p>
            `,
          }).catch(() => {})
        }

        // Update role sourcing stats
        await RoleSpec.findByIdAndUpdate(role._id, {
          $set: { lastAutoSourceAt: new Date() },
          $inc: { autoSourceCount: 1 },
        })
      }
    } catch {
      // Continue processing other roles even if one fails
    }
  }

  return { checked: newRoles.length, matched }
}
