import { cookies } from 'next/headers'
import { getCurrentPrismaClient } from '@/lib/tenant/server'
import { UserRole } from '@prisma/client'

const SESSION_NAME = 'auth-session'

// セッションに保存するデータの型
export interface SessionData {
  userId: string
  tenantId: string
  email: string
  name: string
  role: UserRole
}

// 現在のユーザー情報の型
export interface CurrentUser {
  id: string
  tenantId: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  tenant: {
    id: string
    name: string
    isActive: boolean
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    // セッションデータがJSON文字列の場合は解析
    try {
      const sessionData = JSON.parse(sessionCookie.value) as SessionData

      if (sessionData.userId) {
        // テナント用Prismaクライアントを取得
        const prisma = await getCurrentPrismaClient()
        // データベースから最新のユーザー情報を取得（テナント情報も含む）
        const user = await prisma.user.findUnique({
          where: {
            id: sessionData.userId,
            isActive: true
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          }
        })

        // ユーザーまたはテナントが無効な場合はnull
        if (!user || !user.tenant.isActive) {
          return null
        }

        return user
      }
    } catch {
      // 旧形式のセッション（単純な文字列）の場合は null を返す
      console.warn('Invalid session format, user needs to re-login')
      return null
    }

    return null
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

  if (user.role !== 'ADMIN') {
    throw new Error('管理者権限が必要です')
  }

  return user
}

// セッションからtenantIdを取得するヘルパー
export async function getSessionTenantId(): Promise<string> {
  const user = await requireAuth()
  return user.tenantId
}