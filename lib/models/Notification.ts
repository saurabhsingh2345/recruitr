import mongoose, { Schema, Document, Types } from 'mongoose'

export type NotificationType =
  | 'handshake_surfaced'
  | 'score_milestone'
  | 'leaderboard_entry'
  | 'certificate_issued'
  | 'weekly_brief'
  | 'recruiter_viewed'
  | 'interview_complete'

export interface INotification extends Document {
  userId: Types.ObjectId
  type: NotificationType
  title: string
  body: string
  link: string
  read: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
})

// TTL: auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)
