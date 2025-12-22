import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getTenantIdFromDomain, type TenantId } from '@/lib/tenant/config'

const TENANT_HEADER = 'x-tenant-id'

export default auth((request) => {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname

  // テナントIDを検出
  const tenantId: TenantId = getTenantIdFromDomain(hostname)

  // 認証不要なパス
  const publicPaths = ['/', '/api/auth']
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // 認証状態を取得
  const isLoggedIn = !!request.auth?.user

  // 未認証でプライベートページにアクセスした場合
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みでホームページにアクセスした場合はダッシュボードへリダイレクト
  if (isLoggedIn && pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // リクエストヘッダーにテナントIDを追加（Server Componentsで使用）
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(TENANT_HEADER, tenantId)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})

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