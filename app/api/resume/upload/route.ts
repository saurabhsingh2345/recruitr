import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { calculateProofScore } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('resume') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    let parsedData: {
      text: string
      skills: Array<{ name: string; evidence: string[] }>
    } | null = null

    // Try Python parser microservice (5 s timeout — skip if not running)
    const parserUrl = process.env.PARSER_SERVICE_URL
    if (parserUrl) {
      try {
        const parserForm = new FormData()
        parserForm.append('file', file)

        const parserRes = await fetch(`${parserUrl}/parse/resume`, {
          method: 'POST',
          headers: { 'X-Secret': process.env.PARSER_SERVICE_SECRET || '' },
          body: parserForm,
          signal: AbortSignal.timeout(5000),
        })

        if (parserRes.ok) {
          parsedData = await parserRes.json()
        }
      } catch (e) {
        console.error('Parser service error:', e)
      }
    }

    // Fallback: extract text from PDF buffer using pdf-parse v2
    if (!parsedData) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { PDFParse } = (await import('pdf-parse')) as unknown as {
        PDFParse: new (opts: { data: Uint8Array }) => { getText(): Promise<{ text: string }>; destroy(): Promise<void> }
      }
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      try {
        const result = await parser.getText()
        parsedData = { text: result.text.slice(0, 5000), skills: [] }
      } finally {
        await parser.destroy()
      }
    }

    await connectDB()
    const profile = await Profile.findOne({ userId: session.user.id })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    profile.rawResumeText = parsedData.text

    if (parsedData.skills?.length > 0) {
      profile.parsedSkills = parsedData.skills.map((s) => ({
        name: s.name,
        evidence: s.evidence,
        proofScore: calculateProofScore({
          evidenceCount: s.evidence?.length || 1,
          repoComplexity: 50,
          recencyMonths: 6,
        }),
        lastUpdated: new Date(),
      }))
    }

    profile.updatedAt = new Date()
    await profile.save()

    return NextResponse.json({
      success: true,
      skillsFound: profile.parsedSkills.length,
      message: 'Resume uploaded and parsed successfully',
    })
  } catch (error) {
    console.error('Resume upload error:', error)
    return NextResponse.json({ error: 'Failed to process resume' }, { status: 500 })
  }
}
