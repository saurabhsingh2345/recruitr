import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IInviteRound {
  roundOrder: number
  sessionId?: Types.ObjectId
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  startedAt?: Date
  completedAt?: Date
  score?: number
  breakdown?: Record<string, number>
}

export interface IAssessmentInvite extends Document {
  assessmentId: Types.ObjectId
  token: string
  candidateName: string
  candidateEmail: string
  userId?: Types.ObjectId
  rounds: IInviteRound[]
  compositeScore: number
  verdict: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | null
  verdictReason: string
  status: 'invited' | 'started' | 'completed' | 'expired'
  invitedAt: Date
  completedAt?: Date
}

const InviteRoundSchema = new Schema<IInviteRound>(
  {
    roundOrder: { type: Number, required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'expired'],
      default: 'pending',
    },
    startedAt: Date,
    completedAt: Date,
    score: Number,
    breakdown: { type: Map, of: Number },
  },
  { _id: false }
)

const AssessmentInviteSchema = new Schema<IAssessmentInvite>({
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  candidateName: { type: String, default: '' },
  candidateEmail: { type: String, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  rounds: { type: [InviteRoundSchema], default: [] },
  compositeScore: { type: Number, default: 0 },
  verdict: {
    type: String,
    enum: ['strong_hire', 'hire', 'maybe', 'no_hire', null],
    default: null,
  },
  verdictReason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['invited', 'started', 'completed', 'expired'],
    default: 'invited',
  },
  invitedAt: { type: Date, default: Date.now },
  completedAt: Date,
})

export const AssessmentInvite =
  mongoose.models.AssessmentInvite ||
  mongoose.model<IAssessmentInvite>('AssessmentInvite', AssessmentInviteSchema)
