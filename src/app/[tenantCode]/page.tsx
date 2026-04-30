import { notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { getTenantByCode } from '@/lib/tenant/path'
import { prisma } from '@/lib/tenant/prisma'
import { getTrialStatus } from '@/lib/trial'
import { LoginForm, type MemberUser } from './LoginForm'

interface PageProps {
  params: Promise<{ tenantCode: string }>
}

export default async function TenantLoginPage({ params }: PageProps) {
  const { tenantCode } = await params
  const tenant = await getTenantByCode(tenantCode)
  if (!tenant) notFound()

  const trial = getTrialStatus(tenant.trialEndsAt)

  // トライアル期限切れで自動無効化されたケース。通常の「無効テナント」(isActive=false で trialEndsAt が null)
  // との見分けが付くように、ここでは 404 ではなく専用の終了メッセージを表示する。
  if (!tenant.isActive && trial.kind === 'EXPIRED') {
    return <TrialExpiredScreen tenantName={tenant.name} />
  }
  if (!tenant.isActive) notFound()

  let members: MemberUser[] = []
  if (tenant.authMode === 'NAME') {
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        name: true,
        password: true,
        passwordSetupExpiresAt: true,
      },
      orderBy: { name: 'asc' },
    })
    const now = new Date()
    members = users.map((u) => ({
      id: u.id,
      name: u.name,
      hasPassword: u.password !== null,
      canSetupPassword:
        u.password === null &&
        u.passwordSetupExpiresAt !== null &&
        u.passwordSetupExpiresAt > now,
    }))
  }

  return (
    <LoginForm
      tenantId={tenant.id}
      tenantCode={tenant.code}
      tenantName={tenant.name}
      authMode={tenant.authMode}
      members={members}
    />
  )
}

function TrialExpiredScreen({ tenantName }: { tenantName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          無料トライアル期間が終了しました
        </h1>
        <p className="text-sm text-muted mt-2">「{tenantName}」</p>
        <div className="mt-6 bg-surface border border-border rounded-xl px-5 py-5 text-left space-y-3">
          <p className="text-sm text-foreground">
            無料トライアル期間が終了したため、現在ログインできない状態になっています。
          </p>
          <p className="text-sm text-muted">
            引き続きご利用をご希望の場合は、サービス担当者までご連絡ください。本契約に切り替えることでデータをそのまま継続してお使いいただけます。
          </p>
        </div>
        <p className="mt-6 text-[10px] tracking-[0.18em] text-subtle font-mono uppercase">UNION</p>
      </div>
    </div>
  )
}
