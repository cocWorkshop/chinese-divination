import { prisma } from './prisma'

export interface OAuthSignInParams {
  account: {
    provider: string
    providerAccountId: string
    type: string
    access_token?: string | null
    refresh_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
  }
  profile?: {
    email?: string | null
    name?: string | null
    email_verified?: boolean | null
    [key: string]: unknown
  }
  user?: {
    id?: string
    email?: string | null
    name?: string | null
    image?: string | null
    isAdmin?: boolean
  }
}

export interface OAuthResolutionResult {
  id: string
  isAdmin: boolean
}

/**
 * Handles OAuth sign-in / registration:
 * 1. If Account exists -> update verified / tentative state, return user.
 * 2. If User with matching email exists -> link Account to user, flip tentative=false, return user.
 * 3. If User does not exist -> provision new User + Account with emailVerified=true and default credits.
 */
export async function handleOAuthSignIn({
  account,
  profile,
  user,
}: OAuthSignInParams): Promise<OAuthResolutionResult | null> {
  const rawEmail = user?.email || profile?.email || ''
  const email = rawEmail.toLowerCase().trim()
  if (!email) {
    return null
  }

  // 1. Look up existing Account link
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    include: { user: true },
  })

  if (existingAccount) {
    const existingUser = existingAccount.user
    if (existingUser.tentative || !existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          tentative: false,
          emailVerified: true,
          signupCompletedAt: existingUser.signupCompletedAt || new Date(),
        },
      })
    }
    return { id: existingUser.id, isAdmin: existingUser.isAdmin }
  }

  // 2. Account not linked yet. Look up user by email
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })

  if (existingUser) {
    // AUD-04 / ISS-04: Ensure email is verified by provider before linking to existing account.
    // If provider does not attest email_verified === true, refuse linking to prevent ATO.
    const isProviderVerified = (profile as any)?.email_verified === true || (profile as any)?.emailVerified === true
    if (!isProviderVerified) {
      console.warn(`[OAuth] Refusing account linking for ${email}: provider email not verified`)
      return null
    }

    // Security defense against Pre-Account Takeover:
    // If an attacker pre-registered `existingUser.email` with credentials, the
    // account exists in the DB but was never verified (`emailVerified === false`).
    // If the legitimate owner now logs in via OAuth, the attacker-controlled password
    // MUST be discarded; otherwise the attacker could still log in via credentials
    // and hijack the victim's account.
    const shouldInvalidatePassword = Boolean(existingUser.password && !existingUser.emailVerified)

    await prisma.$transaction(async (tx) => {
      await tx.account.create({
        data: {
          userId: existingUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? undefined,
          access_token: account.access_token ?? undefined,
          expires_at: account.expires_at ?? undefined,
          token_type: account.token_type ?? undefined,
          scope: account.scope ?? undefined,
          id_token: account.id_token ?? undefined,
          session_state: account.session_state ?? undefined,
        },
      })

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          tentative: false,
          emailVerified: true,
          signupCompletedAt: existingUser.signupCompletedAt || new Date(),
          name: existingUser.name || user?.name || profile?.name || null,
          ...(shouldInvalidatePassword ? {
            password: null,
            verificationToken: null,
            tokenExpiry: null,
          } : {}),
        },
      })
    })

    return { id: existingUser.id, isAdmin: existingUser.isAdmin }
  }

  // PROD-4 / ISS-24: Align OAuth initial credits with registerBonus (default 6)
  let initialCredits = 6
  try {
    const bonusSetting = await prisma.adminSetting?.findUnique?.({ where: { key: 'registerBonus' } })
    if (bonusSetting?.value) {
      initialCredits = parseInt(bonusSetting.value, 10) || 6
    }
  } catch {}

  const newUser = await prisma.user.create({
    data: {
      email,
      name: user?.name || profile?.name || null,
      emailVerified: true,
      credits: initialCredits,
      role: 'user',
      signupCompletedAt: new Date(),
      accounts: {
        create: {
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? undefined,
          access_token: account.access_token ?? undefined,
          expires_at: account.expires_at ?? undefined,
          token_type: account.token_type ?? undefined,
          scope: account.scope ?? undefined,
          id_token: account.id_token ?? undefined,
          session_state: account.session_state ?? undefined,
        },
      },
    },
  })

  return { id: newUser.id, isAdmin: newUser.isAdmin }
}
