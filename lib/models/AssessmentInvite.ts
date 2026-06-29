import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ICompetencyScore {
  key: string
  label: string
  rating: number // 1-5 anchored
  score: number // 0-100, derived
  weight: number
  evidence: string
  confidence: 'high' | 'medium' | 'low'
}

export interface IInviteRound {
  roundOrder: number
  sessionId?: Types.ObjectId
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  startedAt?: Date
  completedAt?: Date
  score?: number
  breakdown?: Record<string, number>
  competencies?: ICompetencyScore[]
  confidence?: 'high' | 'medium' | 'low'
  weight?: number
  integrity?: {
    score: number
    level: 'clean' | 'minor' | 'flagged'
    flags: string[]
    signals: {
      tabSwitches: number
      focusLossSeconds: number
      pasteCount: number
      pastedChars: number
      durationSeconds: number
    }
  }
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
  confidence: 'high' | 'medium' | 'low' | null
  integrityScore: number | null
  integrityLevel: 'clean' | 'minor' | 'flagged' | null
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
    competencies: {
      type: [
        {
          key: String,
          label: String,
          rating: Number,
          score: Number,
          weight: Number,
          evidence: String,
          confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        },
      ],
      default: undefined,
    },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: undefined },
    weight: { type: Number, default: 1 },
    integrity: {
      type: {
        score: Number,
        level: { type: String, enum: ['clean', 'minor', 'flagged'] },
        flags: { type: [String], default: [] },
        signals: {
          tabSwitches: Number,
          focusLossSeconds: Number,
          pasteCount: Number,
          pastedChars: Number,
          durationSeconds: Number,
        },
      },
      default: undefined,
    },
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
  confidence: { type: String, enum: ['high', 'medium', 'low', null], default: null },
  integrityScore: { type: Number, default: null },
  integrityLevel: { type: String, enum: ['clean', 'minor', 'flagged', null], default: null },
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
