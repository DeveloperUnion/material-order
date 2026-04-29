import { notFound } from 'next/navigation'
import { getTenantByCode } from '@/lib/tenant/path'

interface TenantLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantCode: string }>
}

// /[tenantCode]/* 全体のテナント検証エントリポイント。
// 存在しない / 非アクティブ / 予約語 はここで 404。
// 認証要件は配下の (authenticated)/layout.tsx で課す。
export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantCode } = await params
  const tenant = await getTenantByCode(tenantCode)

  if (!tenant || !tenant.isActive) {
    notFound()
  }

  return <>{children}</>
}
