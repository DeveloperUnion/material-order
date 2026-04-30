import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'
import { isReservedTenantCode } from '@/lib/tenant/reserved'

// middleware は Edge runtime で動くため、bcrypt を含む auth.ts (heavy) ではなく
// auth.config.ts (light) から NextAuth を初期化する。
const { auth } = NextAuth(authConfig)

const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

// 認証不要 (root レベル) のパス
const PUBLIC_PATHS = [
  '/',
  '/api/auth',
  '/invite',
  '/super-admin-login',
]

// パスベース化以前の旧 URL からの後方互換 redirect 用。
// 既存ブックマークを救済するため、認証済みなら /[tenantCode]/<旧 path> に 308 redirect する。
// 新規パスとぶつからないことを確認した上で随時削除予定 (3 ヶ月程度)。
const LEGACY_TOP_SEGMENTS = new Set([
  'dashboard',
  'material-order',
  'orders',
  'order-history',
  'profile',
  'admin',
])

function isPublicRootPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    ) ||
    // ログイン画面が叩く EMAIL モードの状態判定
    /^\/api\/tenant\/[^/]+\/email-status\/?$/.test(pathname)
  )
}

// /api/auth/force-signout 経由で session を破棄してから callbackUrl に戻す。
// Auth.js の signOut() を route handler 側で呼ぶことで、chunked / __Host-/__Secure-
// prefix を含む全 cookie を確実に削除する (middleware からの手動削除より頑健)。
function forceSignoutRedirect(request: { nextUrl: URL; url: string }, callbackUrl: string) {
  const url = new URL('/api/auth/force-signout', request.url)
  url.searchParams.set('callbackUrl', callbackUrl)
  const response = NextResponse.redirect(url)
  // ブラウザ / CDN が redirect 自体をキャッシュして「コードを直しても症状が消えない」
  // 状況を防ぐ。
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export default auth((request) => {
  const { pathname } = request.nextUrl
  const isLoggedIn = !!request.auth?.user
  const role = request.auth?.user?.role
  const sessionTenantCode = request.auth?.user?.tenantCode

  // パスベース化以前に発行された JWT には tenantCode が入っていない。
  // そのまま動かすと redirect 先が /undefined/dashboard になり 404 ループするので、
  // /api/auth/force-signout 経由で Auth.js のネイティブ cookie 削除を呼び出す。
  // (chunked session cookie や __Host-/__Secure- prefix を含む全 Auth.js cookie を確実に削除)
  if (
    isLoggedIn &&
    role !== 'SUPER_ADMIN' &&
    !sessionTenantCode &&
    !pathname.startsWith('/api/auth')
  ) {
    return forceSignoutRedirect(request, '/')
  }

  // /super-admin* は SUPER_ADMIN 以外から見えないよう 404
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')) {
    if (pathname === '/super-admin-login') {
      return NextResponse.next()
    }
    if (!isLoggedIn || role !== 'SUPER_ADMIN') {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  // 認証済みでルート / にアクセスしたら role に応じて redirect
  if (isLoggedIn && pathname === '/') {
    const dest =
      role === 'SUPER_ADMIN'
        ? '/super-admin'
        : sessionTenantCode
          ? `/${sessionTenantCode}/dashboard`
          : '/'
    if (dest !== '/') {
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // root レベルの public path は素通し
  if (isPublicRootPath(pathname)) {
    return NextResponse.next()
  }

  // /api/* は認証チェックを各 API に任せる(session 経由で tenantId を引いているため)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ここから先はテナントパス /[tenantCode]/...  と仮定して扱う
  const segments = pathname.split('/').filter(Boolean)
  const tenantCode = segments[0]

  // 後方互換: 旧 URL (/dashboard, /orders/..., /admin/...) を踏んだ認証済みユーザーは
  // /[tenantCode]/旧 path に 308 redirect する。未認証なら / (会社コード入力) へ。
  if (tenantCode && LEGACY_TOP_SEGMENTS.has(tenantCode)) {
    if (isLoggedIn && sessionTenantCode) {
      const url = request.nextUrl.clone()
      url.pathname = `/${sessionTenantCode}${pathname}`
      return NextResponse.redirect(url, 308)
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 予約語 / 不正フォーマットは 404
  if (!tenantCode || !TENANT_CODE_PATTERN.test(tenantCode) || isReservedTenantCode(tenantCode)) {
    return new NextResponse(null, { status: 404 })
  }

  const isLoginPage = segments.length === 1 // /[tenantCode] そのもの

  // ログイン画面 (/[tenantCode]) は未認証 OK
  if (isLoginPage) {
    // 既に同じテナントでログイン済みならダッシュボードへ
    if (isLoggedIn && sessionTenantCode === tenantCode) {
      return NextResponse.redirect(new URL(`/${tenantCode}/dashboard`, request.url))
    }
    // SUPER_ADMIN がテナントログイン URL を直打ちした = アカウント切替の意図と解釈し、
    // 自動的に super-admin セッションを破棄してから同じ URL に戻す。
    if (isLoggedIn && role === 'SUPER_ADMIN') {
      return forceSignoutRedirect(request, `/${tenantCode}`)
    }
    return NextResponse.next()
  }

  // 認証必須エリア
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL(`/${tenantCode}`, request.url))
  }

  // SUPER_ADMIN が /[tenantCode]/{authenticated} を直打ちしたらテナントログインに送る。
  // (上の isLoginPage 分岐でさらに force-signout される)
  if (role === 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(`/${tenantCode}`, request.url))
  }

  // session.tenantCode と URL の tenantCode が一致しない時は自分のテナントに redirect
  if (sessionTenantCode && sessionTenantCode !== tenantCode) {
    return NextResponse.redirect(new URL(`/${sessionTenantCode}/dashboard`, request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // _next/* と public/ 配下の静的ファイル (画像・PWA 系含む) は middleware を素通り。
    '/((?!_next/|favicon.ico|sw\\.js|offline\\.html|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|html|json|webmanifest|xml|txt|woff|woff2|ttf|otf)$).*)',
  ],
}
