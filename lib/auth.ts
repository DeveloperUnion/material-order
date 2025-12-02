import { cookies } from 'next/headers'
import { getCurrentPrismaClient } from '@/lib/tenant/server'

const SESSION_NAME = 'auth-session'

export interface CurrentUser {
  id: string
  username: string
  companyName: string
  isActive: boolean
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
      const sessionData = JSON.parse(sessionCookie.value)

      if (sessionData.userId) {
        // テナント用Prismaクライアントを取得
        const prisma = await getCurrentPrismaClient()
        // データベースから最新のユーザー情報を取得
        const user = await prisma.user.findUnique({
          where: {
            id: sessionData.userId,
            isActive: true
          }
        })

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