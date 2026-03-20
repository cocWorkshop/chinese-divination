import { prisma } from './prisma'

type AuthAction = 'login' | 'logout' | 'register'
type AuthStatus = 'success' | 'failure'

export async function logAuth(params: {
  action: AuthAction
  status: AuthStatus
  email: string
  userId?: string | null
  reason?: string | null
  ip?: string | null
  userAgent?: string | null
}) {
  try {
    await prisma.authLog.create({
      data: {
        action: params.action,
        status: params.status,
        email: params.email,
        userId: params.userId || null,
        reason: params.reason || null,
        ip: params.ip || null,
        userAgent: params.userAgent || null,
      },
    })
  } catch (e) {
    console.error('Failed to write auth log:', e)
  }
}
