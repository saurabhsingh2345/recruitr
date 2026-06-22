/**
 * Negotiation coaching — Atlas analyzes an offer against candidate's proof scores
 * and market data, returning personalized negotiation talking points.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { offeredCompLpa, companyName, roleTitle, location } = body

  if (!offeredCompLpa || !companyName || !roleTitle) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(session.user.id).lean<any>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId: session.user.id }).lean<any>()

  const topSkills = (profile?.parsedSkills || [])
    .sort((a: { proofScore: number }, b: { proofScore: number }) => b.proofScore - a.proofScore)
    .slice(0, 6)
    .map((s: { name: string; proofScore: number }) => `${s.name} (proof score: ${s.proofScore})`)

  const userPrefs = user?.preferences || {}

  const model = await getModel()
  const { text } = await generateText({
    model,
    maxOutputTokens: 700,
    messages: [
      {
        role: 'system',
        content: `You are Atlas, a career negotiation coach. Based on the candidate's verified proof scores and offer details, provide concrete, personalized negotiation advice. Return JSON with keys: "assessment" (string, 2-3 sentences on the offer), "askAmount" (number, suggested counter-offer in LPA), "talkingPoints" (array of 3-5 strings, each a specific talking point the candidate can use), "riskLevel" ("low"|"medium"|"high"), "tactics" (array of 2-3 strings, tactical advice).`,
      },
      {
        role: 'user',
        content: `Offer: ${offeredCompLpa} LPA from ${companyName} for ${roleTitle}${location ? ` in ${location}` : ''}

Candidate min comp: ${userPrefs.minCompLpa || 'not set'} LPA
Candidate max expectation: ${userPrefs.maxCompLpa || 'not set'} LPA

Verified skills:
${topSkills.join('\n') || 'No skills assessed yet'}

Cohort percentile: ${profile?.cohortPercentile ? Math.round(profile.cohortPercentile) + 'th' : 'unknown'}

Provide negotiation coaching JSON.`,
      },
    ],
  })

  let advice
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    advice = jsonMatch ? JSON.parse(jsonMatch[0]) : { assessment: text, talkingPoints: [], tactics: [] }
  } catch {
    advice = { assessment: text, talkingPoints: [], tactics: [], askAmount: null }
  }

  return NextResponse.json({ advice, offeredCompLpa, companyName, roleTitle })
}
