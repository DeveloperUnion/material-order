import { PrismaClient } from '@prisma/client'
import { TenantId, getTenantConfig } from './config'

// テナントごとのPrismaクライアントをキャッシュ
const globalForPrisma = globalThis as unknown as {
  prismaClients: Map<TenantId, PrismaClient>
}

if (!globalForPrisma.prismaClients) {
  globalForPrisma.prismaClients = new Map()
}

// テナントのDB URLを環境変数から取得
function getDatabaseUrl(tenantId: TenantId): string {
  const config = getTenantConfig(tenantId)
  const envKey = `${config.envPrefix}_DATABASE_URL`
  const url = process.env[envKey]

  if (!url) {
    // フォールバック: デフォルトのDATABASE_URLを使用
    const fallbackUrl = process.env.DATABASE_URL
    if (!fallbackUrl) {
      throw new Error(`Database URL not found for tenant ${tenantId}. Set ${envKey} or DATABASE_URL`)
    }
    console.warn(`Warning: ${envKey} not set, using default DATABASE_URL for tenant ${tenantId}`)
    return fallbackUrl
  }

  return url
}

// テナント用のPrismaクライアントを取得
export function getPrismaClient(tenantId: TenantId): PrismaClient {
  const existing = globalForPrisma.prismaClients.get(tenantId)
  if (existing) {
    return existing
  }

  const databaseUrl = getDatabaseUrl(tenantId)

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

  globalForPrisma.prismaClients.set(tenantId, client)
  return client
}

// 全テナントのPrismaクライアントを切断（シャットダウン時など）
export async function disconnectAllPrismaClients(): Promise<void> {
  const clients = Array.from(globalForPrisma.prismaClients.values())
  await Promise.all(clients.map(client => client.$disconnect()))
  globalForPrisma.prismaClients.clear()
}
