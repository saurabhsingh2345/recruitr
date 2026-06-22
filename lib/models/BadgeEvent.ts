import mongoose, { Schema, Document } from 'mongoose'

export interface IBadgeEvent extends Document {
  type: 'badge_serve' | 'proof_visit' | 'signup_from_proof'
  username: string
  skill: string
  referer: string
  at: Date
}

const BadgeEventSchema = new Schema<IBadgeEvent>({
  type: { type: String, enum: ['badge_serve', 'proof_visit', 'signup_from_proof'], required: true },
  username: { type: String, required: true },
  skill: { type: String, default: '' },
  referer: { type: String, default: '' },
  at: { type: Date, default: Date.now },
})

// Auto-expire after 90 days
BadgeEventSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
BadgeEventSchema.index({ type: 1, at: -1 })

export const BadgeEvent = mongoose.models.BadgeEvent || mongoose.model<IBadgeEvent>('BadgeEvent', BadgeEventSchema)
