import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISavedResume extends Document {
  userId: Types.ObjectId
  jobTitle: string
  matchScore?: number
  topGaps?: string[]
  resume: {
    name: string
    headline: string
    summary: string
    skills: string[]
    experience: { title: string; company: string; duration: string; bullets: string[] }[]
    projects: { name: string; description: string; tech: string[] }[]
    education: { degree: string; school: string; year: string }[]
  }
  createdAt: Date
}

const SavedResumeSchema = new Schema<ISavedResume>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobTitle: { type: String, required: true },
  matchScore: { type: Number },
  topGaps: { type: [String], default: [] },
  resume: {
    name: { type: String, default: '' },
    headline: { type: String, default: '' },
    summary: { type: String, default: '' },
    skills: { type: [String], default: [] },
    experience: [{
      title: String, company: String, duration: String, bullets: [String],
    }],
    projects: [{
      name: String, description: String, tech: [String],
    }],
    education: [{
      degree: String, school: String, year: String,
    }],
  },
  createdAt: { type: Date, default: Date.now },
})

export const SavedResume =
  mongoose.models.SavedResume || mongoose.model<ISavedResume>('SavedResume', SavedResumeSchema)
