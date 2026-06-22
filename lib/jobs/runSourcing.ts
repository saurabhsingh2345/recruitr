/**
 * Sourcing job — Scout sources the verified pool and runs the Handshake Protocol
 * against each candidate. Atlas declines non-fits silently; genuine fits surface.
 *
 * Called either inline (no queue) or by the BullMQ worker.
 */

import { connectDB } from '@/lib/mongodb'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { sourceForRole, runHandshake } from '@/lib/agents/handshake'

export interface SourcingResult {
  sourced: number
  surfaced: number
  declined: number
  message: string
}

export async function runSourcing(
  roleId: string,
  recruiterId: string,
  asks: string[] = []
): Promise<SourcingResult> {
  await connectDB()
  const role = await RoleSpec.findOne({ _id: roleId, recruiterId })
  if (!role) throw new Error('Role not found')

  const candidateIds = (await sourceForRole(role, 12)).filter((cid) => cid !== recruiterId)

  let surfaced = 0
  let declined = 0
  for (const candidateId of candidateIds) {
    const hs = await runHandshake(role, candidateId, asks)
    if (!hs) continue
    if (hs.status === 'surfaced_to_candidate') surfaced++
    else declined++
  }

  return {
    sourced: candidateIds.length,
    surfaced,
    declined,
    message:
      candidateIds.length === 0
        ? 'No verified candidates cleared the pre-filter yet.'
        : `Scout evaluated ${candidateIds.length} candidates — ${surfaced} genuine fits surfaced, ${declined} declined on the candidates' behalf.`,
  }
}
