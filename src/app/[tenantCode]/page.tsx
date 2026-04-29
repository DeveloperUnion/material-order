import { notFound } from 'next/navigation'
import { getTenantByCode } from '@/lib/tenant/path'
import { prisma } from '@/lib/tenant/prisma'
import { LoginForm, type MemberUser } from './LoginForm'

interface PageProps {
  params: Promise<{ tenantCode: string }>
}

export default async function TenantLoginPage({ params }: PageProps) {
  const { tenantCode } = await params
  const tenant = await getTenantByCode(tenantCode)
  if (!tenant || !tenant.isActive) notFound()

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
