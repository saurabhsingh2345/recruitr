import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Team } from '@/lib/models/Team'
import { generateText } from 'ai'
import { getModel } from '@/lib/groq'

const TRACKED_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js',
  'Python', 'System Design', 'Algorithms', 'SQL',
  'DevOps', 'General',
]

interface RadarPoint {
  skill: string
  teamAvg: number
  maxMember: number
  coverage: number // how many members have a score
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const team = await Team.findById(id).lean()
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const isMember = team.members.some((m: { userId: { toString(): string } }) => m.userId.toString() === session.user.id)
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const memberCount = team.members.length

  // Aggregate skill scores across members
  const skillMap = new Map<string, number[]>()
  for (const skill of TRACKED_SKILLS) skillMap.set(skill, [])

  for (const member of team.members as Array<{ skills: Array<{ name: string; proofScore: number }> }>) {
    for (const ms of member.skills) {
      const normalized = TRACKED_SKILLS.find(
        s => s.toLowerCase() === ms.name.toLowerCase()
      )
      if (normalized) {
        skillMap.get(normalized)!.push(ms.proofScore)
      }
    }
  }

  const radar: RadarPoint[] = TRACKED_SKILLS.map(skill => {
    const scores = skillMap.get(skill)!
    const avg = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0
    return {
      skill,
      teamAvg: avg,
      maxMember: scores.length > 0 ? Math.max(...scores) : 0,
      coverage: scores.length,
    }
  }).filter(p => p.coverage > 0)

  // Gaps: skills with avg < 50 or coverage < half the team
  const gaps = radar.filter(p => p.teamAvg < 50 || p.coverage < memberCount / 2)
    .map(p => p.skill)

  // Strengths: top 3 by avg
  const strengths = [...radar]
    .sort((a, b) => b.teamAvg - a.teamAvg)
    .slice(0, 3)
    .map(p => p.skill)

  // AI hire recommendation
  let aiRecommendation = ''
  if (radar.length > 0) {
    const summary = radar
      .map(p => `${p.skill}: avg ${p.teamAvg}/100, ${p.coverage}/${memberCount} members have scores`)
      .join('\n')
    try {
      const { text } = await generateText({
        model: await getModel(),
        prompt: `This is a team's aggregated skill data:
${summary}

Based on the gaps, write 2-3 sentences recommending what type of engineer to hire next to round out the team. Be specific about skill gaps. Output only the recommendation text.`,
        maxOutputTokens: 150,
      })
      aiRecommendation = text.trim()
    } catch {
      aiRecommendation = `Consider hiring engineers with strong ${gaps.slice(0, 2).join(' and ')} skills to fill the team's current gaps.`
    }
  }

  return NextResponse.json({
    radar,
    strengths,
    gaps,
    memberCount,
    aiRecommendation,
  })
}
