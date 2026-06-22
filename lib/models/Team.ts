import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ITeamMember {
  userId: Types.ObjectId
  name: string
  username: string
  joinedAt: Date
  skills: Array<{ name: string; proofScore: number }>
}

export interface ITeam extends Document {
  name: string
  ownerId: Types.ObjectId
  inviteCode: string
  members: ITeamMember[]
  createdAt: Date
}

const TeamSchema = new Schema<ITeam>({
  name: { type: String, required: true, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, required: true, unique: true, index: true },
  members: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: '' },
      username: { type: String, default: '' },
      joinedAt: { type: Date, default: Date.now },
      skills: [{ name: String, proofScore: Number }],
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

export const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema)
