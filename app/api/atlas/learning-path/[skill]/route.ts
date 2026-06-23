/**
 * Learning path — Atlas generates a structured learning plan for a specific skill,
 * tailored to the candidate's current proof score and recommended resources.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ skill: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { skill } = await params
  const { searchParams } = new URL(req.url)
  const goal = searchParams.get('goal') || 'proficient'

  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId: session.user.id }).lean<any>()

  const skillData = (profile?.parsedSkills || []).find(
    (s: { name: string }) => s.name.toLowerCase() === skill.toLowerCase()
  )

  const currentScore = skillData?.proofScore ?? 0
  const evidence = (skillData?.evidence || []).slice(0, 3)

  const goalDescriptions: Record<string, string> = {
    proficient: 'Proficient (70+ proof score)',
    expert: 'Expert (85+ proof score)',
    faang: 'FAANG-ready (interview-level depth at top-tier companies)',
  }
  const targetDescription = goalDescriptions[goal] || goalDescriptions['proficient']

  const model = await getModel()
  const { text } = await generateText({
    model,
    maxOutputTokens: 900,
    messages: [
      {
        role: 'system',
        content: `You are Atlas, a skill development coach. Generate a structured, actionable learning path. Return JSON with keys: "summary" (1-2 sentences), "currentLevel" (string label), "targetLevel" (string label), "estimatedWeeks" (number), "phases" (array of {title, weeks, goals: string[], resources: {name, type: "book"|"course"|"practice"|"docs", free: boolean}[]}).`,
      },
      {
        role: 'user',
        content: `Skill: ${skill}
Current proof score: ${currentScore}/100
Evidence of existing knowledge: ${evidence.join('; ') || 'none on record'}
Target: ${targetDescription}

Generate a learning path tailored to reach the stated target. If the candidate is already at the target level, focus on interview depth and advanced topics.`,
      },
    ],
  })

  let path
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    path = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, phases: [] }
  } catch {
    path = { summary: text, phases: [], estimatedWeeks: null }
  }

  return NextResponse.json({ skill, currentScore, learningPath: path })
}
