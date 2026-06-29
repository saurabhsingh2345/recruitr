/**
 * Bridges MongoDB profiles → the Typesense semantic index.
 * No-op when Typesense isn't configured (callers always have the Mongo fallback).
 */
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import {
  typesenseEnabled,
  ensureCollections,
  indexProfile,
  indexProfilesBatch,
  deleteProfileFromIndex,
  type ProfileDoc,
} from '@/lib/typesense'

interface RawSkill { name: string; proofScore: number; evidence?: string[] }
interface RawSpec { name: string; skill?: string }
interface RawProject { title?: string; description?: string }

interface RawProfile {
  userId: { toString(): string }
  isPublic?: boolean
  bio?: string
  location?: string
  targetRole?: string
  parsedSkills?: RawSkill[]
  specializations?: RawSpec[]
  projects?: RawProject[]
}

interface RawUser {
  _id: { toString(): string }
  name?: string
  username?: string
  openToWork?: boolean
}

function toDoc(profile: RawProfile, user: RawUser): ProfileDoc {
  const skills = (profile.parsedSkills || []).map((s) => s.name).filter(Boolean)
  const avgScore =
    profile.parsedSkills && profile.parsedSkills.length
      ? Math.round(profile.parsedSkills.reduce((a, s) => a + (s.proofScore || 0), 0) / profile.parsedSkills.length)
      : 0
  // Rich text the vector embedding is built from — intent search reads this.
  const searchText = [
    profile.targetRole,
    profile.bio,
    (profile.parsedSkills || []).map((s) => `${s.name} (${s.proofScore})`).join(', '),
    (profile.specializations || []).map((s) => s.name).join(', '),
    (profile.projects || []).map((p) => `${p.title || ''} ${p.description || ''}`).join('. '),
  ]
    .filter(Boolean)
    .join('. ')
    .slice(0, 4000)

  return {
    id: user._id.toString(),
    userId: user._id.toString(),
    username: user.username || '',
    name: user.name || user.username || 'Candidate',
    bio: profile.bio || '',
    location: profile.location || '',
    skills,
    searchText,
    avgScore,
    openToWork: Boolean(user.openToWork),
    updatedAt: Date.now(),
  }
}

/** Index (or remove) a single candidate after their profile changes. */
export async function syncProfileToSearch(userId: string): Promise<void> {
  if (!typesenseEnabled) return
  try {
    await connectDB()
    const profile = (await Profile.findOne({ userId }).lean()) as RawProfile | null
    const user = (await User.findById(userId).select('name username openToWork').lean()) as RawUser | null
    if (!profile || !user) return
    if (profile.isPublic === false) {
      await deleteProfileFromIndex(userId)
      return
    }
    await indexProfile(toDoc(profile, user))
  } catch (err) {
    console.error('[search-index] syncProfileToSearch failed:', err)
  }
}

/** Bulk re-index every public profile. Used by the backfill cron. */
export async function reindexAllProfiles(): Promise<{ indexed: number; total: number }> {
  if (!typesenseEnabled) return { indexed: 0, total: 0 }
  await connectDB()
  await ensureCollections()
  const profiles = (await Profile.find({ isPublic: true }).lean()) as RawProfile[]
  const userIds = profiles.map((p) => p.userId)
  const users = (await User.find({ _id: { $in: userIds } })
    .select('name username openToWork')
    .lean()) as RawUser[]
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  const docs: ProfileDoc[] = []
  for (const p of profiles) {
    const u = userMap.get(p.userId.toString())
    if (u) docs.push(toDoc(p, u))
  }
  const indexed = await indexProfilesBatch(docs)
  return { indexed, total: docs.length }
}
