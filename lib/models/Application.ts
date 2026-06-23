import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IThreadMessage {
  _id?: Types.ObjectId
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  type: 'text' | 'schedule_invite' | 'schedule_confirmed' | 'schedule_declined' | 'outcome'
  timestamp: Date
  readBy: string[]
}

export interface IScheduledInterview {
  date: string       // "2024-07-15"
  time: string       // "14:30"
  timezone: string   // "Asia/Kolkata"
  type: 'video' | 'phone' | 'in_person'
  meetLink?: string
  notes?: string
  status: 'proposed' | 'confirmed' | 'declined' | 'completed'
}

export interface IApplication extends Document {
  recruiterId: string
  candidateId: string
  recruiterInfo: {
    name: string
    company: string
    title: string
    avatarUrl: string
    username: string
  }
  candidateInfo: {
    name: string
    username: string
    avatarUrl: string
    targetRole: string
  }
  jobTitle?: string
  status: 'active' | 'screening' | 'interview_scheduled' | 'offer_extended' | 'hired' | 'rejected' | 'withdrawn'
  messages: IThreadMessage[]
  interview?: IScheduledInterview
  outcome?: {
    result: 'hired' | 'rejected' | 'withdrawn'
    notes?: string
    updatedAt: Date
    hiredCompany?: string
    hiredRole?: string
    hiredSalaryLPA?: number
    hiredAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

const ThreadMessageSchema = new Schema<IThreadMessage>({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'schedule_invite', 'schedule_confirmed', 'schedule_declined', 'outcome'],
    default: 'text',
  },
  timestamp: { type: Date, default: Date.now },
  readBy: [{ type: String }],
})

const ApplicationSchema = new Schema<IApplication>(
  {
    recruiterId: { type: String, required: true },
    candidateId: { type: String, required: true },
    recruiterInfo: {
      name: { type: String, required: true },
      company: { type: String, default: '' },
      title: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
      username: { type: String, default: '' },
    },
    candidateInfo: {
      name: { type: String, required: true },
      username: { type: String, required: true },
      avatarUrl: { type: String, default: '' },
      targetRole: { type: String, default: '' },
    },
    jobTitle: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'screening', 'interview_scheduled', 'offer_extended', 'hired', 'rejected', 'withdrawn'],
      default: 'active',
    },
    messages: [ThreadMessageSchema],
    interview: {
      date: String,
      time: String,
      timezone: { type: String, default: 'Asia/Kolkata' },
      type: { type: String, enum: ['video', 'phone', 'in_person'], default: 'video' },
      meetLink: String,
      notes: String,
      status: {
        type: String,
        enum: ['proposed', 'confirmed', 'declined', 'completed'],
        default: 'proposed',
      },
    },
    outcome: {
      result: { type: String, enum: ['hired', 'rejected', 'withdrawn'] },
      notes: String,
      updatedAt: Date,
      hiredCompany: String,
      hiredRole: String,
      hiredSalaryLPA: Number,
      hiredAt: Date,
    },
  },
  { timestamps: true }
)

ApplicationSchema.index({ recruiterId: 1 })
ApplicationSchema.index({ candidateId: 1 })

export const Application =
  mongoose.models.Application ||
  mongoose.model<IApplication>('Application', ApplicationSchema)
