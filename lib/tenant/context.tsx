'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { TenantId, TenantConfig, tenantConfigs, getTenantIdFromDomain, getTenantConfig } from './config'

// テナントコンテキストの型
interface TenantContextType {
  tenantId: TenantId
  config: TenantConfig
}

const TenantContext = createContext<TenantContextType | null>(null)

// テナント情報を使用するフック
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

interface TenantProviderProps {
  children: ReactNode
  // サーバーから渡されたテナントID（オプション）
  initialTenantId?: TenantId
}

export function TenantProvider({ children, initialTenantId }: TenantProviderProps) {
  // テナントIDを決定
  const tenantId = initialTenantId ?? (typeof window !== 'undefined'
    ? getTenantIdFromDomain(window.location.hostname)
    : 'auth_client')

  const config = getTenantConfig(tenantId)

  // ドキュメントタイトルを設定
  useEffect(() => {
    document.title = config.appConfig.appTitle
  }, [config.appConfig.appTitle])

  const value: TenantContextType = {
    tenantId,
    config,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

// サーバーサイドでテナント設定を取得するユーティリティ（エクスポート）
export { tenantConfigs, getTenantIdFromDomain, getTenantConfig }
export type { TenantId, TenantConfig }
