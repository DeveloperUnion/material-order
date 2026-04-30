import { TenantAuthMode } from '@prisma/client'
import { prisma } from '@/lib/tenant/prisma'
import { isReservedTenantCode } from '@/lib/tenant/reserved'

export interface ResolvedTenant {
  id: string
  code: string
  name: string
  authMode: TenantAuthMode
  isActive: boolean
  trialEndsAt: Date | null
}

const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

export function isValidTenantCode(code: string): boolean {
  return CODE_PATTERN.test(code) && !isReservedTenantCode(code)
}

// パスから受け取った tenantCode で Tenant を解決する。
// 予約語 / フォーマット不正 / 存在しない / system テナント は null を返す。
export async function getTenantByCode(code: string): Promise<ResolvedTenant | null> {
  const normalized = code.trim().toLowerCase()
  if (!isValidTenantCode(normalized)) return null

  const tenant = await prisma.tenant.findUnique({
    where: { code: normalized },
    select: {
      id: true,
      code: true,
      name: true,
      authMode: true,
      isActive: true,
      isSystem: true,
      trialEndsAt: true,
    },
  })

  if (!tenant || tenant.isSystem) return null

  return {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
    authMode: tenant.authMode,
    isActive: tenant.isActive,
    trialEndsAt: tenant.trialEndsAt,
  }
}
