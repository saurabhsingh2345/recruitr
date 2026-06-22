import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { jobDescription, format = 'standard' } = await req.json()

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description required' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(session.user.id)
    const profile = await Profile.findOne({ userId: user?._id })

    const skillsList = profile?.parsedSkills
      ?.slice(0, 10)
      .map((s: { name: string; proofScore: number }) => `${s.name} (${s.proofScore}/100)`)
      .join(', ') || ''

    const projectsList = profile?.projects
      ?.slice(0, 3)
      .map((p: { repoName: string; description: string; techStack?: string[] }) =>
        `${p.repoName}: ${p.description} | ${p.techStack?.join(', ')}`)
      .join('\n') || ''

    const prompt = `Generate a tailored resume for this job description. Return structured JSON only.

JOB DESCRIPTION:
${jobDescription.slice(0, 1500)}

CANDIDATE:
Name: ${user?.name}
Target Role: ${profile?.targetRole || 'Software Engineer'}
Years of Experience: ${profile?.yearsOfExperience || 3}
Top Skills: ${skillsList}
Key Projects:
${projectsList}

Resume raw text (for context):
${profile?.rawResumeText?.slice(0, 1000) || 'Not available'}

Return ONLY valid JSON:
{
  "name": "full name",
  "headline": "tailored headline for this role",
  "summary": "3-4 sentence tailored summary",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company",
      "duration": "Start – End",
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "1-2 sentence impact-focused description",
      "tech": ["tech1", "tech2"]
    }
  ],
  "education": [
    { "degree": "degree", "school": "school", "year": "year" }
  ]
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

    return NextResponse.json({ success: true, resume: resumeData, format })
  } catch (error) {
    console.error('Resume generate error:', error)
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 })
  }
}
