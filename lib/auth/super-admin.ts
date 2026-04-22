import { auth } from '@/auth'

/**
 * SUPER_ADMIN 用セッション取得ヘルパー。
 * ページ・API ルートの先頭で呼び、未認証 or 非 SUPER_ADMIN なら null を返す。
 *
 * 使用例 (page):
 *   const session = await getSuperAdminSession()
 *   if (!session) notFound()
 *
 * 使用例 (API):
 *   const session = await getSuperAdminSession()
 *   if (!session) return new NextResponse(null, { status: 404 })
 */
export async function getSuperAdminSession() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') return null
  return session
}
