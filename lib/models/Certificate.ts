import mongoose, { Schema, model, models, type Document, type Types } from 'mongoose'

export interface ICertificate extends Document {
  userId: Types.ObjectId
  skill: string
  milestone: number       // e.g. 70, 85 — the threshold crossed
  scoreAtIssuance: number
  evidence: string[]
  token: string           // UUID used in public URL
  issuedAt: Date
  linkedInShared: boolean
}

const CertificateSchema = new Schema<ICertificate>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skill:          { type: String, required: true },
    milestone:      { type: Number, required: true },
    scoreAtIssuance:{ type: Number, required: true },
    evidence:       [String],
    token:          { type: String, required: true, unique: true, index: true },
    issuedAt:       { type: Date, default: Date.now },
    linkedInShared: { type: Boolean, default: false },
  },
  { timestamps: false }
)

// One certificate per (user, skill, milestone)
CertificateSchema.index({ userId: 1, skill: 1, milestone: 1 }, { unique: true })

export const Certificate =
  (models.Certificate as mongoose.Model<ICertificate>) ||
  model<ICertificate>('Certificate', CertificateSchema)
