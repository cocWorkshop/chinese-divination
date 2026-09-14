import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import type { Provider } from 'next-auth/providers'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { handleOAuthSignIn } from './oauthAccountLinking'

// Constant bcrypt hash of a random string nobody knows. Compared against on
// the no-user / no-password paths so ALL authorize() branches take ~the same
// time — otherwise the fast early-returns let an attacker enumerate which
// emails exist by timing the response (deferred-evaluation-tasks Task B2).
const DUMMY_BCRYPT_HASH = '$2a$12$K8GpVzbXEXAMPLEDUMMYHuJ9yQYpVxq3rW1mz5TnB7cd9eAfGhIjK'

/**
 * Timing equalizer for pre-flight auth routes (e.g. /api/auth/login):
 * run a dummy bcrypt compare on the no-user / no-password branches so all
 * paths take ~the same wall-clock time (same defense as authorize() below).
 */
export async function dummyBcryptCompare(password: string): Promise<void> {
  await compare(password, DUMMY_BCRYPT_HASH)
}

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET

const providers: Provider[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const emailInput = (credentials.email as string).toLowerCase().trim()
      const user = await prisma.user.findFirst({
        where: { email: { equals: emailInput, mode: 'insensitive' } },
      })

      if (!user) {
        await compare(credentials.password as string, DUMMY_BCRYPT_HASH) // timing equalizer
        return null
      }

      // Tentative users (created mid-funnel) have no password set yet.
      // They cannot authenticate via credentials; they must complete
      // /start/unlock first to set a password.
      if (!user.password) {
        await compare(credentials.password as string, DUMMY_BCRYPT_HASH) // timing equalizer
        return null
      }

      const isValid = await compare(credentials.password as string, user.password)
      if (!isValid) return null

      if (!user.emailVerified) {
        throw new Error('EMAIL_NOT_VERIFIED')
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      }
    },
  }),
]

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === 'credentials') {
        return true
      }

      // Handle OAuth sign in / registration & account linking
      const resolved = await handleOAuthSignIn({ account, profile, user })
      if (!resolved) {
        return false
      }

      user.id = resolved.id
      ;(user as any).isAdmin = resolved.isAdmin
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Claim is set at sign-in and lives as long as the JWT (7 days).
        // Stale-claim risk (admin demoted mid-session) is contained by the
        // authoritative requireAdmin() DB check in every /api/admin route.
        token.isAdmin = (user as any).isAdmin === true
      } else if (!token.id && token.email) {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: (token.email as string).toLowerCase().trim(), mode: 'insensitive' } },
          select: { id: true, isAdmin: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.isAdmin = dbUser.isAdmin === true
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        // JWT augmentation doesn't reach the re-exported @auth/core
        // interface — cast, same as token.id above.
        if (token.isAdmin !== undefined) session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
})
