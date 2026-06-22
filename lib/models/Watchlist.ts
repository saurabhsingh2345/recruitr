import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISkillAlert {
  skill: string
  alertAtScore: number
  alertedAt: Date | null
}

export interface IWatchlist extends Document {
  recruiterId: string
  candidateId: string
  roleSpecId: string | null
  skillAlerts: ISkillAlert[]
  statusAlert: boolean
  addedAt: Date
  notes: string
}

const WatchlistSchema = new Schema<IWatchlist>({
  recruiterId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true },
  roleSpecId: { type: String, default: null },
  skillAlerts: [
    {
      skill: { type: String, required: true },
      alertAtScore: { type: Number, required: true },
      alertedAt: { type: Date, default: null },
    },
  ],
  statusAlert: { type: Boolean, default: true },
  addedAt: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
})

WatchlistSchema.index({ recruiterId: 1, candidateId: 1 }, { unique: true })

export const Watchlist =
  mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema)
