/**
 * BullMQ queue layer (plan §10).
 *
 * Heavy/slow work — multi-source profile sync (incl. LinkedIn scraping) and
 * Scout sourcing — runs in background workers instead of blocking requests.
 *
 * Graceful degradation: if REDIS_URL is not set, the queue is disabled and
 * callers fall back to running the work inline. The app works either way.
 *
 * REDIS_URL must be a TCP/TLS Redis connection string (e.g. Upstash's
 * `rediss://default:<token>@<host>:6379`), NOT the REST URL.
 */

import { Queue, type JobsOptions, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'

export const QUEUE_SYNC = 'connection-sync'
export const QUEUE_SOURCING = 'role-sourcing'

const REDIS_URL = process.env.REDIS_URL || ''

// Reuse one connection across hot reloads / serverless invocations
const g = globalThis as unknown as {
  __redis?: IORedis | null
  __queues?: Record<string, Queue>
}

export function getRedis(): IORedis | null {
  if (!REDIS_URL) return null
  if (g.__redis !== undefined) return g.__redis
  try {
    g.__redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    })
    g.__redis.on('error', (e) => console.error('[redis] error:', e.message))
  } catch (err) {
    console.error('[redis] failed to connect:', err)
    g.__redis = null
  }
  return g.__redis
}

export function isQueueEnabled(): boolean {
  return !!getRedis()
}

function getQueue(name: string): Queue | null {
  const conn = getRedis()
  if (!conn) return null
  g.__queues = g.__queues || {}
  if (!g.__queues[name]) {
    // bullmq bundles its own ioredis copy → cast (runtime is compatible ioredis 5.x)
    g.__queues[name] = new Queue(name, { connection: conn as unknown as ConnectionOptions })
  }
  return g.__queues[name]
}

const defaultOpts: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 3600, count: 200 },
  removeOnFail: { age: 86400 },
}

/** Enqueue a profile sync. Returns jobId, or null if queue disabled. */
export async function enqueueSync(userId: string): Promise<string | null> {
  const q = getQueue(QUEUE_SYNC)
  if (!q) return null
  const job = await q.add('sync', { userId }, { ...defaultOpts, jobId: `sync:${userId}:${Date.now()}` })
  return job.id || null
}

/** Enqueue Scout sourcing for a role. Returns jobId, or null if queue disabled. */
export async function enqueueSourcing(
  roleId: string,
  recruiterId: string,
  asks: string[]
): Promise<string | null> {
  const q = getQueue(QUEUE_SOURCING)
  if (!q) return null
  const job = await q.add(
    'source',
    { roleId, recruiterId, asks },
    { ...defaultOpts, jobId: `source:${roleId}:${Date.now()}` }
  )
  return job.id || null
}

/** Look up a job's state + result across our queues (for status polling). */
export async function getJobStatus(jobId: string): Promise<{
  found: boolean
  state?: string
  progress?: unknown
  result?: unknown
  failedReason?: string
}> {
  for (const name of [QUEUE_SYNC, QUEUE_SOURCING]) {
    const q = getQueue(name)
    if (!q) continue
    const job = await q.getJob(jobId)
    if (job) {
      const state = await job.getState()
      return {
        found: true,
        state,
        progress: job.progress,
        result: job.returnvalue,
        failedReason: job.failedReason,
      }
    }
  }
  return { found: false }
}
