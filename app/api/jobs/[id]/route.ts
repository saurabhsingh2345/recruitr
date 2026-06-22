import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getJobStatus } from '@/lib/queue'

// GET /api/jobs/[id] — poll a background job's state + result
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const status = await getJobStatus(id)
    if (!status.found) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json(status)
  } catch (err) {
    console.error('Job status error:', err)
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 })
  }
}
