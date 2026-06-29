import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IHireSignal extends Document {
  userId: Types.ObjectId
  applicationId: Types.ObjectId
  skill: string
  proofScoreAtHire: number
  sessionCount: number
  sessionAvgScore: number
  targetRole: string
  hiredSalaryLPA: number
  hiredAt: Date
}

const HireSignalSchema = new Schema<IHireSignal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  skill: { type: String, required: true },
  proofScoreAtHire: { type: Number, default: 0 },
  sessionCount: { type: Number, default: 0 },
  sessionAvgScore: { type: Number, default: 0 },
  targetRole: { type: String, default: '' },
  hiredSalaryLPA: { type: Number, default: 0 },
  hiredAt: { type: Date, default: Date.now },
})

HireSignalSchema.index({ skill: 1, proofScoreAtHire: 1 })

export const HireSignal =
  mongoose.models.HireSignal ||
  mongoose.model<IHireSignal>('HireSignal', HireSignalSchema)
