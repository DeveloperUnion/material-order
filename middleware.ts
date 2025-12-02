import { NextResponse, type NextRequest } from 'next/server'
import { getTenantIdFromDomain, type TenantId } from '@/lib/tenant/config'

const SESSION_NAME = 'auth-session'
const TENANT_HEADER = 'x-tenant-id'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname

  // テナントIDを検出
  const tenantId: TenantId = getTenantIdFromDomain(hostname)

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

  // テナントIDをヘッダーに追加してリクエストを転送
  const response = NextResponse.next()
  response.headers.set(TENANT_HEADER, tenantId)

  // リクエストヘッダーにもテナントIDを追加（Server Componentsで使用）
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(TENANT_HEADER, tenantId)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}