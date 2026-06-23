import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './mongodb'
import { User } from './models/User'
import { Profile } from './models/Profile'
import { authConfig } from './auth.config'
import { ensureReferralCode } from './referrals'

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
    async signIn({ user, account, profile: oauthProfile }) {
      if (account?.provider === 'credentials') return true

      try {
        await connectDB()

        if (account?.provider === 'github') {
          const gp = oauthProfile as unknown as {
            id: number; login: string; avatar_url: string; email: string; name: string
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
              authProvider: 'github',
            })
            await Profile.create({ userId: dbUser._id, githubUsername: gp.login })
            await ensureReferralCode(dbUser._id.toString()).catch(() => {})
          }
          return true
        }

        if (account?.provider === 'twitter') {
          const tp = oauthProfile as unknown as {
            data?: { id: string; username: string; name: string; profile_image_url?: string }
            id?: string; username?: string; name?: string; image?: string
          }
          // NextAuth v5 Twitter profile shape varies — handle both
          const twitterId = tp.data?.id || tp.id || ''
          const twitterHandle = tp.data?.username || tp.username || ''
          const displayName = tp.data?.name || tp.name || twitterHandle
          const avatarUrl = tp.data?.profile_image_url || tp.image || user.image || ''

          if (!twitterId) return false

          let dbUser = await User.findOne({ twitterId })
          if (!dbUser) {
            // Ensure unique username — Twitter handle may collide with an existing GitHub user
            let username = twitterHandle.toLowerCase().replace(/[^a-z0-9_]/g, '')
            const taken = await User.exists({ username })
            if (taken) username = `${username}_x`

            dbUser = await User.create({
              twitterId,
              email: user.email || `${twitterHandle}@twitter.com`,
              name: displayName,
              username,
              avatarUrl,
              role: 'candidate',
              authProvider: 'twitter',
            })
            // Twitter users have no GitHub — githubUsername left as default ''
            await Profile.create({ userId: dbUser._id, githubUsername: '' })
            await ensureReferralCode(dbUser._id.toString()).catch(() => {})
          }
          return true
        }

        return false
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },

    async session({ session, token }) {
      if (token.sub) {
        try {
          await connectDB()
          let dbUser = null
          if (token.provider === 'twitter') {
            dbUser = await User.findOne({ twitterId: token.sub })
          } else {
            // GitHub: token.sub = githubId; Credentials: token.sub = Mongo _id
            dbUser = await User.findOne({ githubId: token.sub })
            if (!dbUser && mongoose.isValidObjectId(token.sub)) {
              dbUser = await User.findById(token.sub)
            }
          }
          if (dbUser) {
            session.user.id = dbUser._id.toString()
            session.user.username = dbUser.username
            session.user.role = dbUser.role
            session.user.githubId = dbUser.githubId || ''
          }
        } catch (err) {
          console.error('Session callback DB error:', err)
        }
      }
      return session
    },

    async jwt({ token, account, profile: oauthProfile }) {
      if (account?.provider === 'github' && oauthProfile) {
        const gp = oauthProfile as unknown as { id: number }
        token.sub = String(gp.id)
        token.provider = 'github'
        token.accessToken = account.access_token
      }
      if (account?.provider === 'twitter' && oauthProfile) {
        const tp = oauthProfile as unknown as {
          data?: { id: string }; id?: string
        }
        token.sub = tp.data?.id || tp.id || token.sub
        token.provider = 'twitter'
        token.accessToken = account.access_token
      }
      return token
    },
  },
})
