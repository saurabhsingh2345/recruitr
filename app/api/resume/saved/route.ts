import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { SavedResume } from '@/lib/models/SavedResume'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const resumes = await SavedResume.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .select('jobTitle createdAt resume.headline')
    .lean()

  return NextResponse.json({ resumes })
}
