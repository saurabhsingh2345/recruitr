import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { sendPasswordResetEmail } from '@/lib/email'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const cleanEmail = String(email || '').toLowerCase().trim()

    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    await connectDB()

    // Always return success to avoid leaking whether the email exists
    const user = await User.findOne({ email: cleanEmail, authProvider: 'credentials' }).lean() as {
      _id: unknown; name: string; email: string
    } | null

    if (user) {
      const token = randomBytes(32).toString('hex')
      const hash = createHash('sha256').update(token).digest('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await User.findByIdAndUpdate(user._id, {
        passwordResetToken: hash,
        passwordResetExpiry: expiry,
      })

      const resetUrl = `${BASE}/recruiter/reset-password?token=${token}`
      await sendPasswordResetEmail(user.email, user.name, resetUrl)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
