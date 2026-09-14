import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleOAuthSignIn } from '../oauthAccountLinking'
import { prisma } from '../prisma'

vi.mock('../prisma', () => ({
  prisma: {
    account: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(prisma)),
  },
}))

describe('oauthAccountLinking - handleOAuthSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when email cannot be found in user or profile', async () => {
    const res = await handleOAuthSignIn({
      account: {
        provider: 'google',
        providerAccountId: 'google_123',
        type: 'oauth',
      },
      user: {},
      profile: {},
    })

    expect(res).toBeNull()
  })

  it('handles existing account: returns user id, flips tentative and unverified email if needed', async () => {
    const mockUser = {
      id: 'usr_existing',
      email: 'test@example.com',
      isAdmin: false,
      tentative: true,
      emailVerified: false,
      signupCompletedAt: null,
    }

    vi.mocked(prisma.account.findUnique).mockResolvedValueOnce({
      id: 'acc_1',
      userId: mockUser.id,
      provider: 'google',
      providerAccountId: 'google_123',
      user: mockUser,
    } as any)

    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

    const res = await handleOAuthSignIn({
      account: {
        provider: 'google',
        providerAccountId: 'google_123',
        type: 'oauth',
      },
      user: { email: 'test@example.com' },
    })

    expect(res).toEqual({ id: 'usr_existing', isAdmin: false })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr_existing' },
      data: expect.objectContaining({
        tentative: false,
        emailVerified: true,
      }),
    })
  })

  it('links account to existing credentials/tentative user by email', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValueOnce(null)

    const mockExistingUser = {
      id: 'usr_db_user',
      email: 'hello@example.com',
      isAdmin: true,
      tentative: false,
      emailVerified: false,
      signupCompletedAt: new Date('2026-01-01'),
      name: 'Existing Name',
    }

    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockExistingUser as any)
    vi.mocked(prisma.account.create).mockResolvedValueOnce({} as any)
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

    const res = await handleOAuthSignIn({
      account: {
        provider: 'google',
        providerAccountId: 'google_456',
        type: 'oauth',
        access_token: 'at_123',
      },
      profile: {
        email: 'Hello@EXAMPLE.COM',
        name: 'Google Name',
      },
    })

    expect(res).toEqual({ id: 'usr_db_user', isAdmin: true })
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'usr_db_user',
        provider: 'google',
        providerAccountId: 'google_456',
      }),
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr_db_user' },
      data: expect.objectContaining({
        emailVerified: true,
        tentative: false,
      }),
    })
  })

  it('clears unverified credentials password on OAuth linking to prevent pre-account takeover', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValueOnce(null)

    const mockUnverifiedUserWithPassword = {
      id: 'usr_unverified_attacker_pass',
      email: 'victim@example.com',
      isAdmin: false,
      tentative: false,
      emailVerified: false,
      password: '$2a$12$attacker_hashed_password',
      verificationToken: 'pending_token_123',
      tokenExpiry: new Date(Date.now() + 3600000),
      name: 'Victim',
    }

    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUnverifiedUserWithPassword as any)
    vi.mocked(prisma.account.create).mockResolvedValueOnce({} as any)
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

    const res = await handleOAuthSignIn({
      account: {
        provider: 'google',
        providerAccountId: 'google_legit_owner',
        type: 'oauth',
      },
      profile: {
        email: 'victim@example.com',
        name: 'Legitimate Owner',
      },
    })

    expect(res).toEqual({ id: 'usr_unverified_attacker_pass', isAdmin: false })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr_unverified_attacker_pass' },
      data: expect.objectContaining({
        emailVerified: true,
        password: null,
        verificationToken: null,
        tokenExpiry: null,
      }),
    })
  })

  it('preserves password if existing user was already verified', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValueOnce(null)

    const mockVerifiedUser = {
      id: 'usr_verified_legit',
      email: 'legit@example.com',
      isAdmin: false,
      tentative: false,
      emailVerified: true,
      password: '$2a$12$legit_user_password',
      name: 'Legit User',
    }

    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockVerifiedUser as any)
    vi.mocked(prisma.account.create).mockResolvedValueOnce({} as any)
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

    const res = await handleOAuthSignIn({
      account: {
        provider: 'google',
        providerAccountId: 'google_legit_2',
        type: 'oauth',
      },
      profile: {
        email: 'legit@example.com',
        name: 'Legit User',
      },
    })

    expect(res).toEqual({ id: 'usr_verified_legit', isAdmin: false })
    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0]
    expect(updateCall.data).not.toHaveProperty('password')
  })

  it('provisions new User and Account when neither account nor user exists', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null)

    const mockCreatedUser = {
      id: 'usr_brand_new',
      email: 'newuser@example.com',
      isAdmin: false,
    }

    vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser as any)

    const res = await handleOAuthSignIn({
      account: {
        provider: 'google',
        providerAccountId: 'google_789',
        type: 'oauth',
        id_token: 'id_tok_123',
      },
      user: {
        email: 'newuser@example.com',
        name: 'New Google User',
      },
    })

    expect(res).toEqual({ id: 'usr_brand_new', isAdmin: false })
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'newuser@example.com',
        name: 'New Google User',
        emailVerified: true,
        credits: 3,
        role: 'user',
        accounts: {
          create: expect.objectContaining({
            provider: 'google',
            providerAccountId: 'google_789',
          }),
        },
      }),
    })
  })
})
