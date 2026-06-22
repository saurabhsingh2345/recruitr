import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { SavedResume } from '@/lib/models/SavedResume'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const jobTitle: string = body.jobTitle || ''
    const jobDescription: string = body.jobDescription || ''

    if (!jobTitle.trim()) {
      return NextResponse.json({ error: 'Job title required' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(session.user.id)
    const profile = await Profile.findOne({ userId: user?._id })

    const skillsList = (profile?.parsedSkills || [])
      .slice(0, 12)
      .map((s: { name: string; proofScore: number }) => `${s.name} (verified ${s.proofScore}/100)`)
      .join(', ') || 'No skills on record yet'

    const projectsList = (profile?.projects || [])
      .slice(0, 5)
      .map((p: { repoName: string; description: string; techStack?: string[]; stars?: number }) =>
        `${p.repoName}: ${p.description || 'No description'}${p.techStack?.length ? ` | Tech: ${p.techStack.join(', ')}` : ''}${p.stars ? ` | ${p.stars}★` : ''}`)
      .join('\n') || 'No projects on record'

    const experienceList = (profile?.experiences || [])
      .map((e: { title: string; company: string; duration: string }) =>
        `${e.title} at ${e.company} (${e.duration})`)
      .join('\n') || ''

    const educationList = (profile?.educations || [])
      .map((e: { institution: string; degree: string }) => `${e.degree} — ${e.institution}`)
      .join('\n') || ''

    const contextBlock = [
      `Name: ${user?.name || 'Engineer'}`,
      `Target Role: ${profile?.targetRole || 'Software Engineer'}`,
      `Years of Experience: ${profile?.yearsOfExperience || 0}`,
      `Location: ${profile?.location || 'India'}`,
      `Bio: ${profile?.bio || ''}`,
      `\nVerified Skills (proof scores from Intervue AI interviews + GitHub):\n${skillsList}`,
      `\nGitHub Projects:\n${projectsList}`,
      experienceList ? `\nWork Experience:\n${experienceList}` : '',
      educationList ? `\nEducation:\n${educationList}` : '',
      profile?.rawResumeText ? `\nResume Context (raw):\n${profile.rawResumeText.slice(0, 800)}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `You are a senior technical recruiter and resume writer. Generate a tailored, ATS-optimized resume for the role below. Use ONLY information from the candidate's actual profile — do NOT invent experience, companies, or achievements.

TARGET ROLE: ${jobTitle}
${jobDescription ? `\nJOB DESCRIPTION CONTEXT:\n${jobDescription.slice(0, 1000)}` : ''}

CANDIDATE PROFILE:
${contextBlock}

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "name": "candidate full name",
  "headline": "tailored title for ${jobTitle}",
  "summary": "3-4 sentences tailored to this role, using actual skills and experience above",
  "skills": ["skill1", "skill2"],
  "experience": [
    { "title": "Job Title", "company": "Company", "duration": "Start – End", "bullets": ["quantified achievement", "impact statement"] }
  ],
  "projects": [
    { "name": "Project Name", "description": "1-2 sentence impact-focused description for this role", "tech": ["tech1"] }
  ],
  "education": [
    { "degree": "Degree", "school": "School", "year": "Year" }
  ],
  "jdMatchScore": ${jobDescription ? '<integer 0-100: how well the candidate\'s verified skills + experience match this JD>' : 'null'},
  "jdMatchNotes": ${jobDescription ? '"1-2 sentences: key matches and gaps vs the JD"' : 'null'}
}`

    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 2000,
    })

    let resumeData
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      resumeData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      resumeData = null
    }

    if (!resumeData) {
      return NextResponse.json({ error: 'Failed to generate resume structure' }, { status: 500 })
    }

    // Auto-save
    const saved = await SavedResume.create({
      userId: session.user.id,
      jobTitle: jobTitle.trim(),
      resume: resumeData,
    })

    return NextResponse.json({
      success: true,
      resume: resumeData,
      savedId: String(saved._id),
      jdMatchScore: resumeData.jdMatchScore ?? null,
      jdMatchNotes: resumeData.jdMatchNotes ?? null,
    })
  } catch (error) {
    console.error('Resume generate error:', error)
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 })
  }
}
