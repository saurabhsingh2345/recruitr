import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { targetRole, targetLevel, targetStage, targetLocation, targetSalaryLPA } = await req.json()

    if (!targetRole || !targetLevel) {
      return NextResponse.json({ error: 'targetRole and targetLevel are required' }, { status: 400 })
    }

    await connectDB()

    const profile = await Profile.findOneAndUpdate(
      { userId: session.user.id },
      {
        careerGoal: {
          targetRole: String(targetRole).trim(),
          targetLevel: String(targetLevel).trim(),
          targetStage: String(targetStage || 'Any').trim(),
          targetLocation: String(targetLocation || 'Any').trim(),
          targetSalaryLPA: Number(targetSalaryLPA) || 0,
          setAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { new: true, select: '-embeddings -rawResumeText' }
    )

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Career goal error:', err)
    return NextResponse.json({ error: 'Failed to save career goal' }, { status: 500 })
  }
}
