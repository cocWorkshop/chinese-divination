import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
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

        if (!user) return null

        // Tentative users (created mid-funnel) have no password set yet.
        // They cannot authenticate via credentials; they must complete
        // /start/unlock first to set a password.
        if (!user.password) return null

        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) return null

        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
