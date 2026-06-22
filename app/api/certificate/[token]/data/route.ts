import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Certificate } from '@/lib/models/Certificate'
import { User } from '@/lib/models/User'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cert = await Certificate.findOne({ token }).lean<any>()
  if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(cert.userId).select('name username').lean<any>()

  return NextResponse.json({
    skill: cert.skill,
    milestone: cert.milestone,
    scoreAtIssuance: cert.scoreAtIssuance,
    evidence: cert.evidence || [],
    issuedAt: cert.issuedAt,
    userName: user?.name || user?.username || 'Verified Developer',
    username: user?.username || '',
  })
}
