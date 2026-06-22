/**
 * Autonomous sourcing queue — triggered when a candidate's profile/scores update.
 * Scout checks all active RoleSpecs for fit without recruiter intervention.
 * Falls back to inline (no-op) if Redis is unavailable.
 */
import { Queue, type ConnectionOptions } from 'bullmq'
import { getRedis } from '@/lib/queue'

const QUEUE_NAME = 'autonomous-sourcing'

const g = globalThis as unknown as {
  __autoSourcingQueue?: Queue | null
}

function getAutoSourcingQueue(): Queue | null {
  const conn = getRedis()
  if (!conn) return null
  if (g.__autoSourcingQueue === undefined) {
    g.__autoSourcingQueue = new Queue(QUEUE_NAME, {
      connection: conn as unknown as ConnectionOptions,
    })
  }
  return g.__autoSourcingQueue ?? null
}

export async function enqueueAutonomousSourcing(
  userId: string,
  updatedSkills: string[]
): Promise<string | null> {
  const q = getAutoSourcingQueue()
  if (!q) return null
  const job = await q.add(
    'auto-source',
    { userId, updatedSkills },
    {
      jobId: `auto-source:${userId}:${Date.now()}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  )
  return job.id || null
}
