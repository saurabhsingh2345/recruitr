import mongoose, { Schema, Document } from 'mongoose'

export interface IConnection {
  source: string                 // github | linkedin | stackoverflow | devto | hackernews | twitter | gitlab
  handle: string                 // username / id on that platform
  status: 'connected' | 'pending' | 'error'
  summary: string                // short human summary from last sync
  lastSyncedAt: Date | null
}

export interface IUser extends Document {
  githubId: string
  email: string
  passwordHash: string           // for credentials (recruiter) login
  authProvider: 'github' | 'credentials'
  name: string
  username: string
  avatarUrl: string
  role: 'candidate' | 'recruiter'
  // Connected external sources Atlas parses to build the identity graph
  connections: IConnection[]
  openToWork: boolean
  company: string
  jobTitle: string
  companySize: string
  openRoles: string
  currentStreak: number
  longestStreak: number
  lastSessionDate: Date | null
  freezeTokens: number
  // Candidate Agent (Atlas) — what the human privately tells their agent to enforce
  preferences: {
    minCompLpa: number          // minimum acceptable comp, in ₹ LPA
    maxCompLpa: number          // optional ceiling/expectation
    locations: string[]         // acceptable locations; "remote" allowed
    stages: string[]            // acceptable company stages
    domains: string[]           // preferred domains
    dealbreakers: string[]      // e.g. "crypto", "on-call heavy"
    noticePeriodDays: number
  }
  discoverability: 'open' | 'passive' | 'invisible'
  syncToken: string
  lastSyncAt: Date | null
  signupRef: string       // 'direct' | 'proof_page' | 'badge_click'
  signupSkill: string     // skill they came from (if proof_page)
  signupFrom: string      // username they came from (if proof_page)
  passwordResetToken: string
  passwordResetExpiry: Date | null
  subscriptionTier: 'free' | 'pro'
  stripeCustomerId: string
  stripeSubscriptionId: string
  subscriptionStatus: string          // 'active' | 'canceled' | 'past_due' | 'trialing' | ''
  subscriptionCurrentPeriodEnd: Date | null
  createdAt: Date
}

const ConnectionSchema = new Schema<IConnection>({
  source: { type: String, required: true },
  handle: { type: String, default: '' },
  status: { type: String, enum: ['connected', 'pending', 'error'], default: 'connected' },
  summary: { type: String, default: '' },
  lastSyncedAt: { type: Date, default: null },
}, { _id: false })

const UserSchema = new Schema<IUser>({
  githubId: { type: String, required: false },
  email: { type: String, required: true },
  passwordHash: { type: String, default: '' },
  authProvider: { type: String, enum: ['github', 'credentials'], default: 'github' },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  avatarUrl: { type: String, default: '' },
  role: { type: String, enum: ['candidate', 'recruiter'], default: 'candidate' },
  connections: { type: [ConnectionSchema], default: [] },
  openToWork: { type: Boolean, default: true },
  company: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  companySize: { type: String, default: '' },
  openRoles: { type: String, default: '' },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastSessionDate: { type: Date, default: null },
  freezeTokens: { type: Number, default: 0 },
  preferences: {
    minCompLpa: { type: Number, default: 0 },
    maxCompLpa: { type: Number, default: 0 },
    locations: { type: [String], default: [] },
    stages: { type: [String], default: [] },
    domains: { type: [String], default: [] },
    dealbreakers: { type: [String], default: [] },
    noticePeriodDays: { type: Number, default: 0 },
  },
  discoverability: { type: String, enum: ['open', 'passive', 'invisible'], default: 'open' },
  syncToken: { type: String, default: '' },
  lastSyncAt: { type: Date, default: null },
  signupRef: { type: String, default: 'direct' },
  signupSkill: { type: String, default: '' },
  signupFrom: { type: String, default: '' },
  passwordResetToken: { type: String, default: '' },
  passwordResetExpiry: { type: Date, default: null },
  subscriptionTier: { type: String, enum: ['free', 'pro'], default: 'free' },
  stripeCustomerId: { type: String, default: '' },
  stripeSubscriptionId: { type: String, default: '' },
  subscriptionStatus: { type: String, default: '' },
  subscriptionCurrentPeriodEnd: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
})

// Unique on githubId ONLY for real GitHub users — credentials (recruiter) users have
// no githubId, so a partial index avoids null collisions. Replaces the old non-sparse
// githubId_1 index (drop it once via scripts/fix-indexes.ts).
UserSchema.index(
  { githubId: 1 },
  { unique: true, partialFilterExpression: { githubId: { $type: 'string' } } }
)

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
