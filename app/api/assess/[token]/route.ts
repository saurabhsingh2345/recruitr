import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { Assessment } from '@/lib/models/Assessment'
import { User } from '@/lib/models/User'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  await connectDB()

  const invite = await AssessmentInvite.findOne({ token }).lean()
  if (!invite) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })

  const assessment = await Assessment.findById(invite.assessmentId).lean()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const recruiter = await User.findById(assessment.recruiterId)
    .select('name company')
    .lean()

  return NextResponse.json({
    invite,
    assessment,
    company: (recruiter as { company?: string; name?: string } | null)?.company ||
      (recruiter as { name?: string } | null)?.name || 'The company',
  })
}
