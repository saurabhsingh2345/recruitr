/**
 * Interview question generator — generates tailored questions for a specific application.
 * Uses candidate's proof scores + role requirements to focus questions on gap areas.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Application } from '@/lib/models/Application'
import { Profile } from '@/lib/models/Profile'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const application = await Application.findById(id).lean<any>()
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Application has no roleId FK — verify recruiter owns it directly, then find the role by jobTitle
  if (application.recruiterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Best-effort: match role by recruiter + jobTitle (most recent if multiple)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = await RoleSpec.findOne({
    recruiterId: session.user.id,
    ...(application.jobTitle ? { title: application.jobTitle } : {}),
  }).sort({ updatedAt: -1 }).lean<any>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId: application.candidateId }).lean<any>()

  const mustHave = role?.mustHave || []
  const candidateSkills = profile?.parsedSkills || []

  // Find gap skills (required but candidate is below bar or missing)
  const gaps = mustHave.filter((req: { skill: string; minScore: number }) => {
    const found = candidateSkills.find(
      (s: { name: string; proofScore: number }) => s.name.toLowerCase() === req.skill.toLowerCase()
    )
    return !found || found.proofScore < req.minScore
  })

  // Strong skills (well above bar)
  const strengths = mustHave
    .filter((req: { skill: string; minScore: number }) => {
      const found = candidateSkills.find(
        (s: { name: string; proofScore: number }) => s.name.toLowerCase() === req.skill.toLowerCase()
      )
      return found && found.proofScore >= req.minScore + 15
    })
    .slice(0, 3)

  const model = await getModel()
  const { text } = await generateText({
    model,
    maxOutputTokens: 800,
    messages: [
      {
        role: 'system',
        content: `You are a senior technical interviewer. Generate focused, probing interview questions. Return a JSON object with keys: "gapQuestions" (array of {question, skill, rationale}), "verifyQuestions" (array of {question, skill}), "behavioralQuestions" (array of strings). Each array has 3-5 items.`,
      },
      {
        role: 'user',
        content: `Role: ${role?.title || application.jobTitle || 'Engineering'} at ${role?.company || application.recruiterInfo?.company || 'the company'}

Gap skills (probe these hard): ${gaps.map((g: { skill: string; minScore: number }) => `${g.skill} (need ≥${g.minScore})`).join(', ') || 'none'}

Strength skills (verify depth): ${strengths.map((s: { skill: string }) => s.skill).join(', ') || 'none'}

Role context: ${role?.teamContext || 'Standard engineering role'}

Generate interview questions JSON.`,
      },
    ],
  })

  let parsed
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { gapQuestions: [], verifyQuestions: [], behavioralQuestions: [] }
  } catch {
    parsed = { gapQuestions: [], verifyQuestions: [], behavioralQuestions: [], raw: text }
  }

  return NextResponse.json({ questions: parsed, gaps: gaps.length, roleTitle: role?.title || application.jobTitle || '' })
}
