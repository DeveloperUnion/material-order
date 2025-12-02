import { headers } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { TenantId, TenantConfig, getTenantIdFromDomain, getTenantConfig } from './config'
import { getPrismaClient } from './prisma'

// ヘッダー名定数
export const TENANT_HEADER = 'x-tenant-id'

// サーバーサイドで現在のテナントIDを取得
export async function getCurrentTenantId(): Promise<TenantId> {
  const headersList = await headers()

  // ミドルウェアで設定されたテナントIDを優先
  const tenantIdFromHeader = headersList.get(TENANT_HEADER) as TenantId | null
  if (tenantIdFromHeader) {
    return tenantIdFromHeader
  }

  // フォールバック: ホストヘッダーから取得
  const host = headersList.get('host') ?? ''
  return getTenantIdFromDomain(host)
}

// サーバーサイドで現在のテナント設定を取得
export async function getCurrentTenantConfig(): Promise<TenantConfig> {
  const tenantId = await getCurrentTenantId()
  return getTenantConfig(tenantId)
}

// サーバーサイドで現在のテナント用Prismaクライアントを取得
export async function getCurrentPrismaClient(): Promise<PrismaClient> {
  const tenantId = await getCurrentTenantId()
  return getPrismaClient(tenantId)
}

// API Route用: リクエストからテナントIDを取得
export function getTenantIdFromRequest(request: Request): TenantId {
  // ヘッダーからテナントIDを取得
  const tenantIdFromHeader = request.headers.get(TENANT_HEADER) as TenantId | null
  if (tenantIdFromHeader) {
    return tenantIdFromHeader
  }

  // URLからホストを取得
  const url = new URL(request.url)
  return getTenantIdFromDomain(url.hostname)
}

// API Route用: リクエストからPrismaクライアントを取得
export function getPrismaClientFromRequest(request: Request): PrismaClient {
  const tenantId = getTenantIdFromRequest(request)
  return getPrismaClient(tenantId)
}
