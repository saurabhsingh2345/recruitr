import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { Assessment } from '@/lib/models/Assessment'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  await connectDB()

  const invite = await AssessmentInvite.findOne({ token })
  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (invite.status === 'expired') return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  if (invite.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  const assessment = await Assessment.findById(invite.assessmentId).lean()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  if (new Date(assessment.deadline) < new Date()) {
    invite.status = 'expired'
    await invite.save()
    return NextResponse.json({ error: 'Deadline passed' }, { status: 410 })
  }

  const { name, email } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
  }

  invite.candidateName = name.trim()
  invite.candidateEmail = email.trim().toLowerCase()
  if (invite.status === 'invited') invite.status = 'started'
  await invite.save()

  return NextResponse.json({ invite })
}
