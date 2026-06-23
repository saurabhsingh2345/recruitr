import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISkillHistoryEntry {
  score: number
  source: string
  at: Date
}

export interface ISkill {
  name: string
  evidence: string[]
  proofScore: number
  lastUpdated: Date
  scoreHistory: ISkillHistoryEntry[]
}

export interface IPortfolioProject {
  title: string
  description: string
  techStack: string[]
  images: string[]     // Cloudinary URLs
  videoUrl: string     // Cloudinary or YouTube URL
  liveUrl: string
  githubUrl: string
  featured: boolean
  order: number
}

export interface IPortfolioCustomization {
  customTitle: string
  accentColor: string
  socialLinks: { platform: string; url: string }[]
  showSkills: boolean
  showExperience: boolean
  showProjects: boolean
  showEducation: boolean
}

export interface IExperience {
  title: string
  company: string
  duration: string
  location?: string
}

export interface IEducation {
  institution: string
  degree: string
}

export interface IProject {
  repoName: string
  description: string
  techStack: string[]
  complexityScore: number
  readmeSummary: string
  githubUrl: string
  stars: number
  language: string
}

export interface IProfile extends Document {
  userId: Types.ObjectId
  githubUsername: string
  rawResumeText: string
  parsedSkills: ISkill[]
  projects: IProject[]
  experiences: IExperience[]
  educations: IEducation[]
  embeddings: number[]
  cohortPercentile: number
  targetRole: string
  yearsOfExperience: number
  location: string
  bio: string
  isPublic: boolean
  vouchedBadge: boolean
  vouchedBy: Types.ObjectId | null
  portfolioProjects: IPortfolioProject[]
  portfolioTheme: 'minimal' | 'terminal' | 'magazine' | 'bento'
  portfolioCustomization: IPortfolioCustomization
  onboardingComplete: boolean
  onboardingStep: number   // 0=not started, 1=github, 2=session_started, 3=done
  githubActivitySummary: string  // 1-2 sentence AI summary of recent GitHub activity; feeds Atlas context
  updatedAt: Date
}

const ProfileSchema = new Schema<IProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  githubUsername: { type: String, default: '' },
  rawResumeText: { type: String, default: '' },
  parsedSkills: [
    {
      name: String,
      evidence: [String],
      proofScore: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      scoreHistory: {
        type: [{ score: Number, source: String, at: { type: Date, default: Date.now } }],
        default: [],
      },
    },
  ],
  projects: [
    {
      repoName: String,
      description: String,
      techStack: [String],
      complexityScore: { type: Number, default: 0 },
      readmeSummary: String,
      githubUrl: String,
      stars: { type: Number, default: 0 },
      language: String,
    },
  ],
  experiences: [
    {
      title: { type: String, default: '' },
      company: { type: String, default: '' },
      duration: { type: String, default: '' },
      location: { type: String, default: '' },
    },
  ],
  educations: [
    {
      institution: { type: String, default: '' },
      degree: { type: String, default: '' },
    },
  ],
  embeddings: { type: [Number], default: [] },
  cohortPercentile: { type: Number, default: 0 },
  targetRole: { type: String, default: '' },
  yearsOfExperience: { type: Number, default: 0 },
  location: { type: String, default: '' },
  bio: { type: String, default: '' },
  isPublic: { type: Boolean, default: true },
  vouchedBadge: { type: Boolean, default: false },
  vouchedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  portfolioProjects: [
    {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      techStack: { type: [String], default: [] },
      images: { type: [String], default: [] },
      videoUrl: { type: String, default: '' },
      liveUrl: { type: String, default: '' },
      githubUrl: { type: String, default: '' },
      featured: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
    },
  ],
  portfolioTheme: {
    type: String,
    enum: ['minimal', 'terminal', 'magazine', 'bento'],
    default: 'minimal',
  },
  portfolioCustomization: {
    customTitle: { type: String, default: '' },
    accentColor: { type: String, default: '' },
    socialLinks: { type: [{ platform: String, url: String }], default: [] },
    showSkills: { type: Boolean, default: true },
    showExperience: { type: Boolean, default: true },
    showProjects: { type: Boolean, default: true },
    showEducation: { type: Boolean, default: true },
  },
  onboardingComplete: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 0 },
  githubActivitySummary: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
})

export const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema)
