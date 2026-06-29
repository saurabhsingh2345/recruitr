import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IAssessmentRound {
  order: number
  format: string
  title: string
  durationMinutes: number
  instructions?: string
  weight?: number // round importance (default 1) — drives weighted composite
  mustHaveCompetencies?: string[] // competency keys that must reach "meets bar" (rating ≥ 3)
}

export interface IAssessment extends Document {
  recruiterId: Types.ObjectId
  title: string
  role: string
  rounds: IAssessmentRound[]
  deadline: Date
  status: 'draft' | 'active' | 'closed'
  createdAt: Date
}

const AssessmentSchema = new Schema<IAssessment>({
  recruiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  role: { type: String, required: true },
  rounds: [
    {
      order: { type: Number, required: true },
      format: { type: String, required: true },
      title: { type: String, required: true },
      durationMinutes: { type: Number, default: 30 },
      instructions: { type: String, default: '' },
      weight: { type: Number, default: 1 },
      mustHaveCompetencies: { type: [String], default: [] },
    },
  ],
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
})

export const Assessment =
  mongoose.models.Assessment || mongoose.model<IAssessment>('Assessment', AssessmentSchema)
