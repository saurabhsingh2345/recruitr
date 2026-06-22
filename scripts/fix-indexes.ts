/**
 * One-time migration: fix the users.githubId index.
 *
 *   npx tsx scripts/fix-indexes.ts
 *
 * The old `githubId_1` index was non-sparse unique, so credentials (recruiter)
 * users with no githubId collided on null. This drops it, unsets stray nulls,
 * and rebuilds indexes so the new partial unique index takes effect.
 */
import '../lib/loadEnv'
import mongoose from 'mongoose'
import { User } from '../lib/models/User'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  await mongoose.connect(uri)
  const coll = mongoose.connection.collection('users')

  // 1) Drop the old githubId index if present
  const indexes = await coll.indexes()
  for (const idx of indexes) {
    if (idx.name === 'githubId_1') {
      await coll.dropIndex('githubId_1')
      console.log('✓ dropped old githubId_1 index')
    }
  }

  // 2) Unset githubId on docs where it is null (so the partial index ignores them)
  const res = await coll.updateMany(
    { githubId: null },
    { $unset: { githubId: '' } }
  )
  console.log(`✓ unset null githubId on ${res.modifiedCount} document(s)`)

  // 3) Rebuild indexes from the schema (creates the partial unique index)
  await User.syncIndexes()
  console.log('✓ indexes synced')

  const after = await coll.indexes()
  console.log('current indexes:', after.map((i) => i.name).join(', '))

  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
