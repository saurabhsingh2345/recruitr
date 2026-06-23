import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Twitter from 'next-auth/providers/twitter'

/**
 * Edge-safe auth config — NO database imports.
 * Used by middleware (edge runtime) and spread into the full config in auth.ts.
 * The jwt/session callbacks that touch MongoDB live in auth.ts (Node runtime only).
 */
export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: 'read:user user:email public_repo' },
      },
    }),
    // Twitter/X OAuth 2.0 — only active when TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET are set
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? [Twitter({
          clientId: process.env.TWITTER_CLIENT_ID,
          clientSecret: process.env.TWITTER_CLIENT_SECRET,
        })]
      : []),
  ],
  pages: {
    signIn: '/onboarding',
    error: '/onboarding',
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      role: 'candidate' | 'recruiter'
      githubId: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
