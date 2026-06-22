import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IPeerMessage {
  senderUserId: Types.ObjectId
  senderName: string
  role: 'interviewer' | 'candidate' | 'ai_moderator'
  content: string
  at: Date
}

export interface IPeerSession extends Document {
  skill: string
  format: 'peer_coding' | 'peer_design' | 'peer_behavioural'
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  participants: Array<{
    userId: Types.ObjectId
    name: string
    username: string
    role: 'interviewer' | 'candidate'
    joinedAt: Date
  }>
  messages: IPeerMessage[]
  aiSummary: string
  interviewerScore: number
  createdAt: Date
  completedAt?: Date
}

const PeerSessionSchema = new Schema<IPeerSession>({
  skill: { type: String, required: true },
  format: {
    type: String,
    enum: ['peer_coding', 'peer_design', 'peer_behavioural'],
    default: 'peer_coding',
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting',
    index: true,
  },
  participants: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: '' },
      username: { type: String, default: '' },
      role: { type: String, enum: ['interviewer', 'candidate'] },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  messages: [
    {
      senderUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      senderName: { type: String, default: '' },
      role: { type: String, enum: ['interviewer', 'candidate', 'ai_moderator'] },
      content: String,
      at: { type: Date, default: Date.now },
    },
  ],
  aiSummary: { type: String, default: '' },
  interviewerScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
})

export const PeerSession =
  mongoose.models.PeerSession ||
  mongoose.model<IPeerSession>('PeerSession', PeerSessionSchema)
