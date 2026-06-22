import mongoose, { Schema } from 'mongoose'

const LeaderboardAlertSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, default: '' },
  city: { type: String, default: '' },
  rank: { type: Number, required: true },
  weekOf: { type: Date, required: true },
  sentAt: { type: Date, default: Date.now },
})

LeaderboardAlertSchema.index({ userId: 1, skill: 1, city: 1, weekOf: 1 }, { unique: true })

export const LeaderboardAlert =
  mongoose.models.LeaderboardAlert ||
  mongoose.model('LeaderboardAlert', LeaderboardAlertSchema)
