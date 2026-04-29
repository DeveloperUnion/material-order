import type { NextAuthConfig } from 'next-auth'
import type { UserRole } from '@prisma/client'

// middleware (Edge runtime) と auth.ts の両方から読み込む light 設定。
// ここに bcrypt 等の Node.js 専用モジュールを import してはいけない。
// 認証ガードのロジックは src/middleware.ts で一元管理するため
// authorized callback は持たない。
//
// jwt / session callbacks も Edge で走らせる必要があるため lib/auth.config.ts に置く。
// ここに置かないと middleware 側の auth() が token.tenantCode 等を session.user に
// マップせず、request.auth.user.tenantCode が常に undefined になる
// (= ログイン済みでも middleware の旧 JWT 救済ブロックが誤発火し / に飛ばされる)。
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/',
  },
  providers: [], // configured in auth.ts
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
} satisfies NextAuthConfig
