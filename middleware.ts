import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export default auth((request) => {
  const { pathname } = request.nextUrl

  // 認証不要なパス
  const publicPaths = ['/', '/api/auth', '/invite', '/super-admin-login', '/api/tenant/lookup']
  const isPublicPath =
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    ) ||
    // ログイン画面が叩く NAME モードのメンバー一覧 API
    /^\/api\/tenant\/[^/]+\/users\/?$/.test(pathname)

  // 認証状態を取得
  const isLoggedIn = !!request.auth?.user
  const role = request.auth?.user?.role

  // /super-admin/* は SUPER_ADMIN 以外から見えないよう 404
  // ("存在を隠す" 方針 — 未認証 or 非 SUPER_ADMIN は全て同じ応答)
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')) {
    if (!isLoggedIn || role !== 'SUPER_ADMIN') {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  // 未認証でプライベートページにアクセスした場合
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みでホームページにアクセスした場合は role に応じてリダイレクト
  if (isLoggedIn && pathname === '/') {
    const nextUrl = new URL(role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard', request.url)
    return NextResponse.redirect(nextUrl)
  }

  // SUPER_ADMIN は通常のテナント画面には来ない想定 — /dashboard 等にアクセスしたら /super-admin へ
  if (isLoggedIn && role === 'SUPER_ADMIN' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/super-admin', request.url))
  }

  return NextResponse.next()
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
