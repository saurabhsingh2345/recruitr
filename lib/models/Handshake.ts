import mongoose, { Schema, Document } from 'mongoose'

/**
 * A Handshake is the agent-to-agent negotiation record between
 * Scout (recruiter agent) and Atlas (candidate agent) for one (role, candidate) pair.
 * Every exchange is logged and visible to the candidate — trust requirement.
 */

export interface IEvidenceSnapshot {
  skillName: string
  proofScore: number
  snapshotAt: Date
}

export interface IAgentExchange {
  from: 'scout' | 'atlas'
  kind: 'fit_inquiry' | 'ask' | 'answer' | 'verdict' | 'note'
  content: string
  evidenceSnapshot: IEvidenceSnapshot[]
  at: Date
}

export interface ISkillMatchRecord {
  skill: string
  required: number
  candidateScore: number | null
  cleared: boolean
}

export interface IFitVerdict {
  mutualFit: boolean
  techBarCleared: boolean
  compOverlap: boolean
  locationMatch: boolean
  stageMatch: boolean
  dealbreakerHit: boolean
  skillMatches: ISkillMatchRecord[]
  reasoning: string
  score: number              // 0-100 overall fit
}

export interface IHandshake extends Document {
  roleSpecId: string
  recruiterId: string
  candidateId: string
  // denormalized for fast list rendering
  candidateName: string
  candidateUsername: string
  candidateAvatar: string
  roleTitle: string
  company: string
  blind: boolean
  // lifecycle
  status:
    | 'inquiry_sent'         // Scout reached out to Atlas
    | 'evaluating'           // Atlas is assessing
    | 'declined_by_atlas'    // no mutual fit — human never bothered
    | 'surfaced_to_candidate'// Atlas surfaced a real fit to the human
    | 'candidate_accepted'   // human said yes
    | 'candidate_declined'   // human said no
    | 'connected'            // thread opened, humans talking
    | 'expired'
  verdict: IFitVerdict | null
  exchanges: IAgentExchange[]
  surfacingMessage: string       // Atlas's message to the human candidate (if mutual fit)
  applicationId: string | null   // set once a thread/connection opens
  createdAt: Date
  updatedAt: Date
}

const EvidenceSnapshotSchema = new Schema<IEvidenceSnapshot>({
  skillName: { type: String, required: true },
  proofScore: { type: Number, default: 0 },
  snapshotAt: { type: Date, default: Date.now },
}, { _id: false })

const AgentExchangeSchema = new Schema<IAgentExchange>({
  from: { type: String, enum: ['scout', 'atlas'], required: true },
  kind: { type: String, enum: ['fit_inquiry', 'ask', 'answer', 'verdict', 'note'], required: true },
  content: { type: String, required: true },
  evidenceSnapshot: { type: [EvidenceSnapshotSchema], default: [] },
  at: { type: Date, default: Date.now },
}, { _id: false })

const SkillMatchRecordSchema = new Schema<ISkillMatchRecord>({
  skill: { type: String, required: true },
  required: { type: Number, default: 0 },
  candidateScore: { type: Number, default: null },
  cleared: { type: Boolean, default: false },
}, { _id: false })

const FitVerdictSchema = new Schema<IFitVerdict>({
  mutualFit: { type: Boolean, default: false },
  techBarCleared: { type: Boolean, default: false },
  compOverlap: { type: Boolean, default: false },
  locationMatch: { type: Boolean, default: false },
  stageMatch: { type: Boolean, default: false },
  dealbreakerHit: { type: Boolean, default: false },
  skillMatches: { type: [SkillMatchRecordSchema], default: [] },
  reasoning: { type: String, default: '' },
  score: { type: Number, default: 0 },
}, { _id: false })

const HandshakeSchema = new Schema<IHandshake>({
  roleSpecId: { type: String, required: true, index: true },
  recruiterId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true, index: true },
  candidateName: { type: String, default: '' },
  candidateUsername: { type: String, default: '' },
  candidateAvatar: { type: String, default: '' },
  roleTitle: { type: String, default: '' },
  company: { type: String, default: '' },
  blind: { type: Boolean, default: false },
  status: {
    type: String,
    enum: [
      'inquiry_sent', 'evaluating', 'declined_by_atlas', 'surfaced_to_candidate',
      'candidate_accepted', 'candidate_declined', 'connected', 'expired',
    ],
    default: 'inquiry_sent',
  },
  verdict: { type: FitVerdictSchema, default: null },
  exchanges: { type: [AgentExchangeSchema], default: [] },
  surfacingMessage: { type: String, default: '' },
  applicationId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// One handshake per (role, candidate)
HandshakeSchema.index({ roleSpecId: 1, candidateId: 1 }, { unique: true })

export const Handshake =
  mongoose.models.Handshake || mongoose.model<IHandshake>('Handshake', HandshakeSchema)
