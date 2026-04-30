import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantCode: string }>
}

// (authenticated) route group の共通ガード。
// 1. 未認証 → /[tenantCode] (ログイン画面) に redirect
// 2. session.tenantCode と URL の tenantCode 不一致 → 自分のテナントの同等パスに redirect
//    (誤った URL を踏んでも他テナントの画面が見えないようにする)
// 3. SUPER_ADMIN は middleware が /[tenantCode] (ログイン画面) にバウンスするため、
//    この layout には到達しないはず。万一到達したら設計ミスとして 404 を返す。
export default async function AuthenticatedLayout({
  children,
  params,
}: AuthenticatedLayoutProps) {
  const { tenantCode } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/${tenantCode}`)
  }

  if (user.role === 'SUPER_ADMIN') {
    notFound()
  }

  if (user.tenantCode !== tenantCode) {
    redirect(`/${user.tenantCode}/dashboard`)
  }

  return <>{children}</>
}
