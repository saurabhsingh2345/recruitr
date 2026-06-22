import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { WeeklyBrief } from '@/lib/models/WeeklyBrief'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const briefs = await WeeklyBrief.find({ userId: session.user.id })
    .sort({ weekOf: -1 })
    .limit(52)
    .select('weekOf sentAt subject')
    .lean()

  return NextResponse.json({ briefs })
}
