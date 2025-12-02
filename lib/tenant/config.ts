// テナント識別子
export type TenantId = 'auth_client' | 'oken'

// アプリ表示設定
export interface AppConfig {
  icon: string
  title: string
  appTitle: string
}

// テナント設定
export interface TenantConfig {
  id: TenantId
  name: string
  // 環境変数キーのプレフィックス（例: AUTH_CLIENT_DATABASE_URL）
  envPrefix: string
  // アプリ表示設定
  appConfig: AppConfig
}

// テナント設定のマッピング
export const tenantConfigs: Record<TenantId, TenantConfig> = {
  auth_client: {
    id: 'auth_client',
    name: '建設テック',
    envPrefix: 'AUTH_CLIENT',
    appConfig: {
      icon: '/icons/icon.jpeg',
      title: '建設テックパートナー',
      appTitle: '資材発注管理システム',
    },
  },
  oken: {
    id: 'oken',
    name: 'Oken',
    envPrefix: 'OKEN',
    appConfig: {
      icon: '/icons/oken-icon.jpeg',
      title: '株式会社　櫻建',
      appTitle: '櫻建資材発注管理システム',
    },
  },
}

// ドメイン → テナントID のマッピング
export const domainToTenant: Record<string, TenantId> = {
  // auth_client テナント
  'localhost': 'oken',
  'kensetsu-tech.com': 'auth_client',
  'www.kensetsu-tech.com': 'auth_client',

  // oken テナント
  'oken-website-inmp.vercel.app': 'oken',
}

// デフォルトテナント（マッチしない場合）
export const defaultTenantId: TenantId = 'auth_client'

// ドメインからテナントIDを取得
export function getTenantIdFromDomain(hostname: string): TenantId {
  const host = hostname.split(':')[0]
  return domainToTenant[host] ?? defaultTenantId
}

// テナントIDからテナント設定を取得
export function getTenantConfig(tenantId: TenantId): TenantConfig {
  return tenantConfigs[tenantId]
}

// テナントのSupabase設定を取得
export function getSupabaseConfig(tenantId: TenantId): { url: string; anonKey: string } {
  const config = getTenantConfig(tenantId)
  const urlKey = `${config.envPrefix}_SUPABASE_URL`
  const anonKeyKey = `${config.envPrefix}_SUPABASE_ANON_KEY`

  const url = process.env[urlKey] || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env[anonKeyKey] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(`Supabase config not found for tenant ${tenantId}. Set ${urlKey} and ${anonKeyKey}`)
  }

  return { url, anonKey }
}
