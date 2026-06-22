'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, LogIn } from 'lucide-react'

export function CompaniesAuthCTA({ hero }: { hero?: boolean }) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className={hero ? 'h-10 w-48 rounded-full bg-white/[0.05] animate-pulse mx-auto' : 'w-20 h-8 rounded-md bg-white/[0.04] animate-pulse'} />
  }

  const isLoggedIn = !!session?.user

  if (hero) {
    return (
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2DE2C5] text-[#04050e] text-sm font-semibold hover:bg-[#25c9ae] transition-colors"
          >
            Start a company-mode interview <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2DE2C5] text-[#04050e] text-sm font-semibold hover:bg-[#25c9ae] transition-colors"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/[0.12] text-white/50 text-sm hover:text-white hover:border-white/25 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </Link>
          </>
        )}
      </div>
    )
  }

  // Nav-level CTA
  return isLoggedIn ? (
    <Link
      href="/dashboard"
      className="text-xs px-4 py-1.5 rounded-full bg-[#2DE2C5] text-[#04050e] font-semibold hover:bg-[#25c9ae] transition-colors"
    >
      Dashboard
    </Link>
  ) : (
    <div className="flex items-center gap-2">
      <Link
        href="/onboarding"
        className="text-xs text-white/40 hover:text-white transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/onboarding"
        className="text-xs px-4 py-1.5 rounded-full bg-[#2DE2C5] text-[#04050e] font-semibold hover:bg-[#25c9ae] transition-colors"
      >
        Get started free
      </Link>
    </div>
  )
}
