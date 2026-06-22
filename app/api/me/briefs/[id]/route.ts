import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { WeeklyBrief } from '@/lib/models/WeeklyBrief'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const brief = await WeeklyBrief.findOne({ _id: id, userId: session.user.id }).lean() as {
    subject: string; bodyHtml: string; weekOf: Date; sentAt: Date
  } | null

  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ subject: brief.subject, bodyHtml: brief.bodyHtml, weekOf: brief.weekOf, sentAt: brief.sentAt })
}
