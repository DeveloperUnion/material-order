import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantCode: string }>
}

// (authenticated) route group の共通ガード。
// 1. 未認証 → /[tenantCode] (ログイン画面) に redirect
// 2. session.tenantCode と URL の tenantCode 不一致 → 自分のテナントの同等パスに redirect
//    (誤った URL を踏んでも他テナントの画面が見えないようにする)
// 3. SUPER_ADMIN → /super-admin に redirect
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
    redirect('/super-admin')
  }

  if (user.tenantCode !== tenantCode) {
    redirect(`/${user.tenantCode}/dashboard`)
  }

  return <>{children}</>
}
