import { auth } from '@/auth'
import { UserRole } from '@prisma/client'

// 現在のユーザー情報の型
export interface CurrentUser {
  id: string
  tenantId: string
  email: string
  name: string
  role: UserRole
  tenantName: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth()

    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id,
      tenantId: session.user.tenantId,
      email: session.user.email || '',
      name: session.user.name || '',
      role: session.user.role,
      tenantName: session.user.tenantName,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  return user
}

// ADMIN権限を必須にするヘルパー
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireAuth()

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new Error('管理者権限が必要です')
  }

  return user
}

// セッションからtenantIdを取得するヘルパー
export async function getSessionTenantId(): Promise<string> {
  const user = await requireAuth()
  return user.tenantId
}