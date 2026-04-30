import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/auth'

const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

// callbackUrl は同一オリジンかつ '/' or '/[tenantCode]' のみ許可。
// Auth.js のデフォルト signOut は外部 URL を弾かないので open redirect 防止のため自前で検証する。
function sanitizeCallbackUrl(raw: string | null): string {
  if (!raw || raw === '/') return '/'
  const match = raw.match(/^\/([^/?#]+)(?:[/?#].*)?$/)
  if (match && TENANT_CODE_PATTERN.test(match[1])) return `/${match[1]}`
  return '/'
}

async function handle(request: NextRequest) {
  const callbackUrl = sanitizeCallbackUrl(request.nextUrl.searchParams.get('callbackUrl'))
  // signOut(redirect:false) は cookies() API 経由で Auth.js が発行した全 session cookie
  // (chunked / __Secure- / __Host- prefix 含む) を Max-Age=0 で削除する。
  // 後続の NextResponse がその Set-Cookie を継承する。
  await signOut({ redirect: false })
  const response = NextResponse.redirect(new URL(callbackUrl, request.url))
  // ブラウザ / Vercel CDN が redirect 自体をキャッシュして「コードを直しても症状が消えない」
  // 状況を防ぐ。
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const GET = handle
export const POST = handle
