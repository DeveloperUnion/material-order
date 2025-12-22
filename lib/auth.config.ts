import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') ||
        nextUrl.pathname.startsWith('/material-order') ||
        nextUrl.pathname.startsWith('/orders') ||
        nextUrl.pathname.startsWith('/order-history')

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect to login page
      } else if (isLoggedIn && nextUrl.pathname === '/') {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
  },
  providers: [], // configured in auth.ts
} satisfies NextAuthConfig
