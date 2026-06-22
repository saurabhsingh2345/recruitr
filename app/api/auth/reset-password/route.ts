import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    await connectDB()

    const hash = createHash('sha256').update(String(token)).digest('hex')
    const user = await User.findOne({
      passwordResetToken: hash,
      passwordResetExpiry: { $gt: new Date() },
      authProvider: 'credentials',
    })

    if (!user) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)
    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      passwordResetToken: '',
      passwordResetExpiry: null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
