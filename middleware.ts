import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

// Edge-safe auth instance (no DB) — only decodes the JWT to check authentication.
// Role-level checks happen at the page/API level where DB access is available.
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Recruiter-protected routes
  const recruiterProtected = [
    '/recruiter/dashboard',
    '/recruiter/pipeline',
    '/recruiter/outreach',
    '/recruiter/analytics',
    '/recruiter/setup',
    '/recruiter/roles',
    '/recruiter/assessments',
  ]

  // Candidate-protected routes
  const candidateProtected = [
    '/dashboard',
    '/interview',
    '/resumes',
    '/settings',
    '/messages',
    '/agent',
    '/connections',
    '/peer',
    '/briefs',
    '/teams',
    '/wrapped',
  ]

  const isRecruiterRoute = recruiterProtected.some((r) => pathname.startsWith(r))
  const isCandidateRoute = candidateProtected.some((r) => pathname.startsWith(r))

  if (!session) {
    if (isRecruiterRoute) {
      return NextResponse.redirect(new URL('/recruiter/login', req.url))
    }
    if (isCandidateRoute) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interview/:path*',
    '/resumes/:path*',
    '/settings/:path*',
    '/messages/:path*',
    '/agent/:path*',
    '/connections/:path*',
    '/peer/:path*',
    '/briefs/:path*',
    '/teams/:path*',
    '/wrapped/:path*',
    '/recruiter/dashboard/:path*',
    '/recruiter/pipeline/:path*',
    '/recruiter/outreach/:path*',
    '/recruiter/analytics/:path*',
    '/recruiter/setup/:path*',
    '/recruiter/roles/:path*',
    '/recruiter/assessments/:path*',
  ],
}
