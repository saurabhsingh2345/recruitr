import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { executeCode } from '@/lib/judge0'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { code, language, stdin = '' } = await req.json()

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language required' }, { status: 400 })
    }

    const result = await executeCode(code, language, stdin)

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      status: result.status,
      time: result.time,
      memory: result.memory,
    })
  } catch (error) {
    console.error('Code execution error:', error)
    return NextResponse.json({ error: 'Execution failed' }, { status: 500 })
  }
}
