/**
 * Background worker process (run separately from the Next.js app).
 *
 *   npm run worker
 *
 * Requires REDIS_URL (TCP/TLS Redis, e.g. Upstash `rediss://…`). Processes:
 *   - connection-sync : parse a candidate's sources → merge into profile
 *   - role-sourcing   : Scout sources the pool + runs handshakes
 *
 * The Next.js routes enqueue jobs; this process does the slow work so requests
 * never block on LinkedIn scrapes or large sourcing runs.
 */

import './lib/loadEnv' // MUST be first — loads .env.local before any env-reading module
import { Worker, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import { QUEUE_SYNC, QUEUE_SOURCING } from './lib/queue'
import { runConnectionSync } from './lib/jobs/syncConnections'
import { runSourcing } from './lib/jobs/runSourcing'
import { runAutonomousSourcing } from './lib/jobs/autonomousSourcing'

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  console.error('✗ REDIS_URL is not set — worker cannot start. Set it to your Upstash rediss:// URL.')
  process.exit(1)
}

const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
// bullmq bundles its own ioredis copy → cast (runtime is compatible ioredis 5.x)
const connection = redis as unknown as ConnectionOptions

const syncWorker = new Worker(
  QUEUE_SYNC,
  async (job) => {
    console.log(`[sync] ${job.id} — user ${job.data.userId}`)
    return runConnectionSync(job.data.userId)
  },
  { connection, concurrency: 3 }
)

const sourcingWorker = new Worker(
  QUEUE_SOURCING,
  async (job) => {
    console.log(`[sourcing] ${job.id} — role ${job.data.roleId}`)
    return runSourcing(job.data.roleId, job.data.recruiterId, job.data.asks || [])
  },
  { connection, concurrency: 2 }
)

const autoSourcingWorker = new Worker(
  'autonomous-sourcing',
  async (job) => {
    console.log(`[auto-sourcing] ${job.id} — user ${job.data.userId}`)
    return runAutonomousSourcing(job.data.userId, job.data.updatedSkills || [])
  },
  { connection, concurrency: 3 }
)

for (const [name, w] of [
  ['sync', syncWorker],
  ['sourcing', sourcingWorker],
  ['auto-sourcing', autoSourcingWorker],
] as const) {
  w.on('completed', (job) => console.log(`✓ [${name}] ${job.id} done`))
  w.on('failed', (job, err) => console.error(`✗ [${name}] ${job?.id} failed:`, err.message))
}

console.log('✓ Worker running — listening on connection-sync + role-sourcing + autonomous-sourcing')

async function shutdown() {
  console.log('\nShutting down workers…')
  await Promise.all([syncWorker.close(), sourcingWorker.close(), autoSourcingWorker.close()])
  await redis.quit()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
