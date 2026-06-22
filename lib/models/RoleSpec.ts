import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISkillBar {
  skill: string
  minScore: number
}

export interface IRoleSpec extends Document {
  recruiterId: string
  company: string
  title: string
  seniority: string                 // junior | mid | senior | staff | lead
  rawJd: string                     // original paste / conversation
  mustHave: ISkillBar[]             // bar that must be cleared
  niceHave: ISkillBar[]
  compMinLpa: number
  compMaxLpa: number
  locations: string[]               // incl. "remote"
  stage: string                     // seed | seriesA | seriesB | seriesC+ | public
  domain: string
  teamContext: string
  dealbreakers: string[]
  blind: boolean                    // hide company from candidate during inquiry
  blindScreeningEnabled: boolean    // mask candidate identity in recruiter search results
  autoSourceEnabled: boolean
  lastAutoSourceAt: Date | null
  autoSourceCount: number
  status: 'draft' | 'active' | 'paused' | 'closed'
  createdAt: Date
  updatedAt: Date
}

const SkillBarSchema = new Schema<ISkillBar>({
  skill: { type: String, required: true },
  minScore: { type: Number, default: 60 },
}, { _id: false })

const RoleSpecSchema = new Schema<IRoleSpec>({
  recruiterId: { type: String, required: true, index: true },
  company: { type: String, default: '' },
  title: { type: String, required: true },
  seniority: { type: String, default: 'mid' },
  rawJd: { type: String, default: '' },
  mustHave: { type: [SkillBarSchema], default: [] },
  niceHave: { type: [SkillBarSchema], default: [] },
  compMinLpa: { type: Number, default: 0 },
  compMaxLpa: { type: Number, default: 0 },
  locations: { type: [String], default: [] },
  stage: { type: String, default: '' },
  domain: { type: String, default: '' },
  teamContext: { type: String, default: '' },
  dealbreakers: { type: [String], default: [] },
  blind: { type: Boolean, default: false },
  blindScreeningEnabled: { type: Boolean, default: false },
  autoSourceEnabled: { type: Boolean, default: true },
  lastAutoSourceAt: { type: Date, default: null },
  autoSourceCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'active', 'paused', 'closed'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export const RoleSpec =
  mongoose.models.RoleSpec || mongoose.model<IRoleSpec>('RoleSpec', RoleSpecSchema)
