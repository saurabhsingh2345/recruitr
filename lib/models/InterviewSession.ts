import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMessage {
  role: 'ai' | 'candidate'
  content: string
  timestamp: Date
  hintsUsed: number
}

export interface ICodeSubmission {
  language: string
  code: string
  judge0Output: string
  timestamp: Date
}

export interface IInsightReport {
  strengths: string[]
  gaps: string[]
  idealAnswers: Record<string, string>
  studyRecommendations: string[]
  generatedAt: Date
}

export interface IInterviewSession extends Document {
  userId: Types.ObjectId
  format: 'coding' | 'system_design' | 'project_deepdive' | 'behavioural' | 'gap'
  targetSkill: string
  status: 'in_progress' | 'completed' | 'abandoned'
  messages: IMessage[]
  codeSubmissions: ICodeSubmission[]
  scores: {
    overall: number
    breakdown: Record<string, number>
    delta: Record<string, number>
  }
  insightReport: IInsightReport
  scoreUpdate: {
    skill: string
    before: number
    after: number
    delta: number
    isFirstScore: boolean
  }
  githubContext: string
  shareToken?: string
  createdAt: Date
  completedAt: Date
}

const InterviewSessionSchema = new Schema<IInterviewSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  format: {
    type: String,
    enum: ['coding', 'system_design', 'project_deepdive', 'behavioural', 'gap'],
    required: true,
  },
  targetSkill: { type: String, required: true },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
  },
  messages: [
    {
      role: { type: String, enum: ['ai', 'candidate'] },
      content: String,
      timestamp: { type: Date, default: Date.now },
      hintsUsed: { type: Number, default: 0 },
    },
  ],
  codeSubmissions: [
    {
      language: String,
      code: String,
      judge0Output: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  scores: {
    overall: { type: Number, default: 0 },
    breakdown: { type: Map, of: Number, default: {} },
    delta: { type: Map, of: Number, default: {} },
  },
  insightReport: {
    strengths: [String],
    gaps: [String],
    idealAnswers: { type: Map, of: String, default: {} },
    studyRecommendations: [String],
    generatedAt: Date,
  },
  scoreUpdate: {
    skill: { type: String, default: '' },
    before: { type: Number, default: 0 },
    after: { type: Number, default: 0 },
    delta: { type: Number, default: 0 },
    isFirstScore: { type: Boolean, default: false },
  },
  githubContext: { type: String, default: '' },
  shareToken: { type: String, sparse: true, index: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
})

export const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model<IInterviewSession>('InterviewSession', InterviewSessionSchema)
