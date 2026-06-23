import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { calculateProofScore } from '@/lib/scoring'
import { generateText } from 'ai'

const LINKEDIN_AI_PROMPT = `You are an expert engineering talent analyzer. Given a candidate's LinkedIn profile data, extract their technical skills and enrich their professional profile.

Return ONLY valid JSON in this exact format:
{
  "skills": [
    {
      "name": "skill name (programming language, framework, tool, or domain)",
      "evidence": ["specific evidence from their roles or about section"],
      "confidence": 0-100
    }
  ],
  "targetRole": "Backend Engineer | Full Stack Engineer | AI/ML Engineer | etc",
  "yearsOfExperience": <number>,
  "bio": "2-sentence professional bio based on their career",
  "summary": "3-5 key technical highlights"
}

Rules:
- Only include verifiable technical skills (no soft skills like 'communication')
- Infer years of experience from their role timeline
- Derive the target role from their most recent position
- Write the bio in third person, professional tone
- confidence is 0-100: 80+ if clearly evidenced, 50-70 if implied`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const user = await User.findById(session.user.id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Get LinkedIn URL from request body or from stored connections
    const body = await req.json().catch(() => ({})) as { profileUrl?: string }
    let profileUrl = body.profileUrl?.trim() || ''

    if (!profileUrl) {
      const conn = user.connections?.find((c: { source: string; handle: string }) => c.source === 'linkedin')
      profileUrl = conn?.handle || ''
    }

    if (!profileUrl || !profileUrl.includes('linkedin.com/in/')) {
      return NextResponse.json({ error: 'Provide a LinkedIn profile URL (linkedin.com/in/…)' }, { status: 400 })
    }

    // ── Step 1: scrape via Python parser ────────────────────────
    const parserUrl = process.env.PARSER_SERVICE_URL
    if (!parserUrl) {
      return NextResponse.json({ error: 'Parser service not configured (PARSER_SERVICE_URL)' }, { status: 503 })
    }

    let scraped: {
      ok: boolean
      error?: string
      profile?: {
        name?: string
        location?: string
        about?: string
        experiences?: Array<{ title?: string; company?: string; duration?: string; location?: string }>
        educations?: Array<{ institution?: string; degree?: string }>
      }
      signals?: Array<{ name: string; evidenceLine: string; weight: number }>
      summary?: string
    }

    try {
      const scrapeRes = await fetch(`${parserUrl}/parse/linkedin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': process.env.PARSER_SERVICE_SECRET || '',
        },
        body: JSON.stringify({ profile_url: profileUrl }),
        signal: AbortSignal.timeout(90000),
      })
      if (!scrapeRes.ok) {
        return NextResponse.json(
          { error: 'LinkedIn sync is temporarily unavailable. Try again in a few minutes.', code: 'SERVICE_DOWN' },
          { status: 503 }
        )
      }
      scraped = await scrapeRes.json()
    } catch (err) {
      const isTimeout = String(err).includes('timeout') || String(err).includes('abort')
      return NextResponse.json(
        {
          error: isTimeout
            ? 'LinkedIn sync timed out. The service may be slow — try again shortly.'
            : 'LinkedIn sync is unavailable right now. Try again later.',
          code: 'SERVICE_DOWN',
        },
        { status: 503 }
      )
    }

    if (!scraped.ok || !scraped.profile) {
      return NextResponse.json(
        { error: scraped.error || 'LinkedIn scrape returned no profile data' },
        { status: 422 }
      )
    }

    const li = scraped.profile

    // ── Step 2: build corpus for the AI ──────────────────────────
    const experienceText = (li.experiences || [])
      .map((e) => `- ${e.title || 'Engineer'} at ${e.company || 'company'} (${e.duration || ''})`)
      .join('\n')

    const educationText = (li.educations || [])
      .map((e) => `- ${e.degree || 'Degree'} from ${e.institution || 'institution'}`)
      .join('\n')

    const corpus = `
Name: ${li.name || 'Unknown'}
Location: ${li.location || ''}

About:
${li.about || '(no about section)'}

Experience:
${experienceText || '(no experience data)'}

Education:
${educationText || '(no education data)'}
`.trim()

    // ── Step 3: AI extraction ─────────────────────────────────────
    let aiResult: {
      skills?: Array<{ name: string; evidence: string[]; confidence: number }>
      targetRole?: string
      yearsOfExperience?: number
      bio?: string
    } | null = null

    try {
      const { text } = await generateText({
        model: await getModel(),
        system: LINKEDIN_AI_PROMPT,
        prompt: corpus,
        maxOutputTokens: 1500,
      })
      const match = text.match(/\{[\s\S]*\}/)
      if (match) aiResult = JSON.parse(match[0])
    } catch (err) {
      console.error('[linkedin-sync] AI extraction failed:', err)
    }

    // ── Step 4: merge into Profile ────────────────────────────────
    const profile = await Profile.findOne({ userId: user._id })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let newSkillsCount = 0

    if (aiResult?.skills && aiResult.skills.length > 0) {
      const incoming = aiResult.skills.map((s) => ({
        name: s.name,
        evidence: s.evidence || [`Extracted from LinkedIn profile`],
        proofScore: calculateProofScore({
          evidenceCount: s.evidence?.length || 1,
          repoComplexity: s.confidence || 55,
          recencyMonths: 6,
        }),
        lastUpdated: new Date(),
        source: 'linkedin',
      }))

      // Merge: keep existing skills from other sources, upsert LinkedIn ones
      const existing = (profile.parsedSkills || []).filter(
        (sk: { name: string }) => !incoming.some((inc) => inc.name.toLowerCase() === sk.name.toLowerCase())
      )
      profile.parsedSkills = [...existing, ...incoming]
      newSkillsCount = incoming.length
    }

    // Store structured experience + education (always overwrite with latest LinkedIn data)
    if (li.experiences && li.experiences.length > 0) {
      profile.experiences = li.experiences.map((e) => ({
        title: e.title || '',
        company: e.company || '',
        duration: e.duration || '',
        location: e.location || '',
      }))
    }
    if (li.educations && li.educations.length > 0) {
      profile.educations = li.educations.map((e) => ({
        institution: e.institution || '',
        degree: e.degree || '',
      }))
    }

    // Only update scalar fields if currently empty
    if (aiResult?.targetRole && !profile.targetRole) profile.targetRole = aiResult.targetRole
    if (aiResult?.yearsOfExperience && !profile.yearsOfExperience) {
      profile.yearsOfExperience = aiResult.yearsOfExperience
    }
    if (aiResult?.bio && !profile.bio) profile.bio = aiResult.bio
    if (li.location && !profile.location) profile.location = li.location

    profile.updatedAt = new Date()
    await profile.save()

    // Upsert connection: pull stale entry then push fresh one so it's always tracked
    await User.findByIdAndUpdate(session.user.id, { $pull: { connections: { source: 'linkedin' } } })
    await User.findByIdAndUpdate(session.user.id, {
      $push: {
        connections: {
          source: 'linkedin',
          handle: profileUrl,
          status: 'connected',
          summary: scraped.summary || `${li.experiences?.length || 0} roles`,
          lastSyncedAt: new Date(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      skillsAdded: newSkillsCount,
      profileUpdated: {
        targetRole: !!aiResult?.targetRole,
        yearsOfExperience: !!aiResult?.yearsOfExperience,
        bio: !!aiResult?.bio,
        location: !!li.location,
      },
      scrapedSummary: scraped.summary || '',
    })
  } catch (error) {
    console.error('[linkedin-sync] error:', error)
    return NextResponse.json({ error: 'LinkedIn sync failed' }, { status: 500 })
  }
}
