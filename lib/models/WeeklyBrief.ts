import mongoose, { Schema, model, models, type Document, type Types } from 'mongoose'

export interface IWeeklyBrief extends Document {
  userId: Types.ObjectId
  weekOf: Date           // Monday of the week
  sentAt: Date
  subject: string
  bodyHtml: string
}

const WeeklyBriefSchema = new Schema<IWeeklyBrief>({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekOf:   { type: Date, required: true },
  sentAt:   { type: Date, default: Date.now },
  subject:  { type: String, required: true },
  bodyHtml: { type: String, required: true },
})

WeeklyBriefSchema.index({ userId: 1, weekOf: 1 }, { unique: true })

export const WeeklyBrief =
  (models.WeeklyBrief as mongoose.Model<IWeeklyBrief>) ||
  model<IWeeklyBrief>('WeeklyBrief', WeeklyBriefSchema)
