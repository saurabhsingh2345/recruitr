import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './mongodb'
import { User } from './models/User'
import { Profile } from './models/Profile'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // Email/password — used by recruiters (no GitHub required)
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const email = String(creds?.email || '').toLowerCase().trim()
        const password = String(creds?.password || '')
        if (!email || !password) return null
        try {
          await connectDB()
          const user = await User.findOne({ email, authProvider: 'credentials' })
          if (!user?.passwordHash) return null
          const ok = await bcrypt.compare(password, user.passwordHash)
          if (!ok) return null
          // The returned id becomes token.sub (Mongo _id for credentials users)
          return { id: user._id.toString(), name: user.name, email: user.email }
        } catch (err) {
          console.error('Credentials authorize error:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile: githubProfile }) {
      // Credentials (recruiter email/password): authorize() already validated the
      // user against the DB, so allow the sign-in through.
      if (account?.provider === 'credentials') return true
      // Any other non-GitHub provider is not supported.
      if (account?.provider !== 'github') return false

      try {
        await connectDB()

        const gp = githubProfile as unknown as {
          id: number
          login: string
          avatar_url: string
          email: string
          name: string
        }

        let dbUser = await User.findOne({ githubId: String(gp.id) })

        if (!dbUser) {
          dbUser = await User.create({
            githubId: String(gp.id),
            email: user.email || `${gp.login}@github.com`,
            name: gp.name || gp.login,
            username: gp.login,
            avatarUrl: gp.avatar_url,
            role: 'candidate',
          })

          await Profile.create({
            userId: dbUser._id,
            githubUsername: gp.login,
          })
        }

        return true
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },

    async session({ session, token }) {
      if (token.sub) {
        try {
          await connectDB()
          // GitHub users: token.sub = githubId. Credentials users: token.sub = Mongo _id.
          let dbUser = await User.findOne({ githubId: token.sub })
          if (!dbUser && mongoose.isValidObjectId(token.sub)) {
            dbUser = await User.findById(token.sub)
          }
          if (dbUser) {
            session.user.id = dbUser._id.toString()
            session.user.username = dbUser.username
            session.user.role = dbUser.role
            session.user.githubId = dbUser.githubId || ''
          }
        } catch {}
      }
      return session
    },

    async jwt({ token, account, profile: githubProfile }) {
      if (account?.provider === 'github' && githubProfile) {
        const gp = githubProfile as unknown as { id: number }
        token.sub = String(gp.id)
        token.accessToken = account.access_token
      }
      return token
    },
  },
})
