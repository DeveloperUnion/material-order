import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { authConfig } from '@/lib/auth.config'
import { getCurrentPrismaClient } from '@/lib/tenant/server'
import { PrismaClient, UserRole } from '@prisma/client'

async function findUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  })
}

async function findUserByTenantAndName(prisma: PrismaClient, tenantId: string, name: string) {
  return prisma.user.findUnique({
    where: { tenantId_name: { tenantId, name } },
    include: { tenant: true },
  })
}

// セッションに追加するカスタムフィールドの型定義
declare module 'next-auth' {
  interface User {
    tenantId: string
    tenantCode: string
    role: UserRole
    tenantName: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      tenantId: string
      tenantCode: string
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
        tenantId: { label: 'Tenant ID', type: 'text' },
        name: { label: 'Name', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const password = credentials?.password as string | undefined
        if (!password) return null

        const email = credentials?.email as string | undefined
        const tenantId = credentials?.tenantId as string | undefined
        const name = credentials?.name as string | undefined

        try {
          const prisma = getCurrentPrismaClient()

          // EMAIL モード: email 単独でユーザー特定
          // NAME モード: (tenantId, name) でユーザー特定
          let user: Awaited<ReturnType<typeof findUserByEmail>> | Awaited<ReturnType<typeof findUserByTenantAndName>>

          if (tenantId && name) {
            user = await findUserByTenantAndName(prisma, tenantId, name)
            // NAME モードでは Tenant.authMode === 'NAME' であることも確認
            if (user && user.tenant.authMode !== 'NAME') return null
          } else if (email) {
            user = await findUserByEmail(prisma, email)
            // EMAIL モードでのログインは Tenant.authMode === 'EMAIL' のみ許容
            if (user && user.tenant.authMode !== 'EMAIL') return null
          } else {
            return null
          }

          if (!user || !user.isActive || !user.tenant.isActive) return null
          if (!user.password) return null

          const isValidPassword = await bcrypt.compare(password, user.password)
          if (!isValidPassword) return null

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          return {
            id: user.id,
            email: user.email ?? '',
            name: user.name,
            tenantId: user.tenantId,
            tenantCode: user.tenant.code,
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
        token.tenantCode = user.tenantCode
        token.role = user.role
        token.tenantName = user.tenantName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantCode = token.tenantCode as string
        session.user.role = token.role as UserRole
        session.user.tenantName = token.tenantName as string
      }
      return session
    },
  },
})
