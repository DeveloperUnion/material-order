import { NextResponse, type NextRequest } from 'next/server'

const SESSION_NAME = 'auth-session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 認証不要なパス
  const publicPaths = ['/', '/api/auth/login', '/api/auth/logout']
  const isPublicPath = publicPaths.includes(pathname)

  // セッションチェック
  const sessionCookie = request.cookies.get(SESSION_NAME)
  let hasValidSession = false

  if (sessionCookie?.value) {
    try {
      const sessionData = JSON.parse(sessionCookie.value)
      hasValidSession = !!sessionData.userId
    } catch {
      // 旧形式や無効なセッションの場合はfalse
      hasValidSession = false
    }
  }

  // 未認証でプライベートページにアクセスした場合
  if (!hasValidSession && !isPublicPath) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みでホームページにアクセスした場合はダッシュボードへリダイレクト
  if (hasValidSession && pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
