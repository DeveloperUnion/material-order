import type { NextAuthConfig } from 'next-auth'

// middleware (Edge runtime) と auth.ts の両方から読み込む light 設定。
// ここに bcrypt 等の Node.js 専用モジュールを import してはいけない。
// 認証ガードのロジックは src/middleware.ts で一元管理するため
// authorized callback は持たない。
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/',
  },
  providers: [], // configured in auth.ts
} satisfies NextAuthConfig
