import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'

// POST /api/auth/register — recruiter email/password signup
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company, jobTitle } = await req.json()

    const cleanEmail = String(email || '').toLowerCase().trim()
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email: cleanEmail })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Generate a unique username from the email local part
    const base = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'recruiter'
    let username = base
    let n = 0
    // eslint-disable-next-line no-await-in-loop
    while (await User.findOne({ username })) {
      n += 1
      username = `${base}${n}`
    }

    const passwordHash = await bcrypt.hash(String(password), 10)

    const user = await User.create({
      email: cleanEmail,
      passwordHash,
      authProvider: 'credentials',
      name: name.trim(),
      username,
      role: 'recruiter',
      company: company?.trim() || '',
      jobTitle: jobTitle?.trim() || '',
      avatarUrl: '',
    })

    return NextResponse.json({ success: true, userId: user._id.toString() })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
