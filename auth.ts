import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { authConfig } from '@/lib/auth.config'
import { getCurrentPrismaClient } from '@/lib/tenant/server'
import { UserRole } from '@prisma/client'

// セッションに追加するカスタムフィールドの型定義
declare module 'next-auth' {
  interface User {
    tenantId: string
    role: UserRole
    tenantName: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      tenantId: string
      role: UserRole
      tenantName: string
    }
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        try {
          const prisma = getCurrentPrismaClient()

          // ユーザーを検索（テナント情報も含む）
          const user = await prisma.user.findUnique({
            where: {
              email: email,
              isActive: true,
            },
            include: {
              tenant: true,
            },
          })

          // ユーザーが存在しない、またはテナントが無効
          if (!user || !user.tenant.isActive) {
            return null
          }

          // パスワードがnullの場合（SSO専用ユーザー）
          if (!user.password) {
            return null
          }

          // パスワード検証
          const isValidPassword = await bcrypt.compare(password, user.password)
          if (!isValidPassword) {
            return null
          }

          // 最終ログイン日時を更新
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            role: user.role,
            tenantName: user.tenant.name,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.tenantId = user.tenantId
        token.role = user.role
        token.tenantName = user.tenantName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.tenantId = token.tenantId as string
        session.user.role = token.role as UserRole
        session.user.tenantName = token.tenantName as string
      }
      return session
    },
  },
})
