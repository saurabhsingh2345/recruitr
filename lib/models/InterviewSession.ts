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

export interface IWeaknessSignal {
  skill: string
  topic: string
  severity: 1 | 2 | 3
  sessionId: Types.ObjectId
  at: Date
}

export interface INextSessionRec {
  format: string
  skill: string
  reason: string
}

export interface IInsightReport {
  strengths: string[]
  gaps: string[]
  gapsWithNextSteps: Array<{ gap: string; nextStep: string }>
  idealAnswers: Array<{ question: string; answer: string }>
  studyRecommendations: string[]
  aiVerdict: string
  weaknessSignals: IWeaknessSignal[]
  nextSessionRec: INextSessionRec | null
  progressionSignal: string
  specializationImpact: string
  generatedAt: Date
}

export interface IRigorConditions {
  faceDetectionActive: boolean
  fullScreenEnforced: boolean
  copyPasteBlocked: boolean
  windowSwitchDetected: boolean
  capturedAt: Date
}

export interface IInterviewSession extends Document {
  userId: Types.ObjectId
  format: 'coding' | 'system_design' | 'project_deepdive' | 'behavioural' | 'gap' | 'pm_case' | 'design_critique' | 'ops_case' | 'sales_discovery'
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
  memoryContext: string
  companyMode?: { jdSnippet: string; style: string; company: string }
  rigorConditions?: IRigorConditions
  shareToken?: string
  createdAt: Date
  completedAt: Date
}

const InterviewSessionSchema = new Schema<IInterviewSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  format: {
    type: String,
    enum: ['coding', 'system_design', 'project_deepdive', 'behavioural', 'gap', 'pm_case', 'design_critique', 'ops_case', 'sales_discovery'],
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
    gapsWithNextSteps: {
      type: [{ gap: String, nextStep: String }],
      default: [],
    },
    idealAnswers: { type: [{ question: String, answer: String }], default: [] },
    studyRecommendations: [String],
    aiVerdict: { type: String, default: '' },
    weaknessSignals: {
      type: [{
        skill: String,
        topic: String,
        severity: { type: Number, min: 1, max: 3, default: 1 },
        sessionId: Schema.Types.ObjectId,
        at: { type: Date, default: Date.now },
      }],
      default: [],
    },
    nextSessionRec: {
      type: { format: String, skill: String, reason: String },
      default: null,
    },
    progressionSignal: { type: String, default: '' },
    specializationImpact: { type: String, default: '' },
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
  memoryContext: { type: String, default: '' },
  companyMode: {
    jdSnippet: { type: String, default: '' },
    style: { type: String, default: '' },
    company: { type: String, default: '' },
  },
  rigorConditions: {
    type: {
      faceDetectionActive: { type: Boolean, default: false },
      fullScreenEnforced: { type: Boolean, default: false },
      copyPasteBlocked: { type: Boolean, default: false },
      windowSwitchDetected: { type: Boolean, default: false },
      capturedAt: { type: Date, default: Date.now },
    },
    default: null,
  },
  shareToken: { type: String, sparse: true, index: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
})

export const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model<IInterviewSession>('InterviewSession', InterviewSessionSchema)
