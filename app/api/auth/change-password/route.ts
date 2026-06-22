import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(session.user.id).select('passwordHash authProvider')
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (user.authProvider !== 'credentials' || !user.passwordHash) {
      return NextResponse.json({ error: 'Password change is not available for GitHub-connected accounts' }, { status: 400 })
    }

    const valid = await bcrypt.compare(String(currentPassword), user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const newHash = await bcrypt.hash(String(newPassword), 10)
    await User.findByIdAndUpdate(session.user.id, { passwordHash: newHash })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
