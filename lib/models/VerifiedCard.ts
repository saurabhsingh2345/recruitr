import mongoose, { Schema, Document, Types } from 'mongoose'
import crypto from 'crypto'

export interface ITopSkill {
  name: string
  score: number
  percentile: number
}

export interface IVerifiedCard extends Document {
  userId: Types.ObjectId
  targetRole: string
  targetLevel: string
  topSkills: ITopSkill[]
  sessionCount: number
  issuedAt: Date
  cardToken: string
  shareCount: number
}

const VerifiedCardSchema = new Schema<IVerifiedCard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetRole: { type: String, required: true },
  targetLevel: { type: String, default: '' },
  topSkills: {
    type: [{
      name: { type: String, required: true },
      score: { type: Number, default: 0 },
      percentile: { type: Number, default: 0 },
    }],
    default: [],
  },
  sessionCount: { type: Number, default: 0 },
  issuedAt: { type: Date, default: Date.now },
  cardToken: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex'),
  },
  shareCount: { type: Number, default: 0 },
})

VerifiedCardSchema.index({ userId: 1 })
VerifiedCardSchema.index({ cardToken: 1 })

export const VerifiedCard =
  mongoose.models.VerifiedCard ||
  mongoose.model<IVerifiedCard>('VerifiedCard', VerifiedCardSchema)
