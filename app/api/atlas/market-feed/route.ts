import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { MarketFeed } from '@/lib/models/MarketFeed'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(20, parseInt(searchParams.get('limit') || '10', 10))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feed = await MarketFeed.find({})
    .sort({ demandScore: -1 })
    .limit(limit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lean<any[]>()

  return NextResponse.json({ feed, generatedAt: feed[0]?.generatedAt || null })
}
