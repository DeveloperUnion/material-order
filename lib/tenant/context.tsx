'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { AppConfig, getAppConfig } from './config'

// テナントコンテキストの型
interface TenantContextType {
  config: AppConfig
  tenantName: string | null
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
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { data: session } = useSession()

  // セッションからテナント名を取得（ログイン前はnull）
  const tenantName = session?.user?.tenantName ?? null
  const config = getAppConfig(tenantName ?? undefined)

  const value: TenantContextType = {
    config,
    tenantName,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
