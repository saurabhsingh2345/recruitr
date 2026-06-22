import mongoose, { Schema, model, models, type Document } from 'mongoose'

export interface IMarketFeedItem extends Document {
  skill: string
  demandScore: number       // 0-100 composite from active role count + interview frequency
  demandDelta: number       // week-over-week change
  activeRoles: number
  avgProofScore: number     // avg proof score across all candidates who have this skill
  candidateCount: number    // how many verified candidates hold this skill
  topCohortPct: number      // what percentile the top 10% sit at
  generatedAt: Date
  ttlExpiry: Date
}

const MarketFeedSchema = new Schema<IMarketFeedItem>(
  {
    skill:           { type: String, required: true },
    demandScore:     { type: Number, default: 0 },
    demandDelta:     { type: Number, default: 0 },
    activeRoles:     { type: Number, default: 0 },
    avgProofScore:   { type: Number, default: 0 },
    candidateCount:  { type: Number, default: 0 },
    topCohortPct:    { type: Number, default: 0 },
    generatedAt:     { type: Date, default: Date.now },
    ttlExpiry:       { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: false }
)

// One feed item per skill — replace on daily refresh
MarketFeedSchema.index({ skill: 1 }, { unique: true })
MarketFeedSchema.index({ demandScore: -1 })

export const MarketFeed =
  (models.MarketFeed as mongoose.Model<IMarketFeedItem>) ||
  model<IMarketFeedItem>('MarketFeed', MarketFeedSchema)
