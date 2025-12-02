// テナント設定
export {
  type TenantId,
  type TenantConfig,
  tenantConfigs,
  domainToTenant,
  defaultTenantId,
  getTenantIdFromDomain,
  getTenantConfig,
  getSupabaseConfig,
} from './config'

// サーバーサイドユーティリティ
export {
  TENANT_HEADER,
  getCurrentTenantId,
  getCurrentTenantConfig,
  getCurrentPrismaClient,
  getTenantIdFromRequest,
  getPrismaClientFromRequest,
} from './server'

// Prismaクライアント管理
export {
  getPrismaClient,
  disconnectAllPrismaClients,
} from './prisma'
